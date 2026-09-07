import { Platform } from "react-native";
import type { ReaderChapter } from "@/features/reader/types";

/**
 * expo-sqlite has no web implementation, so offline chapter caching is a
 * no-op on web — the app still works there, it just always fetches from
 * the network instead of falling back to a local cache.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- must not evaluate on web, where expo-sqlite has no native backend */
const db =
  Platform.OS === "web"
    ? null
    : (require("expo-sqlite") as typeof import("expo-sqlite")).openDatabaseSync("reader-cache.db");
/* eslint-enable @typescript-eslint/no-require-imports */

if (db) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_chapters (
      chapter_id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
}

export function getCachedChapter(chapterId: string): ReaderChapter | null {
  if (!db) return null;
  const row = db.getFirstSync<{ payload: string }>(
    "SELECT payload FROM cached_chapters WHERE chapter_id = ?",
    [chapterId],
  );
  if (!row) return null;
  return JSON.parse(row.payload) as ReaderChapter;
}

export function setCachedChapter(chapter: ReaderChapter): void {
  if (!db) return;
  db.runSync(
    "INSERT OR REPLACE INTO cached_chapters (chapter_id, book_id, payload, cached_at) VALUES (?, ?, ?, ?)",
    [chapter.id, chapter.bookId, JSON.stringify(chapter), Date.now()],
  );
}
