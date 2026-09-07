import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import {
  BOOK_SELECT_COLUMNS,
  mapBookRow,
  type RawBookRow,
} from "@/features/library/api/mapBookRow";
import type { Book } from "@/features/library/types";

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT_COLUMNS)
    .eq("status", "published")
    .order("popularity_score", { ascending: false });

  if (error) throw error;
  return (data as RawBookRow[]).map(mapBookRow);
}

export function useBooksQuery() {
  return useQuery({
    queryKey: libraryQueryKeys.books(),
    queryFn: fetchBooks,
  });
}
