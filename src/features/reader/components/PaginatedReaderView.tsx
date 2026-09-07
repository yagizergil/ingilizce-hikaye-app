import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { getReadingTypeScale } from "@/theme";
import { getPagePadding, useChapterPagination } from "@/features/reader/hooks/useChapterPagination";
import { ReaderPage } from "@/features/reader/components/ReaderPage";

import type { ReactElement } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { Page } from "@/features/reader/pagination/types";
import type { ReaderChapter, ReaderSettings } from "@/features/reader/types";
import type { ReaderWordTapPayload } from "@/features/reader/types";

/**
 * PROP-SHAPE DECISION: mirrors how `ReaderScreen.tsx` splits responsibility
 * with `ReaderWebView.tsx` today (deliberately NOT re-architected here,
 * per the task's "do not modify ReaderScreen.tsx" constraint -- this is
 * shape-mirroring only, this component is not wired into ReaderScreen in
 * this change).
 *
 * `ReaderWebView` does NOT receive pre-paginated content -- it receives
 * `chapter` + `settings` + lemma sets + callbacks, and builds its own HTML
 * (i.e. does its own "layout") internally via `buildReaderHtml` inside a
 * `useMemo`. `ReaderScreen` owns data-fetching (chapter query, lemma
 * dictionary, saved words), position persistence (`useReaderPosition`), and
 * screen-level UI state (chrome visibility, page/progress display,
 * chapter-complete overlay) -- it never touches WebView-internal concerns
 * like DOM construction or touch-zone math.
 *
 * `PaginatedReaderView` follows the exact same split: it receives `chapter`
 * + `settings` + lemma sets + callbacks (the same inputs `ReaderWebView`
 * takes, replacing the WebView-specific `pageTransitionMs`-only settings
 * slice with the couple of extra fields native pagination needs) and calls
 * `useChapterPagination` ITSELF internally, exactly like `ReaderWebView`
 * calls `buildReaderHtml` itself -- the caller (a future ReaderScreen
 * integration) never sees `Page[]` or pagination internals, same as it
 * never sees WebView HTML today.
 */
export interface PaginatedReaderViewSettings {
  fontScale: ReaderSettings["fontScale"];
  lineHeightScale: ReaderSettings["lineHeightScale"];
  fontFamily: ReaderSettings["fontFamily"];
  marginScale: ReaderSettings["marginScale"];
}

export interface PaginatedReaderRestorePosition {
  paragraphId: string;
  charOffset: number;
}

export interface PaginatedPageChangePayload {
  page: number;
  totalPages: number;
}

export interface PaginatedPositionUpdatePayload {
  paragraphId: string;
  charOffset: number;
  percent: number;
}

export interface PaginatedPagesReadyPayload {
  totalPages: number;
}

interface PaginatedReaderViewProps {
  chapter: ReaderChapter;
  settings: PaginatedReaderViewSettings;
  savedLemmas: Set<string>;
  highlightsEnabled: boolean;
  restorePosition: PaginatedReaderRestorePosition | null;
  onWordTap: (payload: ReaderWordTapPayload) => void;
  onSentenceLongPress: (payload: { sentenceText: string; paragraphId: string }) => void;
  onPageChange: (payload: PaginatedPageChangePayload) => void;
  onPositionUpdate: (payload: PaginatedPositionUpdatePayload) => void;
  onChapterEnd: () => void;
  /** Fires whenever a fresh, renderable `pages` array becomes available --
   * both the very first pagination pass for a chapter (cache hit or a
   * completed measurement) AND every subsequent repagination triggered by a
   * settings change (font/line-height/family/margin). The caller
   * (`ReaderScreen`) is the one that knows whether a given call is "first
   * paint" or "reflow after settings change" (it owns that timing context),
   * so this callback just reports the raw "pages are ready" transition --
   * mirroring how `useChapterPagination`'s `isPaginating: true -> false`
   * edge is the signal, without leaking `Page[]` internals to the caller. */
  onPagesReady?: (payload: PaginatedPagesReadyPayload) => void;
}

