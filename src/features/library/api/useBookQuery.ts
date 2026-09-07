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
}

async function fetchBook(id: string): Promise<Book | null> {
  const { data: bookRow, error: bookError } = await supabase
    .from("books")
    .select(BOOK_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (bookError) throw bookError;
  if (!bookRow) return null;

  const { data: sectionRows, error: sectionsError } = await supabase
    .from("book_sections")
    .select("id, order_index, title")
    .eq("book_id", id)
    .order("order_index", { ascending: true });

  if (sectionsError) throw sectionsError;

  const chapters: Chapter[] = ((sectionRows ?? []) as RawSectionRow[]).map((section) => ({
    id: section.id,
    index: section.order_index,
    title: section.title ?? `${section.order_index}`,
    progressPercent: 0,
  }));

  return { ...mapBookRow(bookRow as RawBookRow), chapters };
}

export function useBookQuery(id: string) {
  return useQuery({
    queryKey: libraryQueryKeys.book(id),
    queryFn: () => fetchBook(id),
  });
}
