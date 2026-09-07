import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { MeasuredLine, MeasuredParagraph } from "@/features/reader/pagination/types";
import type { ReaderParagraph } from "@/features/reader/types";
import type { ReactElement, ReactNode } from "react";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";

/**
 * The subset of `getReadingTypeScale(...).paragraph` (a `TypeStyle`) that
 * actually affects line-wrap/height and therefore must be threaded into the
 * off-screen measurement `<Text>` exactly as it will be used on the real
 * reading surface.
 */
export interface MeasurementTextStyle {
  fontFamily: string | undefined;
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600";
  letterSpacing: number;
  fontStyle?: "normal" | "italic";
}

export interface MeasurementRequest {
  /** Stable key identifying this request; changing it (e.g. new chapter id,
   * settings change, or width change) triggers a fresh measurement pass. */
  requestKey: string;
  paragraphs: ReaderParagraph[];
  textStyle: MeasurementTextStyle;
  /** Content width the real reading surface will constrain text to (i.e.
   * already excludes horizontal margins/padding). */
  width: number;
}

interface UseChapterMeasurementResult {
  /** `null` while measuring, or when there is no request. */
  paragraphs: MeasuredParagraph[] | null;
  isMeasuring: boolean;
  /**
   * The invisible measurement tree for the in-flight request, or `null`
   * when there is nothing to measure. React Native has no headless/portal
   * render API (unlike web's `ReactDOM.createPortal` into a detached
   * node), so an off-screen tree must still be part of the live component
   * tree to receive `onTextLayout` callbacks. The caller must render this
   * node anywhere in the tree it controls (its own absolute positioning
   * pushes it fully off-screen, so placement doesn't affect visible
   * layout) -- typically right inside the component that calls this hook:
   *
   * ```tsx
   * const { paragraphs, isMeasuring, measurementNode } = useChapterMeasurement(request);
   * return <View>{measurementNode}...</View>;
   * ```
   */
  measurementNode: ReactNode;
}

/**
 * Converts RN's `onTextLayout` lines (which report rendered `text` but not
 * a character offset into the source string) into `MeasuredLine`s carrying
 * `charStart`/`charEnd` offsets into `paragraphText`.
 *
 * KNOWN PRECISION RISK (documented per plan): RN's line-wrap algorithm can
 * trim or normalize whitespace at line boundaries (e.g. a line break at a
 * space consumes that space rather than including it in either line's
 * `text`), so line texts do not necessarily concatenate byte-for-byte back
 * into the original paragraph string. Exact substring matching against a
 * running cursor would therefore be fragile. Instead we resiliently search
 * for each line's *trimmed* text starting at the current cursor position,
 * and advance the cursor past the match plus any immediately-following
 * whitespace (the collapsed separator). If a line's trimmed text cannot be
 * found from the cursor (should not normally happen, but native text
 * layout is not a byte-exact contract), we fall back to treating the line
 * as spanning exactly its own reported text length starting at the cursor
 * -- this keeps pagination from crashing, at the cost of a potentially
 * slightly-off char offset for that one line. This is exactly the kind of
 * imprecision flagged as a risk to validate on-device in a later phase, not
 * something assumed perfect here.
 */
function linesToMeasuredLines(
  paragraphText: string,
  layoutLines: readonly { text: string; height: number }[]
): MeasuredLine[] {
  const result: MeasuredLine[] = [];
  let cursor = 0;

  for (const layoutLine of layoutLines) {
    const trimmed = layoutLine.text.trim();
    let charStart: number;
    let charEnd: number;

    if (trimmed.length === 0) {
      // A blank rendered line (e.g. from a manual double newline). Treat it
      // as a zero-width line at the current cursor position.
      charStart = cursor;
      charEnd = cursor;
    } else {
      const foundAt = paragraphText.indexOf(trimmed, cursor);
      if (foundAt === -1) {
        // Resilient fallback: could not locate this line's text from the
        // cursor (whitespace normalization or an unexpected mismatch).
        // Advance by the line's own length so pagination still terminates
        // with a usable (if imprecise) offset, rather than throwing.
        charStart = cursor;
        charEnd = Math.min(paragraphText.length, cursor + layoutLine.text.length);
      } else {
        charStart = foundAt;
        charEnd = foundAt + trimmed.length;
      }
    }

    result.push({
      text: layoutLine.text,
      charStart,
      charEnd,
      height: layoutLine.height,
    });

    // Advance past the match plus any run of whitespace immediately
    // following it (the separator collapsed by line-wrapping).
    cursor = charEnd;
    while (cursor < paragraphText.length && /\s/.test(paragraphText[cursor] as string)) {
      cursor++;
    }
  }

  return result;
}

interface MeasurementTreeProps {
  requestKey: string;
  paragraphs: ReaderParagraph[];
  textStyle: MeasurementTextStyle;
  width: number;
  onComplete: (requestKey: string, result: MeasuredParagraph[]) => void;
}

