import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchBooks } from "@/features/library/api/useBooksQuery";
import { homeQueryKeys } from "@/features/home/api/queryKeys";

import type { Book } from "@/features/library/types";

interface RawFavoriteRow {
  book_id: string;
  created_at: string;
}

interface RawProgressRow {
  book_id: string;
  last_read_at: string;
}

export interface FavoritesReadLists {
  favorites: Book[];
  /** Books with any `user_book_progress` row, newest `last_read_at` first
   * — same "okunanlar" definition as useHomeExtrasQuery's counts. */
  read: Book[];
}

/**
 * Full book rows for the new "Favoriler ve Okunanlar" screen
 * (app/favorites.tsx) — `useFavoritedBookIdsQuery` only returns a
 * `Set<string>` of ids (enough for a per-row favorited flag elsewhere),
 * this hook joins those ids (plus `user_book_progress` ids) against the
 * full book list so the screen can render `BookListRow`s directly.
 */
async function fetchFavoritesReadLists(): Promise<FavoritesReadLists> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) return { favorites: [], read: [] };

  const books = await fetchBooks();
  const booksById = new Map(books.map((book) => [book.id, book]));

  const [{ data: favoriteRows, error: favoritesError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      supabase
        .from("user_favorites")
        .select("book_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_book_progress")
        .select("book_id, last_read_at")
        .eq("user_id", userId)
        .order("last_read_at", { ascending: false }),
    ]);
  if (favoritesError) throw favoritesError;
  if (progressError) throw progressError;

  const favorites = ((favoriteRows as RawFavoriteRow[] | null) ?? [])
    .map((row) => booksById.get(row.book_id))
    .filter((book): book is Book => book !== undefined);

  const read = ((progressRows as RawProgressRow[] | null) ?? [])
    .map((row) => booksById.get(row.book_id))
    .filter((book): book is Book => book !== undefined);

  return { favorites, read };
}

export function useFavoritesReadListsQuery() {
  return useQuery({
    queryKey: homeQueryKeys.favoritesReadLists(),
    queryFn: fetchFavoritesReadLists,
  });
}