/**
 * Pure helper: which page (index into `pages`) contains the given
 * paragraph/charOffset position, or `null` if it can't be found (empty
 * `pages`, or a paragraphId that isn't present -- e.g. a stale saved
 * position from before a repagination). Picks the segment whose
 * [charStart, charEnd) range contains `charOffset`, falling back to the
 * FIRST segment for that paragraphId if no segment's range contains the
 * exact offset (a paragraph's char ranges are contiguous and gapless per
 * `paginate.ts`, so this only matters for an out-of-range/stale offset).
 */
export function findPageForPosition(
  pages: Page[],
  paragraphId: string,
  charOffset: number,
): number | null {
  let firstMatchIndex: number | null = null;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    if (!page) continue;
    for (const segment of page.segments) {
      if (segment.paragraphId !== paragraphId) continue;
      if (firstMatchIndex === null) firstMatchIndex = pageIndex;
      if (charOffset >= segment.charStart && charOffset < segment.charEnd) {
        return pageIndex;
      }
    }
  }

  return firstMatchIndex;
}

/** Horizontal/vertical page dimensions, measured via `onLayout` (NOT
 * `useWindowDimensions`): `useChapterPagination`'s `PageDimensions` doc
 * comment is explicit that it wants the actual measured size of the page
 * CONTAINER, since "chrome above/below the reading surface, safe-area
 * insets, etc. are the caller's concern" -- the window's full size would
 * be wrong the moment a header/chrome bar is visible above this view (the
 * same reason `ReaderScreen.tsx` conditionally renders `ReaderHeader`
 * above the WebView wrapper rather than overlaying it). `onLayout` reports
 * this component's own allotted box after that chrome has already taken
 * its space in the parent flex layout, which is exactly the number
 * pagination needs. */
function usePageContainerLayout(): {
  width: number;
  height: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  return { width: size.width, height: size.height, onLayout };
}

