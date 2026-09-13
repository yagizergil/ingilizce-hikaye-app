import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import {
  BOOK_SELECT_COLUMNS,
  mapBookRow,
  type RawBookRow,
} from "@/features/library/api/mapBookRow";
import { fetchActiveLanguagePair } from "@/features/languagePair";
import type { Book } from "@/features/library/types";

/**
 * `targetLanguage` VERİLMEZSE aktif dil çiftinden okunuyor (migration 033).
 * Parametre olarak da alınabilir olması, çağıranın (örn. bir "diğer dilde
 * gözat" ekranının) aktif çiftten BAĞIMSIZ bir dil için sorgu yapmasına
 * izin veriyor -- bugün hiçbir çağıran bunu kullanmıyor ama filtre kitabın
 * kendi sütununa (`target_language`) dayandığı için ek maliyeti yok.
 */
export async function fetchBooks(targetLanguage?: string): Promise<Book[]> {
  const language = targetLanguage ?? (await fetchActiveLanguagePair()).targetLanguage;

  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT_COLUMNS)
    .eq("status", "published")
    .eq("target_language", language)
    .order("popularity_score", { ascending: false });

  if (error) throw error;
  return (data as RawBookRow[]).map(mapBookRow);
}

export function useBooksQuery() {
  return useQuery({
    queryKey: libraryQueryKeys.books(),
    queryFn: () => fetchBooks(),
  });
}