/**
 * Renders one off-screen `<Text>` per paragraph, all simultaneously (the
 * whole chapter's pagination depends on the full flow, so partial/
 * incremental measurement doesn't work), and resolves once every paragraph
 * has reported an `onTextLayout` event.
 *
 * Off-screen technique: `position: 'absolute'`, placed far outside the
 * viewport (`left: -9999`, matching `top`) rather than relying on
 * `opacity: 0` alone -- an opacity:0 element still participates in
 * hit-testing/layout at its normal position, which risks an interactive or
 * visual flash; pushing off-screen avoids that entirely. `pointerEvents:
 * 'none'` additionally guarantees no touch interaction. These offset
 * numbers are a structural "hide it" technique, not a design/spacing
 * token, so they are intentionally not sourced from `src/theme` (the same
 * reasoning `tokens/layout.ts` documents for its own non-design structural
 * constants, e.g. `tabBarIconSize`/`tabBarContentHeight`).
 */
function MeasurementTree({
  requestKey,
  paragraphs,
  textStyle,
  width,
  onComplete,
}: MeasurementTreeProps): ReactElement {
  const resultsRef = useRef<Map<string, MeasuredParagraph>>(new Map());
  const resolvedRef = useRef(false);

  // A fresh MeasurementTree instance is mounted (via `key={requestKey}` in
  // the parent) whenever the request changes, so per-request state starts
  // clean without needing an explicit reset effect.

  const handleLayout = (
    paragraph: ReaderParagraph,
    event: NativeSyntheticEvent<TextLayoutEventData>
  ): void => {
    if (resolvedRef.current) return;

    const layoutLines = event.nativeEvent.lines.map((l) => ({ text: l.text, height: l.height }));
    const lines = linesToMeasuredLines(paragraph.text, layoutLines);

    resultsRef.current.set(paragraph.id, {
      paragraphId: paragraph.id,
      paragraphIndex: paragraph.paragraphIndex,
      lines,
    });

    if (resultsRef.current.size === paragraphs.length) {
      resolvedRef.current = true;
      const ordered = paragraphs.map(
        (p) =>
          resultsRef.current.get(p.id) ?? {
            paragraphId: p.id,
            paragraphIndex: p.paragraphIndex,
            lines: [],
          }
      );
      onComplete(requestKey, ordered);
    }
  };

  useEffect(() => {
    if (paragraphs.length === 0) {
      // Nothing to measure -- resolve immediately rather than waiting for
      // layout events that will never fire.
      onComplete(requestKey, []);
    }
    // Only run once per mount (i.e. once per requestKey, since this
    // component remounts via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paragraphs.length === 0) {
    return <View pointerEvents="none" />;
  }

  return (
    <View style={styles.offscreenContainer} pointerEvents="none">
      {paragraphs.map((paragraph) => (
        <Text
          key={paragraph.id}
          style={[
            styles.measurementText,
            {
              width,
              fontFamily: textStyle.fontFamily,
              fontSize: textStyle.fontSize,
              lineHeight: textStyle.lineHeight,
              fontWeight: textStyle.fontWeight,
              letterSpacing: textStyle.letterSpacing,
              fontStyle: textStyle.fontStyle ?? "normal",
            },
          ]}
          onTextLayout={(event) => handleLayout(paragraph, event)}
        >
          {paragraph.text}
        </Text>
      ))}
    </View>
  );
}

/**
 * Measures a chapter's paragraphs against real native text layout by
 * mounting an invisible `<Text>` per paragraph and reading `onTextLayout`.
 * See `measurementNode` above for why the caller must render the returned
 * node somewhere in its own tree.
 *
 * Font-loading: this repo gates the entire app behind `useFonts()` in
 * `app/_layout.tsx` (confirmed by reading that file) -- no screen, and
 * therefore no reader component that could call this hook, mounts until
 * `fontsLoaded` is true. That fully covers the font-race concern that
 * motivated the WebView-era bug this hook is explicitly designed to avoid;
 * `measureChapter` does not need a separate font-readiness gate of its own.
 *
 * Performance note (unverified on-device): mounting ~50-70 off-screen
 * `<Text>` nodes in one pass for an ~8000-word chapter has not been
 * profiled on a real device by this change. The implementation avoids
 * doing anything redundant (single mount, single pass, no re-render loop,
 * no re-measuring of paragraphs that haven't changed since a new
 * `requestKey` always means the whole input changed), but whether this is
 * fast enough to avoid a visible frame drop needs on-device verification
 * in a later phase.
 */
export function useChapterMeasurement(
  request: MeasurementRequest | null
): UseChapterMeasurementResult {
  const [resolved, setResolved] = useState<{ key: string; paragraphs: MeasuredParagraph[] } | null>(
    null
  );

  const handleComplete = (requestKey: string, paragraphs: MeasuredParagraph[]): void => {
    setResolved({ key: requestKey, paragraphs });
  };

  const isMatch = request !== null && resolved !== null && resolved.key === request.requestKey;
  const isMeasuring = request !== null && !isMatch;

  const measurementNode = useMemo<ReactNode>(() => {
    if (!request || isMatch) return null;
    return (
      <MeasurementTree
        key={request.requestKey}
        requestKey={request.requestKey}
        paragraphs={request.paragraphs}
        textStyle={request.textStyle}
        width={request.width}
        onComplete={handleComplete}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.requestKey, isMatch]);

  return {
    paragraphs: isMatch ? resolved.paragraphs : null,
    isMeasuring,
    measurementNode,
  };
}

const styles = StyleSheet.create({
  offscreenContainer: {
    position: "absolute",
    left: -9999,
    top: -9999,
  },
  measurementText: {
    position: "absolute",
  },
});
