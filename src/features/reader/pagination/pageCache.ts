import { Platform } from "react-native";

import type { Page } from "@/features/reader/pagination/types";

/**
 * expo-sqlite has no web implementation (see chapterCache.ts /
 * useBookLemmaDictionary.ts, whose fallback-on-error pattern this module
 * replicates). Reuses the SAME `reader-cache.db` database instance/file as
 * those two -- a second SQLite database file would be an unnecessary second
 * on-disk store for the same feature.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- must not evaluate on web, where expo-sqlite has no native backend */
const db =
  Platform.OS === "web"
    ? null
    : (require("expo-sqlite") as typeof import("expo-sqlite")).openDatabaseSync("reader-cache.db");
/* eslint-enable @typescript-eslint/no-require-imports */

if (db) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_page_layouts (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
}

/**
 * Cache key built from the RESOLVED typography values (actual pixel
 * `fontSize`/`lineHeight`/`letterSpacing` returned by
 * `getReadingTypeScale`), not from the raw `fontScale`/`lineHeightScale`
 * multipliers the caller passes in. These resolved numbers are what
 * actually determine line-wrap/height -- the multipliers are just an input
 * to computing them. Keying on the multipliers would be correct today
 * (each multiplier combination currently resolves to a distinct pixel
 * value), but keying on the resolved values is the more robust choice: it
 * stays correct even if `getReadingTypeScale`'s formula ever changes to
 * make two different multiplier combinations resolve to the same pixel
 * output (e.g. rounding), since the cache key is defined in terms of "what
 * actually affects layout," not "what happened to produce it."
 */
export function buildPageCacheKey(params: {
  chapterId: string;
  fontFamily: string | undefined;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  width: number;
  height: number;
}): string {
  return [
    params.chapterId,
    params.fontFamily ?? "",
    params.fontSize,
    params.lineHeight,
    params.letterSpacing,
    params.width,
    params.height,
  ].join("|");
}

export function getCachedPages(cacheKey: string): Page[] | null {
  if (!db) return null;
  try {
    const row = db.getFirstSync<{ payload: string }>(
      "SELECT payload FROM cached_page_layouts WHERE cache_key = ?",
      [cacheKey],
    );
    if (!row) return null;
    return JSON.parse(row.payload) as Page[];
  } catch {
    // A corrupt row / unreadable payload / SQLite error should degrade to
    // "no cache entry", not crash the reader -- pagination will simply
    // recompute from scratch, same as a first-ever visit to this chapter.
    return null;
  }
}

export function setCachedPages(cacheKey: string, pages: Page[]): void {
  if (!db) return;
  try {
    db.runSync(
      "INSERT OR REPLACE INTO cached_page_layouts (cache_key, payload, cached_at) VALUES (?, ?, ?)",
      [cacheKey, JSON.stringify(pages), Date.now()],
    );
  } catch {
    // Failing to persist the cache entry must not fail pagination itself --
    // the caller already has the freshly computed pages in memory and can
    // keep using them; the only cost of a write failure is re-pagination on
    // the next visit.
  }
}

/**
 * No TTL / expiry: a cached page layout for a given cache key never goes
 * stale on its own. Book content is immutable once published (mirrors
 * useBookLemmaDictionary.ts's `staleTime: Infinity` reasoning), and every
 * input that could change the pagination OUTPUT (chapter identity,
 * resolved typography, page dimensions) is already part of the key --  so
 * if any of those change, a different key is looked up and this entry is
 * simply never read again, not incorrectly served stale. Adding an expiry
 * mechanism on top of that would be complexity with no correctness benefit
 * ("basitlik önce gelir" -- CLAUDE.md).
 */
