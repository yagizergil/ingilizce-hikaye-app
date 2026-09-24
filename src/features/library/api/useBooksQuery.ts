import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { libraryQueryKeys } from "@/features/library/api/queryKeys";
import {
  BOOK_LIST_SELECT_COLUMNS,
  mapBookRow,
  type RawBookRow,
} from "@/features/library/api/mapBookRow";
import {
  fetchActiveLanguagePair,
  gateOnLanguagePair,
  useActiveLanguagePairQuery,
} from "@/features/languagePair";
import type { Book } from "@/features/library/types";

/**
 * `targetLanguage` VERİLMEZSE aktif dil çiftinden okunuyor (migration 033).
 * Parametre olarak da alınabilir olması, çağıranın (örn. bir "diğer dilde
 * gözat" ekranının) aktif çiftten BAĞIMSIZ bir dil için sorgu yapmasına
 * izin veriyor -- bugün hiçbir çağıran bunu kullanmıyor ama filtre kitabın
 * kendi sütununa (`target_language`) dayandığı için ek maliyeti yok.
 */
/** PostgREST'in tek istekte döndürdüğü en fazla satır sayısı. */
const POSTGREST_MAX_ROWS = 1000;

export async function fetchBooks(targetLanguage?: string): Promise<Book[]> {
  const language = targetLanguage ?? (await fetchActiveLanguagePair()).targetLanguage;

  /**
   * SAYFALANARAK çekiliyor.
   *
   * DENETİM BULGUSU (2026-09-19): burada ne `.limit()` ne de sayfalama
   * vardı. PostgREST bu projede en fazla 1000 satır döndürüp fazlasını
   * SESSİZCE kesiyor; katalogda şu an 529 yayında kitap var, yani sınıra
   * 471 kitap kalmıştı. Sınır aşıldığında kütüphane hata vermeden eksik
   * gösterecekti -- bu turda `book_lemmas` ve `book_paragraphs` üzerinde
   * aynı sınıf iki hata daha bulundu, üçü de aynı sessiz kesme.
   */
  const rows: RawBookRow[] = [];

  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await supabase
      .from("books")
      .select(BOOK_LIST_SELECT_COLUMNS)
      .eq("status", "published")
      .eq("target_language", language)
      .order("popularity_score", { ascending: false })
      .range(from, from + POSTGREST_MAX_ROWS - 1);

    if (error) throw error;

    const page = (data ?? []) as RawBookRow[];
    rows.push(...page);
    // Kısmi sayfa = son sayfa; tam dolu sayfada döngü devam ediyor.
    if (page.length < POSTGREST_MAX_ROWS) break;
  }

  return rows.map(mapBookRow);
}

export function useBooksQuery() {
  const pairQuery = useActiveLanguagePairQuery();
  const activePair = pairQuery.data;
  const targetLanguage = activePair?.targetLanguage ?? null;

  const query = useQuery({
    queryKey: libraryQueryKeys.books(targetLanguage ?? ""),
    queryFn: () => fetchBooks(targetLanguage ?? undefined),
    // Aktif çift henüz gelmeden sorgu başlamıyor -- aksi halde ilk render
    // `books("")` gibi anlamsız bir anahtarla bir istek atar, sonra
    // gerçek dil gelince İKİNCİ bir istek daha atardı.
    enabled: targetLanguage !== null,
  });
  return gateOnLanguagePair(query, pairQuery);
}
