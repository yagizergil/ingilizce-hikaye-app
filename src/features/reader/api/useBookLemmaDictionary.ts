import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { readerQueryKeys } from "@/features/reader/api/queryKeys";

/** Bir kelimenin tek bir anlami (tur + Turkce karsilik). */
export interface LemmaSense {
  pos: string | null;
  trGloss: string | null;
}

export interface BookLemmaEntry {
  pos: string | null;
  cefrLevel: string | null;
  trGloss: string | null;
  ipa: string | null;
  audioUrl: string | null;
  isPhrasal: boolean;
  falseFriendNoteTr: string | null;
  /**
   * Kelimenin TUM anlamlari, oncelik sirasiyla (bkz. migration 027).
   *
   * NEDEN: sozlukte 2.345 kelimenin hem isim hem fiil anlami var ve
   * `lemma_canonical` bunlardan hep ismi ana karsilik seciyordu.
   * Kullanici "watched" kelimesine dokundugunda "kol saati" goruyordu.
   * Anlamlarin tamami tasindigi icin sheet, cekim ekinden cikardigi
   * ipucuyla (tokenizer.js `inflectionHint`) dogru olani secebiliyor ve
   * digerlerini de gosterebiliyor.
   */
  senses?: LemmaSense[];
}

export type BookLemmaDictionary = Map<string, BookLemmaEntry>;

interface RawSenseRow {
  pos: string | null;
  tr_gloss: string | null;
}

interface RawCanonicalRow {
  lemma: string;
  pos: string | null;
  cefr_level: string | null;
  tr_gloss: string | null;
  ipa: string | null;
  audio_url: string | null;
  is_phrasal: boolean | null;
  false_friend_note_tr: string | null;
  senses: RawSenseRow[] | null;
}

function toDictionary(rows: RawCanonicalRow[]): BookLemmaDictionary {
  const map: BookLemmaDictionary = new Map();
  for (const row of rows) {
    map.set(row.lemma, {
      pos: row.pos,
      cefrLevel: row.cefr_level,
      trGloss: row.tr_gloss,
      ipa: row.ipa,
      audioUrl: row.audio_url,
      isPhrasal: row.is_phrasal ?? false,
      falseFriendNoteTr: row.false_friend_note_tr,
      senses: (row.senses ?? []).map((sense) => ({
        pos: sense.pos,
        trGloss: sense.tr_gloss,
      })),
    });
  }
  return map;
}

function serializeDictionary(dictionary: BookLemmaDictionary): string {
  return JSON.stringify(Array.from(dictionary.entries()));
}

function deserializeDictionary(payload: string): BookLemmaDictionary {
  const entries = JSON.parse(payload) as [string, BookLemmaEntry][];
  return new Map(entries);
}

/**
 * expo-sqlite has no web implementation (see chapterCache.ts, whose
 * fallback-on-error pattern this hook replicates). Reuses the SAME
 * `reader-cache.db` database instance/file as chapterCache.ts — a second
 * SQLite database file would be an unnecessary second on-disk store for
 * the same feature.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- must not evaluate on web, where expo-sqlite has no native backend */
const db =
  Platform.OS === "web"
    ? null
    : (require("expo-sqlite") as typeof import("expo-sqlite")).openDatabaseSync("reader-cache.db");
/* eslint-enable @typescript-eslint/no-require-imports */

if (db) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_book_lemma_dicts (
      book_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
}

function getCachedDictionary(bookId: string): BookLemmaDictionary | null {
  if (!db) return null;
  const row = db.getFirstSync<{ payload: string }>(
    "SELECT payload FROM cached_book_lemma_dicts WHERE book_id = ?",
    [bookId],
  );
  if (!row) return null;
  return deserializeDictionary(row.payload);
}

function setCachedDictionary(bookId: string, dictionary: BookLemmaDictionary): void {
  if (!db) return;
  db.runSync(
    "INSERT OR REPLACE INTO cached_book_lemma_dicts (book_id, payload, cached_at) VALUES (?, ?, ?)",
    [bookId, serializeDictionary(dictionary), Date.now()],
  );
}

/**
 * Supabase JS sends `.in()` filters as a GET query-string parameter, not a
 * request body — for a book with thousands of unique lemmas (Frankenstein:
 * 4,997; Sherlock Holmes: 5,521), a single `.in('lemma', lemmas)` call
 * produces a URL tens of thousands of characters long, well past what any
 * HTTP client/proxy/CDN in the request path reliably accepts. That request
 * was failing silently (rejected promise, caught by the outer try/catch
 * below and swallowed into the SQLite-cache fallback, which is empty on a
 * book's first-ever open) — the actual root cause of the reader hanging on
 * its loading screen indefinitely for larger-vocabulary books, while
 * shorter books (e.g. Wizard of Oz: 2,060 lemmas) happened to stay under
 * whatever length limit was being hit. Fixed by chunking the `.in()` calls
 * to a safe size and merging the results — this works regardless of how
 * large a book's vocabulary is, with no server-side change needed.
 */
const LEMMA_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchBookLemmaDictionary(bookId: string): Promise<BookLemmaDictionary> {
  const { data: bookLemmaRows, error: bookLemmaError } = await supabase
    .from("book_lemmas")
    .select("lemma")
    .eq("book_id", bookId);
  if (bookLemmaError) throw bookLemmaError;

  const lemmas = (bookLemmaRows ?? []).map((row) => row.lemma as string);
  if (lemmas.length === 0) {
    // Supabase's `.in()` behavior on an empty array is inconsistent across
    // versions (some return all rows, some return none) — guard it
    // explicitly instead of relying on that behavior.
    return new Map();
  }

  const lemmaChunks = chunk(lemmas, LEMMA_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    lemmaChunks.map(async (lemmaChunk) => {
      const { data, error } = await supabase
        .from("lemma_canonical")
        .select("lemma, pos, cefr_level, tr_gloss, ipa, audio_url, is_phrasal, false_friend_note_tr, senses")
        .in("lemma", lemmaChunk);
      if (error) throw error;
      return (data ?? []) as RawCanonicalRow[];
    }),
  );

  const dictionary = toDictionary(chunkResults.flat());
  setCachedDictionary(bookId, dictionary);
  return dictionary;
}

/**
 * Book content and its associated dictionary rows are immutable once a
 * book is published to the catalog (mirrors useChapterQuery.ts's
 * staleTime rationale) — there is no user-facing mechanism that mutates
 * `book_lemmas` or `lemma_canonical` for a published book, so staleTime:
 * Infinity avoids ever refetching within a session.
 */
export function useBookLemmaDictionary(bookId: string) {
  return useQuery({
    queryKey: readerQueryKeys.bookLemmaDictionary(bookId),
    queryFn: async () => {
      try {
        return await fetchBookLemmaDictionary(bookId);
      } catch (error) {
        const cached = getCachedDictionary(bookId);
        if (cached) return cached;
        throw error;
      }
    },
    initialData: () => getCachedDictionary(bookId) ?? undefined,
    staleTime: Infinity,
    enabled: bookId.length > 0,
  });
}
