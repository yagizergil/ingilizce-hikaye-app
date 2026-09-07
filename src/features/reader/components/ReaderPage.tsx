import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { lemmatize, splitSentences, tokenize } from "@/features/reader/text/tokenizer";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

import type { ReactElement, ReactNode } from "react";
import type { Page } from "@/features/reader/pagination/types";
import type { ReaderChapter } from "@/features/reader/types";
import type { ReaderWordTapPayload } from "@/features/reader/types";
import type { TypeStyle } from "@/theme";
import type { Sentence, Token } from "@/features/reader/text/tokenizer";

/**
 * Long-press-vs-tap composition on nested native `<Text>` (mirrors
 * pagerRuntime.js's DOM `.w`-inside-`.s` nesting, replicated for RN):
 *
 * React Native claims a touch's responder at TOUCH-START, walking down to
 * the deepest native view under the finger that is instrumented as
 * pressable (i.e. has at least one of onPress/onLongPress/onPressIn/
 * onPressOut). Once claimed, that single node handles the whole gesture --
 * there is no bubbling of a later long-press timeout up to an ancestor
 * `<Text>`, even if the ancestor also defines `onLongPress`. Concretely
 * that means: if a word's `<Text>` only implemented `onPress`, a long hold
 * that started on that word would just fire `onPress` on release (no
 * separate long-press path exists for a component that never registered
 * one) -- it would NOT fall through to the sentence-level long-press
 * handler the way a real DOM touch bubbles to `nearestAncestor(el, "s")`.
 *
 * So each WORD token's `<Text>` here registers BOTH `onPress` and
 * `onLongPress`. RN's `<Text>` does not expose a `delayLongPress` prop
 * (unlike `Pressable`) -- its built-in long-press detection is hardcoded to
 * `Pressability`'s own default delay, which is 500ms, i.e. it already
 * matches pagerRuntime.js's `LONG_PRESS_MS = 500` with no extra
 * configuration needed. `onLongPress` reports the SAME sentence context a
 * hold anywhere else in the sentence would. RN's `Pressability`
 * (which backs `Text`'s built-in press handling) already guarantees a
 * successful long-press suppresses the subsequent `onPress` on release --
 * they never both fire for one gesture -- so no extra de-duplication state
 * is needed here.
 *
 * Non-word ("other": whitespace/punctuation) runs are rendered as plain
 * `<Text>` children with NO press handlers of their own, so they are never
 * responder-eligible and a touch landing on them falls through to the
 * enclosing SENTENCE-level `<Text>`, which is the one that actually
 * registers `onLongPress` for that fallthrough case (holding on the space
 * between two words, or on a comma). This exactly reproduces
 * pagerRuntime.js's behavior, where `nearestAncestor(target, "s")` finds
 * the whole sentence span regardless of whether the finger landed on a
 * `.w` span or bare text between spans.
 */

interface RenderedParagraph {
  paragraphId: string;
  key: string;
  node: ReactNode;
}

/** Finds the sentence containing character offset `charOffset`, or `null`
 * if `sentences` is empty (a paragraph slice with no sentence-terminating
 * punctuation at all still tokenizes into words with no `Sentence` entry --
 * pagerRuntime.js has the same edge case, guarded there via `sentences.length
 * ? ... : null`). */
function findSentenceForOffset(sentences: Sentence[], charOffset: number, cursorRef: { index: number }): Sentence | null {
  if (sentences.length === 0) return null;
  while (
    cursorRef.index < sentences.length - 1 &&
    charOffset >= (sentences[cursorRef.index] as Sentence).end
  ) {
    cursorRef.index++;
  }
  return sentences[cursorRef.index] ?? null;
}

export interface ReaderPageProps {
  page: Page;
  paragraphs: ReaderChapter["paragraphs"];
  textStyle: TypeStyle;
  savedLemmas: Set<string>;
  onWordTap: (payload: ReaderWordTapPayload) => void;
  onSentenceLongPress: (payload: { sentenceText: string; paragraphId: string }) => void;
}

/**
 * a11y judgment call: a full ~300-word page would mean ~300 individually
 * `accessible`/labeled elements if every word `<Text>` were exposed to the
 * screen-reader tree -- that is not a usable reading experience for
 * VoiceOver/TalkBack (swiping word-by-word through a page of prose), it is
 * noise. Instead each PARAGRAPH is exposed as one accessible text block
 * (`accessible` + `accessibilityLabel` set to the paragraph's plain text)
 * on the outer paragraph `<Text>`, and every word/sentence-level `<Text>`
 * inside it is marked `accessibilityElementsHidden`/`importantForAccessibility:
 * "no-hide-descendants"` so the screen reader announces the paragraph as
 * continuous prose instead of walking each word span. Sighted-tap word
 * lookup and long-press sentence lookup remain fully available via touch;
 * they are just not separately exposed to the accessibility tree, which
 * mirrors how the WebView reading path behaved (no per-word ARIA either --
 * pagerRuntime.js's spans carry no accessibility semantics).
 */
