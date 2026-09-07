import { useMemo } from "react";

import { getReadingTypeScale, spacing } from "@/theme";
import { paginate } from "@/features/reader/pagination/paginate";
import {
  buildPageCacheKey,
  getCachedPages,
  setCachedPages,
} from "@/features/reader/pagination/pageCache";
import { useChapterMeasurement } from "@/features/reader/pagination/measureChapter";

import type { ReactNode } from "react";
import type { Page } from "@/features/reader/pagination/types";
import type { MeasurementRequest } from "@/features/reader/pagination/measureChapter";
import type { ReaderChapter, ReaderSettings } from "@/features/reader/types";

/**
 * Dimensions of the area available to render one page of reading content,
 * as measured by the caller (typically via `useWindowDimensions()` in the
 * reader screen, or the actual measured size of the page container if it
 * isn't full-screen). This hook does not read window dimensions itself so
 * it stays testable/pure with respect to layout -- the caller is the one
 * that actually knows the container's real size (safe-area insets, any
 * chrome above/below the reading surface, etc. are the caller's concern).
 */
export interface PageDimensions {
  width: number;
  height: number;
}

export interface UseChapterPaginationResult {
  pages: Page[] | null;
  isPaginating: boolean;
  /** Must be rendered somewhere in the caller's tree -- see
   * `useChapterMeasurement`'s `measurementNode` for why. */
  measurementNode: ReactNode;
}

/**
 * Horizontal AND vertical page padding, scaled by the user's margin
 * preference. Reuses `spacing.xl` (24) as the unscaled base -- the same
 * raw value the WebView reading path uses for its horizontal padding (see
 * `buildReaderHtml.ts`'s `Math.round(24 * marginScale)`), so native
 * pagination reproduces the same default margins the WebView path shipped
 * with. Applying it to both axes (not just horizontal) is a judgment call:
 * no mockup specifies a distinct vertical reading-surface padding for the
 * paginated (non-scrolling) layout, so the horizontal value is reused
 * symmetrically rather than inventing a second unsourced constant.
 */
export function getPagePadding(marginScale: number): number {
  return Math.round(spacing.xl * marginScale);
}

/**
 * Orchestrates chapter pagination: turns a `ReaderChapter` + the user's
 * `ReaderSettings` + the available page dimensions into a list of `Page`s
 * ready to flip through.
 *
 * Pipeline: `getReadingTypeScale` (typography) -> `pageCache` lookup (skip
 * straight to pages on a hit) -> `useChapterMeasurement` (native text
 * layout, only on a cache miss) -> `paginate` (pure page-breaking) ->
 * `pageCache` write-back.
 */
export function useChapterPagination(
  chapter: ReaderChapter | null,
  settings: ReaderSettings,
  pageDimensions: PageDimensions
): UseChapterPaginationResult {
  const { paragraph: textStyle } = getReadingTypeScale(
    settings.fontScale,
    settings.lineHeightScale,
    settings.fontFamily
  );

  const padding = getPagePadding(settings.marginScale);
  const contentWidth = Math.max(0, pageDimensions.width - padding * 2);
  const contentHeight = Math.max(0, pageDimensions.height - padding * 2);

  // Cache key covers exactly the inputs that determine the pagination
  // OUTPUT (see pageCache.ts for why the resolved fontSize/lineHeight/
  // letterSpacing are used rather than the raw fontScale/lineHeightScale
  // multipliers): chapter identity, resolved typography, and both page
  // dimensions (contentHeight matters for pagination itself, not just
  // measurement's contentWidth).
  const pageCacheKey = useMemo<string | null>(() => {
    if (!chapter || contentWidth === 0 || contentHeight === 0) return null;
    return buildPageCacheKey({
      chapterId: chapter.id,
      fontFamily: textStyle.fontFamily,
      fontSize: textStyle.fontSize,
      lineHeight: textStyle.lineHeight,
      letterSpacing: textStyle.letterSpacing,
      width: contentWidth,
      height: contentHeight,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chapter,
    textStyle.fontFamily,
    textStyle.fontSize,
    textStyle.lineHeight,
    textStyle.letterSpacing,
    contentWidth,
    contentHeight,
  ]);

  // Cache lookup is synchronous (SQLite `getFirstSync`), so a cache hit is
  // known before the first render that could otherwise kick off
  // measurement -- this is what lets a cache hit skip the "measuring" state
  // entirely instead of flashing it for one frame.
  const cachedPages = useMemo<Page[] | null>(() => {
    if (!pageCacheKey) return null;
    return getCachedPages(pageCacheKey);
  }, [pageCacheKey]);

  const measurementRequest = useMemo<MeasurementRequest | null>(() => {
    // A cache hit means pagination is already known -- skip measurement
    // entirely (this is the whole point of the cache: re-opening a chapter
    // with unchanged settings/dimensions must not re-run text layout).
    if (!chapter || contentWidth === 0 || cachedPages) return null;
    return {
      // Everything that can change line-wrap or heights must be part of the
      // key so a fresh measurement pass is triggered when any of it changes:
      // chapter identity, font/line-height/family, and available width.
      requestKey: [
        chapter.id,
        settings.fontScale,
        settings.lineHeightScale,
        settings.fontFamily,
        contentWidth,
      ].join("|"),
      paragraphs: chapter.paragraphs,
      textStyle,
      width: contentWidth,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chapter,
    settings.fontScale,
    settings.lineHeightScale,
    settings.fontFamily,
    contentWidth,
    cachedPages,
  ]);

  const { paragraphs: measuredParagraphs, isMeasuring, measurementNode } =
    useChapterMeasurement(measurementRequest);

  const freshPages = useMemo<Page[] | null>(() => {
    if (!measuredParagraphs || contentHeight === 0) return null;

    const computed = paginate(measuredParagraphs, contentHeight);
    if (pageCacheKey) {
      setCachedPages(pageCacheKey, computed);
    }
    return computed;
  }, [measuredParagraphs, contentHeight, pageCacheKey]);

  const pages = cachedPages ?? freshPages;

  return {
    pages,
    // On a cache hit, `measurementRequest` is null so `isMeasuring` is
    // always false -- the caller never sees a "measuring" state for a
    // cache hit, it resolves as soon as `cachedPages` is available (the
    // same render pass that determined there was a hit).
    isPaginating: isMeasuring,
    measurementNode,
  };
}
