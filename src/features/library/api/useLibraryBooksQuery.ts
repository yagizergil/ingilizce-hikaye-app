import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchBooks } from "@/features/library/api/useBooksQuery";
import { fetchChapterCounts } from "@/features/library/api/fetchChapterCounts";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import { gateOnLanguagePair, useActiveLanguagePairQuery } from "@/features/languagePair";
import type { Book } from "@/features/library/types";

/**
 * library.html's book list needs a chapter count per row (see `.book
 * .stats` — Kelime / Bölüm / Dakika). `useBooksQuery` intentionally leaves
 * `chapters: []` (see mapBookRow.ts) since most callers of the plain book
 * list don't need it; this hook layers the chapter count on top for the
 * library screen specifically, reusing `fetchBooks` rather than
 * duplicating the books select.
 */
export async function fetchLibraryBooks(
  queryClient: QueryClient,
  targetLanguage: string,
): Promise<Book[]> {
  // Aynı `books` tablosunu `libraryQueryKeys.books()` ile PAYLAŞIYOR --
  // bkz. useHomeExtrasQuery.ts'teki performans denetimi notu. Bu ekran
  // zaten çekilmiş kataloğu varsa ikinci bir ağ isteği yapmıyor. Anahtara
  // dil eklenmesinin gerekçesi queryKeys.ts'teki denetim bulgusunda.
  const books = await queryClient.ensureQueryData({
    queryKey: libraryQueryKeys.books(targetLanguage),
    queryFn: () => fetchBooks(targetLanguage),
  });
  const chapterCounts = await fetchChapterCounts(books.map((book) => book.id));

  return books.map((book) => ({
    ...book,
    chapters: Array.from({ length: chapterCounts.get(book.id) ?? 0 }, (_, index) => ({
      id: `${book.id}-${index}`,
      index: index + 1,
      title: "",
      progressPercent: 0,
    })),
  }));
}

export function useLibraryBooksQuery() {
  const queryClient = useQueryClient();
  const pairQuery = useActiveLanguagePairQuery();
  const activePair = pairQuery.data;
  const targetLanguage = activePair?.targetLanguage ?? null;

  const query = useQuery({
    queryKey: libraryQueryKeys.booksWithChapterCounts(targetLanguage ?? ""),
    queryFn: () => fetchLibraryBooks(queryClient, targetLanguage as string),
    enabled: targetLanguage !== null,
  });
  return gateOnLanguagePair(query, pairQuery);
}
