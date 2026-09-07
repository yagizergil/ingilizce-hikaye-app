import type { Book } from "@/features/library/types";

export interface RawBookRow {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  subtitle: string | null;
  cefr_level: string | null;
  word_count: number | null;
  estimated_minutes: number | null;
  has_audio: boolean;
  /**
   * Data reconciliation note (Job 3): investigated via Supabase MCP
   * whether `genre`/`genreTags` on the `Book` type were secretly sourced
   * from a different, populated legacy column while `genres`/`themes`
   * sat empty. They are not — `books` has exactly two array columns for
   * this, `genres` and `themes`, no singular legacy `genre` text column
   * exists. A fresh query (`select count(*) filter (where genres is not
   * null and array_length(genres,1)>0)` etc.) confirmed both `genres` and
   * `themes` are empty across all 51 published books. `genre`/`genreTags`
   * below were already correctly sourced from `genres` before this
   * change; they just have nothing to show yet, same as `themes` will.
   */
  genres: string[];
  themes: string[];
  content_warnings: string[];
  license: string | null;
  source: string | null;
  source_url: string | null;
  popularity_score: number | string;
  published_at: string | null;
  created_at: string;
  cover_url: string | null;
}

export const BOOK_SELECT_COLUMNS =
  "id, slug, title, author, subtitle, cefr_level, word_count, estimated_minutes, has_audio, genres, themes, content_warnings, license, source, source_url, popularity_score, published_at, created_at, cover_url";

export function mapBookRow(row: RawBookRow): Book {
  const publishedAt = row.published_at ? new Date(row.published_at) : null;
  const isNew =
    publishedAt !== null && Date.now() - publishedAt.getTime() < 30 * 24 * 60 * 60 * 1000;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author ?? "",
    coverUrl: row.cover_url ?? null,
    level: (row.cefr_level?.toUpperCase() as Book["level"]) ?? "B1",
    genre: row.genres[0] ?? "",
    genreTags: row.genres,
    themes: row.themes,
    contentWarnings: row.content_warnings,
    wordCount: row.word_count ?? 0,
    estimatedMinutes: row.estimated_minutes ?? 0,
    comprehensionPercent: 0,
    hasAudio: row.has_audio,
    isNew,
    isPopular: Number(row.popularity_score) > 0,
    summaryTr: row.subtitle ?? "",
    newWordsForUser: 0,
    license: row.license ?? "",
    sourceName: row.source ?? "",
    sourceUrl: row.source_url ?? "",
    chapters: [],
    createdAt: row.created_at,
  };
}