export function ReaderPage({
  page,
  paragraphs,
  textStyle,
  savedLemmas,
  onWordTap,
  onSentenceLongPress,
}: ReaderPageProps): ReactElement {
  const readerColors = useReaderThemeColors();

  const paragraphById = useMemo(() => {
    const map = new Map<string, ReaderChapter["paragraphs"][number]>();
    for (const paragraph of paragraphs) {
      map.set(paragraph.id, paragraph);
    }
    return map;
  }, [paragraphs]);

  const renderedParagraphs = useMemo<RenderedParagraph[]>(() => {
    return page.segments.map((segment) => {
      const paragraph = paragraphById.get(segment.paragraphId);
      const key = `${segment.paragraphId}-${segment.charStart}-${segment.charEnd}`;

      if (!paragraph) {
        // Defensive fallback: a segment referencing a paragraph id that no
        // longer exists in `paragraphs` (should not happen in practice --
        // Page/paragraphs both derive from the same ReaderChapter -- but
        // rendering nothing beats crashing the whole page).
        return { paragraphId: segment.paragraphId, key, node: null };
      }

      const sliceText = paragraph.text.slice(segment.charStart, segment.charEnd);
      const tokens = tokenize(sliceText);
      const sentences = splitSentences(sliceText);
      const cursor = { index: 0 };

      const children: ReactNode[] = [];
      let currentSentenceStart: number | null = null;
      let currentSentenceTokens: ReactNode[] = [];
      let currentSentenceText = "";

      const flushSentence = (): void => {
        if (currentSentenceStart === null) return;
        const sentenceText = currentSentenceText;
        children.push(
          <Text
            key={`s-${currentSentenceStart}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLongPress={() => onSentenceLongPress({ sentenceText, paragraphId: paragraph.id })}
          >
            {currentSentenceTokens}
          </Text>,
        );
        currentSentenceStart = null;
        currentSentenceTokens = [];
        currentSentenceText = "";
      };

      tokens.forEach((token: Token, tokenIndex: number) => {
        const sentence = findSentenceForOffset(sentences, token.start, cursor);
        const sentenceStart = sentence ? sentence.start : -1;

        if (sentenceStart !== currentSentenceStart) {
          flushSentence();
          currentSentenceStart = sentenceStart;
          currentSentenceText = sentence ? sentence.text : "";
        }

        if (token.type === "word") {
          const surface = token.text.toLowerCase();
          const lemma = lemmatize(token.text);
          const wordSentenceText = currentSentenceText;
          // Offset of this word WITHIN the sentence text, so the tap
          // consumer (WordSheet) can emphasize the exact occurrence tapped
          // instead of re-searching sentenceText for the first substring
          // match of `surface` (see ReaderWordTapPayload's doc comment).
          const wordSentenceCharOffset = sentence ? token.start - sentence.start : undefined;

          // Saved words get a subtle underline so a reader can see at a
          // glance which words they've already added to their vocabulary
          // list, without opening the sheet — this is the ONLY visual
          // decoration on word text (per explicit product owner request:
          // "highlight olmayacak sadece altı çizili"). There is no
          // "unknown word" background tint at all, not even opt-in.
          const isSaved = savedLemmas.has(lemma);

          currentSentenceTokens.push(
            <Text
              key={`w-${token.start}-${tokenIndex}`}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                isSaved
                  ? { textDecorationLine: "underline" as const, textDecorationColor: readerColors.savedUnderline }
                  : null,
              ]}
              onPress={() =>
                onWordTap({
                  surface,
                  lemma,
                  paragraphId: paragraph.id,
                  sentenceText: wordSentenceText,
                  sentenceCharOffset: wordSentenceCharOffset,
                  tapMs: Date.now(),
                })
              }
              onLongPress={() =>
                onSentenceLongPress({ sentenceText: wordSentenceText, paragraphId: paragraph.id })
              }
            >
              {token.text}
            </Text>,
          );
        } else {
          currentSentenceTokens.push(
            <Text key={`o-${token.start}-${tokenIndex}`}>{token.text}</Text>,
          );
        }
      });

      flushSentence();

      return {
        paragraphId: paragraph.id,
        key,
        node: (
          <Text
            key={key}
            accessible
            accessibilityLabel={sliceText}
            style={[
              styles.paragraphBase,
              resolveDynamicTextStyle(textStyle),
              { color: readerColors.text },
            ]}
          >
            {children}
          </Text>
        ),
      };
    });
  }, [
    page,
    paragraphById,
    textStyle,
    savedLemmas,
    onWordTap,
    onSentenceLongPress,
    readerColors,
  ]);

  return <Text style={styles.pageContainer}>{renderedParagraphs.map((rendered) => rendered.node)}</Text>;
}

/** `TypeStyle`'s exact fields RN's `<Text style>` accepts directly; kept as
 * its own function so the JSX above doesn't need an inline object literal
 * (which would fail the "no inline style" convention were this a `View`,
 * and reads clearer named regardless). */
function resolveDynamicTextStyle(textStyle: TypeStyle): {
  fontFamily: string | undefined;
  fontSize: number;
  lineHeight: number;
  fontWeight: TypeStyle["fontWeight"];
  letterSpacing: number;
  fontStyle: TypeStyle["fontStyle"];
} {
  return {
    fontFamily: textStyle.fontFamily,
    fontSize: textStyle.fontSize,
    lineHeight: textStyle.lineHeight,
    fontWeight: textStyle.fontWeight,
    letterSpacing: textStyle.letterSpacing,
    fontStyle: textStyle.fontStyle ?? "normal",
  };
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  paragraphBase: {},
});
