import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";

export interface SeriesBook {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  orderIndex: number;
}

export interface BookSeriesData {
  collectionTitleKey: string;
  /** All books in the series, ordered by `collection_books.order_index`. */
  books: SeriesBook[];
  /** This book's own `order_index` within the series. */
  currentIndex: number;
  /** Next book in the series, or null if this is the last one. */
  nextBook: SeriesBook | null;
}

interface RawCollectionBookRow {
  order_index: number;
  book_id: string;
  collections: { title_key: string } | { title_key: string }[] | null;
}

interface RawBookRow {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
}

/**
 * Given a book id, finds the series (`collections` row) it belongs to, if
 * any, and returns the full ordered book list plus this book's position and
 * next-book link. Most books aren't in any series — that's the common,
 * silent, non-error case: this resolves to `null`, not a logged warning or
 * a thrown error.
 */
async function fetchBookSeries(bookId: string): Promise<BookSeriesData | null> {
  const { data: membershipRow, error: membershipError } = await supabase
    .from("collection_books")
    .select("collection_id, order_index")
    .eq("book_id", bookId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membershipRow) return null;

  const { data: seriesRows, error: seriesError } = await supabase
    .from("collection_books")
    .select("order_index, book_id, collections(title_key)")
    .eq("collection_id", membershipRow.collection_id)
    .order("order_index", { ascending: true });

  if (seriesError) throw seriesError;
  if (!seriesRows || seriesRows.length === 0) return null;

  const rows = seriesRows as unknown as RawCollectionBookRow[];
  const bookIds = rows.map((row) => row.book_id);

  const { data: bookRows, error: booksError } = await supabase
    .from("books")
    .select("id, slug, title, cover_url")
    .in("id", bookIds);

  if (booksError) throw booksError;

  const booksById = new Map((bookRows as RawBookRow[] | null ?? []).map((row) => [row.id, row]));

  const books: SeriesBook[] = rows
    .map((row) => {
      const bookRow = booksById.get(row.book_id);
      if (!bookRow) return null;
      return {
        id: bookRow.id,
        slug: bookRow.slug,
        title: bookRow.title,
        coverUrl: bookRow.cover_url,
        orderIndex: row.order_index,
      };
    })
    .filter((book): book is SeriesBook => book !== null);

  const firstRow = rows[0];
  const collectionsField = firstRow?.collections;
  const collectionTitleKey = Array.isArray(collectionsField)
    ? (collectionsField[0]?.title_key ?? "")
    : (collectionsField?.title_key ?? "");

  const currentIndex = membershipRow.order_index;
  const nextBook = books.find((book) => book.orderIndex === currentIndex + 1) ?? null;

  return {
    collectionTitleKey,
    books,
    currentIndex,
    nextBook,
  };
}

export function useBookSeriesQuery(bookId: string | undefined) {
  return useQuery({
    queryKey: libraryQueryKeys.bookSeries(bookId ?? ""),
    queryFn: () => fetchBookSeries(bookId as string),
    enabled: Boolean(bookId),
  });
}
