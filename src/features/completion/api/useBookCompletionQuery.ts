import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface BookCompletion {
  bookTitle: string;
  bookAuthor: string | null;
  /** Bu kitabı okurken kaydedilen kelime sayısı. */
  savedWordCount: number;
  /** Bu kitapta geçirilen toplam dakika. */
  minutes: number;
  /** Kullanıcının bugüne kadar bitirdiği toplam kitap sayısı. */
  completedBookCount: number;
}

interface BookRow {
  title: string;
  author: string | null;
}

/**
 * Kitap bitirme ekranının verisi.
 *
 * NEDEN AYRI BİR SORGU: bu ekran okuma akışının DIŞINDA, ayrı bir route.
 * Reader'ın kendi sorgularını taşımıyor; yalnızca "az önce ne başardın"
 * sorusunun cevabını getiriyor.
 *
 * `completedBookCount` puan isteme eşiği için de kullanılıyor
 * (src/lib/storeReview.ts) — ikinci kitaptan önce puan istenmiyor.
 */
export function useBookCompletionQuery(bookId: string | null) {
  return useQuery({
    queryKey: ["completion", "book", bookId],
    enabled: bookId !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BookCompletion> => {
      if (!bookId) throw new Error("completion_missing_book_id");

      const [book, savedWords, progress, completed] = await Promise.all([
        supabase.from("books").select("title, author").eq("id", bookId).single<BookRow>(),
        // RLS `user_saved_words`'ü auth.uid() ile sınırlıyor, ayrıca
        // user_id filtresi gerekmiyor.
        supabase
          .from("user_saved_words")
          .select("id", { count: "exact", head: true })
          .eq("book_id", bookId),
        supabase
          .from("user_book_progress")
          .select("total_seconds")
          .eq("book_id", bookId)
          .maybeSingle<{ total_seconds: number | null }>(),
        supabase
          .from("user_book_progress")
          .select("book_id", { count: "exact", head: true })
          .not("finished_at", "is", null),
      ]);

      if (book.error) throw book.error;
      if (savedWords.error) throw savedWords.error;

      return {
        bookTitle: book.data.title,
        bookAuthor: book.data.author,
        savedWordCount: savedWords.count ?? 0,
        minutes: Math.max(1, Math.round((progress.data?.total_seconds ?? 0) / 60)),
        completedBookCount: completed.count ?? 0,
      };
    },
  });
}
