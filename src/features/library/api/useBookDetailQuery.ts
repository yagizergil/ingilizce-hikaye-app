import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import { computeBookProgress } from "@/features/library/api/bookProgress";
import {
  BOOK_SELECT_COLUMNS,
  mapBookRow,
  type RawBookRow,
} from "@/features/library/api/mapBookRow";

import type { Book, Chapter } from "@/features/library/types";
import { queryClient } from "@/lib/queryClient";

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
  /** Kitap tamamen bitirildi -- CTA "Baştan oku" olmalı, "devam et" değil. */
  isFinished: boolean;
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

  const progress = computeBookProgress(sections, progressRow);

  // Bölüm numarası LİSTEDEKİ SIRADAN türetiliyor, `order_index`ten değil:
  // 577 kitabın 544'ünde `order_index` 0'dan başlıyor ve CTA "Bölüm 0"
  // yazıyordu (kullanıcı bulgusu, 2026-09-26).
  const chapters: Chapter[] = sections.map((section, position) => ({
    id: section.id,
    index: position + 1,
    title: section.title ?? `${position + 1}`,
    progressPercent:
      progress.isFinished ||
      (progress.currentPosition !== null && position < progress.currentPosition)
        ? 100
        : 0,
    estimatedMinutes: section.estimated_minutes ?? 0,
  }));

  // Bitirilmiş kitapta "devam" edilecek bölüm yok: baştan başlanıyor.
  const continueChapter =
    (progress.hasStarted && !progress.isFinished && progress.currentPosition !== null
      ? chapters[progress.currentPosition]
      : undefined) ??
    chapters[0] ??
    null;

  const book: Book = {
    ...mapBookRow(bookRow as RawBookRow),
    chapters,
    comprehensionPercent: progress.percent,
  };

  return {
    book,
    progressPercent: progress.percent,
    continueChapter,
    hasStarted: progress.hasStarted,
    isFinished: progress.isFinished,
  };
}

export function useBookDetailQuery(id: string) {
  return useQuery({
    queryKey: libraryQueryKeys.bookDetail(id),
    queryFn: () => fetchBookDetail(id),
  });
}

/**
 * Kitaba dokunulduğu anda detayı çekmeye başlar: ekran geçişi (~300 ms)
 * sürerken veri gelir ve detay ekranı çoğu zaman yükleniyor göstermeden
 * açılır. Zaten tazeyse istek atılmaz.
 */
export function prefetchBookDetail(id: string): void {
  void queryClient.prefetchQuery({
    queryKey: libraryQueryKeys.bookDetail(id),
    queryFn: () => fetchBookDetail(id),
  });
}
