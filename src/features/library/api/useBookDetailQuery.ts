import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import {
  BOOK_SELECT_COLUMNS,
  mapBookRow,
  type RawBookRow,
} from "@/features/library/api/mapBookRow";

import type { Book, Chapter } from "@/features/library/types";

interface RawSectionRow {
  id: string;
  order_index: number;
  title: string | null;
  estimated_minutes: number | null;
}

interface RawProgressRow {
  section_id: string | null;
  percent: number;
  finished_at: string | null;
}

export interface BookDetailData {
  book: Book;
  /** Book-level reading completion, 0-100 (book-detail.html `.statline`
   * "Tamamlandı" cell). 0 when the reader has no progress row yet. */
  progressPercent: number;
  /** Chapter to open on CTA press: the section the reader is currently
   * on, or the first chapter if they haven't started. `null` only when
   * the book has zero chapters (empty-state case). */
  continueChapter: Chapter | null;
  /** Whether the reader has any recorded progress on this book — drives
   * the CTA copy ("Okumaya devam et" vs "Okumaya başla"). */
  hasStarted: boolean;
}

/**
 * book-detail.html needs, beyond the plain book row: every chapter's
 * title + per-chapter duration, and which chapters are already read so
 * the chapter list can render the `.ch.done` checkmark state.
 *
 * The schema has no per-chapter "done" flag — `user_book_progress` tracks
 * a single current position per book (`section_id` + `percent`), not a
 * done-set of section ids (see supabase/migrations/..._002_user.sql). A
 * chapter is therefore derived as "done" when its `order_index` is before
 * the reader's current section's `order_index` — the same "read up to
 * here" model the mockup's own numbers imply (chapters 1-4 done, current
 * chapter 5 next). If the book is fully finished (`finished_at` set),
 * every chapter counts as done.
 */
async function fetchBookDetail(id: string): Promise<BookDetailData | null> {
  const { data: bookRow, error: bookError } = await supabase
    .from("books")
    .select(BOOK_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (bookError) throw bookError;
  if (!bookRow) return null;

  const { data: sectionRows, error: sectionsError } = await supabase
    .from("book_sections")
    .select("id, order_index, title, estimated_minutes")
    .eq("book_id", id)
    .order("order_index", { ascending: true });

  if (sectionsError) throw sectionsError;

  const sections = (sectionRows ?? []) as RawSectionRow[];

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  let progressRow: RawProgressRow | null = null;
  if (userId) {
    const { data, error: progressError } = await supabase
      .from("user_book_progress")
      .select("section_id, percent, finished_at")
      .eq("user_id", userId)
      .eq("book_id", id)
      .maybeSingle<RawProgressRow>();

    if (progressError) throw progressError;
    progressRow = data;
  }

  const currentSection = progressRow?.section_id
    ? (sections.find((section) => section.id === progressRow?.section_id) ?? null)
    : null;
  const isFinished = progressRow?.finished_at != null;
  const currentOrderIndex = isFinished
    ? Number.POSITIVE_INFINITY
    : (currentSection?.order_index ?? Number.NEGATIVE_INFINITY);

  const chapters: Chapter[] = sections.map((section) => ({
    id: section.id,
    index: section.order_index,
    title: section.title ?? `${section.order_index}`,
    progressPercent: section.order_index < currentOrderIndex ? 100 : 0,
    estimatedMinutes: section.estimated_minutes ?? 0,
  }));

  const hasStarted = progressRow != null && (currentSection != null || isFinished);

  const continueChapter =
    (hasStarted && !isFinished
      ? chapters.find((chapter) => chapter.id === currentSection?.id)
      : undefined) ??
    chapters[0] ??
    null;

  const book: Book = {
    ...mapBookRow(bookRow as RawBookRow),
    chapters,
    comprehensionPercent: progressRow ? Math.round(progressRow.percent) : 0,
  };

  return {
    book,
    progressPercent: progressRow ? Math.round(progressRow.percent) : 0,
    continueChapter,
    hasStarted,
  };
}

export function useBookDetailQuery(id: string) {
  return useQuery({
    queryKey: libraryQueryKeys.bookDetail(id),
    queryFn: () => fetchBookDetail(id),
  });
}