export function PaginatedReaderView({
  chapter,
  settings,
  savedLemmas,
  highlightsEnabled,
  restorePosition,
  onWordTap,
  onSentenceLongPress,
  onPageChange,
  onPositionUpdate,
  onChapterEnd,
  onPagesReady,
}: PaginatedReaderViewProps): ReactElement {
  const { width, height, onLayout } = usePageContainerLayout();

  const readerSettings: ReaderSettings = useMemo(
    () => ({
      fontScale: settings.fontScale,
      lineHeightScale: settings.lineHeightScale,
      fontFamily: settings.fontFamily,
      marginScale: settings.marginScale,
      // Not used by useChapterPagination (WebView-only fields kept for
      // ReaderSettings shape compatibility); values are irrelevant here.
      pageTransitionMs: 0,
      highlightsEnabled,
    }),
    [settings.fontScale, settings.lineHeightScale, settings.fontFamily, settings.marginScale, highlightsEnabled],
  );

  const { pages, isPaginating, measurementNode } = useChapterPagination(chapter, readerSettings, {
    width,
    height,
  });

  const { paragraph: textStyle } = useMemo(
    () => getReadingTypeScale(settings.fontScale, settings.lineHeightScale, settings.fontFamily),
    [settings.fontScale, settings.lineHeightScale, settings.fontFamily],
  );

  useEffect(() => {
    if (!pages) return;
    onPagesReady?.({ totalPages: pages.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const listRef = useRef<FlatList<Page>>(null);
  const currentPageRef = useRef(0);

  // Tracks whether the initial `restorePosition` scroll has already been
  // applied for the current `pages` identity, so re-renders (e.g. a saved
  // word toggling `savedLemmas`) don't keep forcing the list back to the
  // restore position on every unrelated update.
  const restoredForPagesRef = useRef<Page[] | null>(null);

  const handleListLayoutReady = useCallback(() => {
    if (!pages || pages.length === 0) return;
    if (restoredForPagesRef.current === pages) return;
    restoredForPagesRef.current = pages;

    if (restorePosition) {
      const targetIndex = findPageForPosition(pages, restorePosition.paragraphId, restorePosition.charOffset);
      if (targetIndex !== null && targetIndex !== 0) {
        currentPageRef.current = targetIndex;
        listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      }
    }
  }, [pages, restorePosition]);

  const reportPositionForPage = useCallback(
    (pageIndex: number, pagesForReport: Page[]) => {
      const page = pagesForReport[pageIndex];
      const firstSegment = page?.segments[0];
      if (!firstSegment) return;

      const percent = pagesForReport.length > 1 ? pageIndex / (pagesForReport.length - 1) : 0;
      onPositionUpdate({
        paragraphId: firstSegment.paragraphId,
        charOffset: firstSegment.charStart,
        percent,
      });
    },
    [onPositionUpdate],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pages || pages.length === 0 || width === 0) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const pageIndex = Math.min(pages.length - 1, Math.max(0, Math.round(offsetX / width)));
      currentPageRef.current = pageIndex;
      onPageChange({ page: pageIndex, totalPages: pages.length });
      reportPositionForPage(pageIndex, pages);
    },
    [pages, width, onPageChange, reportPositionForPage],
  );

  /**
   * TOUCH-ZONE / FLATLIST-SWIPE GESTURE COMPOSITION.
   *
   * Bölgeler: kelime dokunuşu önce kazanır (yapısal olarak, aşağıya bak),
   * sonra sol %25 -> önceki sayfa, sağ %25 -> sonraki sayfa (son sayfada
   * `onChapterEnd`). ORTA %50 HİÇBİR ŞEY YAPMAZ.
   *
   * ORTA BÖLGE NEDEN KALDIRILDI (2026-09-07): orta %50'ye dokunmak
   * başlık ve alt şeridi gizleyip gösteriyordu. Kullanıcı bunu bir
   * özellik olarak değil, "boşluğa dokununca ekran büyüyor" diye bir
   * hata olarak bildirdi — çünkü metnin ortasına dokunmak (kelime
   * ıskalayınca sık olan bir şey) beklenmedik biçimde bütün arayüzü
   * kaldırıyordu.
   *
   * Daha kötüsü: gizlenen şeritlerden biri, bölümün son sayfasında
   * "sonraki bölüm" düğmesini taşıyan alt şerit. Yani kazara tetiklenen
   * bu hareket, bölümü bitiren kullanıcıyı devam yolundan da ediyordu.
   *
   * Kaybedilen şey (tam ekran okuma) küçük: şeritler zaten ince ve
   * reklam/promosyon taşımıyor (ürün ilkesi #1). Kazanılan şey,
   * dokunmanın öngörülebilir olması.
   *
   * "Word-tap wins, checked first" is NOT implemented as an if/else
   * priority chain here -- it falls out of how RN actually resolves
   * touches, which is worth spelling out because it's the reason this
   * composition works at all:
   *
   * 1. `ReaderPage`'s content (see that file's own top-of-file comment)
   *    is nested `<Text>` -- RN's Text renderer does its own INTERNAL
   *    hit-testing across nested inline spans, and only claims the
   *    touch responder if the exact point falls on a `<Text>` node that
   *    registered `onPress`/`onLongPress` (a word or sentence span). A
   *    tap landing on whitespace, paragraph margins, or blank page space
   *    is simply never claimed by the Text tree at all.
   * 2. This per-page `<Pressable>` overlay is rendered as an
   *    absolutely-positioned layer BEHIND `ReaderPage` in the same
   *    wrapping `<View>` (earlier in JSX = lower in paint/z order for
   *    overlapping siblings). Native hit-testing (both iOS `hitTest:`
   *    and Android's touch dispatch) walks front-to-back: it offers the
   *    touch to the front-most (ReaderPage's Text) layer first, and only
   *    continues to the layer behind (this overlay) when nothing in
   *    front claimed it.
   * 3. Net effect: a tap on a word/sentence is resolved entirely by
   *    `ReaderPage` and never reaches this Pressable at all -- "word-tap
   *    wins" is a structural consequence of z-order + Text's internal
   *    hit-testing, not a runtime priority check this component has to
   *    perform itself.
   *
   * `Pressable`'s discrete tap gesture composes safely with
   * `FlatList`'s own horizontal scroll (a plain native `UIScrollView` /
   * Android `RecyclerView`-backed scroll, not a JS `PanResponder`):
   * `Pressable`'s underlying `Pressability` does not eagerly claim the
   * JS responder on `touchmove` the way a custom `PanResponder` would --
   * it tracks press state without blocking ancestor scroll negotiation,
   * which is the same reason `TouchableOpacity`/`Pressable` children
   * inside a horizontal `FlatList`/`ScrollView` are an extremely common,
   * well-established RN pattern (tappable carousel cards). A quick tap
   * (no meaningful horizontal movement) resolves as `onPress` on this
   * overlay; a drag that exceeds the platform scroll-view's own pan
   * threshold is captured by the native scroll view itself and this
   * overlay's press is cancelled (never fires) -- so a swipe never also
   * triggers a spurious zone-tap.
   */
  const handleZonePress = useCallback(
    (locationXRatio: number) => {
      if (!pages || pages.length === 0) return;
      const current = currentPageRef.current;

      if (locationXRatio < 0.25) {
        if (current > 0) {
          const target = current - 1;
          currentPageRef.current = target;
          listRef.current?.scrollToIndex({ index: target, animated: true });
        }
      } else if (locationXRatio > 0.75) {
        if (current >= pages.length - 1) {
          onChapterEnd();
        } else {
          const target = current + 1;
          currentPageRef.current = target;
          listRef.current?.scrollToIndex({ index: target, animated: true });
        }
      }
      // Orta %50: bilerek boş — yukarıdaki gerekçeye bak.
    },
    [pages, onChapterEnd],
  );

  // Must match useChapterPagination's own `getPagePadding` exactly -- that
  // hook subtracts this same padding from the container size BEFORE
  // measuring/paginating, so a page's content is laid out assuming this much
  // inset. Rendering without applying it here would place text (sized for
  // the smaller, padded content box) flush in the corner of the full,
  // unpadded page box, leaving unused space along the bottom/trailing edges.
  const pagePadding = getPagePadding(settings.marginScale);

  const renderItem = useCallback(
    ({ item }: { item: Page }) => (
      <View style={[styles.pageSlot, { width, height }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(event) => {
            if (width === 0) return;
            handleZonePress(event.nativeEvent.locationX / width);
          }}
        />
        <View style={[styles.pageContent, { padding: pagePadding }]}>
          <ReaderPage
            page={item}
            paragraphs={chapter.paragraphs}
            textStyle={textStyle}
            savedLemmas={savedLemmas}
            onWordTap={onWordTap}
            onSentenceLongPress={onSentenceLongPress}
          />
        </View>
      </View>
    ),
    [width, height, pagePadding, chapter.paragraphs, textStyle, savedLemmas, onWordTap, onSentenceLongPress, handleZonePress],
  );

  const keyExtractor = useCallback(
    (_page: Page, index: number) => `${chapter.id}-${index}`,
    [chapter.id],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Page> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  if (width === 0 || height === 0) {
    // Not measured yet -- render the (invisible) measurement node so
    // `useChapterPagination`/`useChapterMeasurement` can still receive a
    // request once dimensions resolve, without flashing any reading
    // content at the wrong size.
    return <View style={styles.container} onLayout={onLayout} />;
  }

  if (isPaginating || !pages) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        {measurementNode}
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {measurementNode}
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onLayout={handleListLayoutReady}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageSlot: {
    overflow: "hidden",
  },
  pageContent: {
    flex: 1,
  },
});
