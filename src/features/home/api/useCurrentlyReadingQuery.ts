import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchBooks } from "@/features/library/api/useBooksQuery";
import { homeQueryKeys } from "@/features/home/api/queryKeys";

import type { Book } from "@/features/library/types";

export interface CurrentlyReadingBook {
  book: Book;
  progressPercent: number;
}

interface RawProgressRow {
  book_id: string;
  percent: number;
}

const CURRENTLY_READING_LIMIT = 10;

/**
 * "Şu an okunuyor" home shelf — every in-progress (not finished) book,
 * most recently read first, each with its own percent (matches the
 * reference app's per-cover percentage under "Şu an okunuyor" -- distinct
 * from `useHomeDataQuery`'s single "Kaldığın yer" hero card, which only
 * ever shows the ONE most recent book).
 */
async function fetchCurrentlyReading(): Promise<CurrentlyReadingBook[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data: progressRows, error } = await supabase
    .from("user_book_progress")
    .select("book_id, percent")
    .eq("user_id", userId)
    .is("finished_at", null)
    .order("last_read_at", { ascending: false })
    .limit(CURRENTLY_READING_LIMIT)
    .returns<RawProgressRow[]>();

  if (error) throw error;
  if (!progressRows || progressRows.length === 0) return [];

  const books = await fetchBooks();
  const booksById = new Map(books.map((book) => [book.id, book]));

  return progressRows
    .map((row) => {
      const book = booksById.get(row.book_id);
      return book ? { book, progressPercent: Math.round(row.percent) } : null;
    })
    .filter((entry): entry is CurrentlyReadingBook => entry !== null);
}

export function useCurrentlyReadingQuery() {
  return useQuery({
    queryKey: homeQueryKeys.currentlyReading(),
    queryFn: fetchCurrentlyReading,
  });
}

/**
 * The reference app's "x" dismiss on a currently-reading cover -- clears
 * this book's saved position entirely (equivalent to "hiç başlamamış
 * gibi"), same as a user manually resetting their place. Optimistically
 * removes the book from the shelf before the network round-trip.
 */
export function useRemoveFromCurrentlyReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("no_session");

      const { error } = await supabase
        .from("user_book_progress")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("book_id", bookId);
      if (error) throw error;
    },
    onMutate: async (bookId) => {
      await queryClient.cancelQueries({ queryKey: homeQueryKeys.currentlyReading() });
      const previous = queryClient.getQueryData<CurrentlyReadingBook[]>(homeQueryKeys.currentlyReading());
      queryClient.setQueryData<CurrentlyReadingBook[]>(
        homeQueryKeys.currentlyReading(),
        (current) => current?.filter((entry) => entry.book.id !== bookId) ?? [],
      );
      return { previous };
    },
    onError: (_error, _bookId, context) => {
      if (context?.previous) queryClient.setQueryData(homeQueryKeys.currentlyReading(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.currentlyReading() });
    },
  });
}
