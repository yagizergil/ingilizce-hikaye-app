import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Kullanıcının BİTİRDİĞİ kitapların kimlikleri.
 *
 * Kapakların üstündeki "okundu" etiketi bunu okuyor (referans:
 * docs/reference/referance1.jpeg). Ayrı ve küçük bir sorgu olmasının
 * sebebi: raflardaki kitap listeleri katalog verisi (herkes için aynı,
 * uzun süre taze) ama "okudum" kullanıcıya özel ve sık değişiyor. İkisini
 * tek sorguda birleştirmek, her kitap bitirmede tüm katalog listesinin
 * yeniden çekilmesi demekti.
 *
 * `Set` döndürüyor: raf kartı her kitap için "bu bitti mi" diye soruyor,
 * dizi üzerinde arama yapmak kart sayısıyla çarpılırdı.
 */
export const finishedBooksQueryKey = ["home", "finishedBooks"] as const;

export async function fetchFinishedBookIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_book_progress")
    .select("book_id")
    .not("finished_at", "is", null);

  if (error) throw error;
  return new Set((data ?? []).map((row) => (row as { book_id: string }).book_id));
}

export function useFinishedBookIdsQuery() {
  return useQuery({
    queryKey: finishedBooksQueryKey,
    queryFn: fetchFinishedBookIds,
    // Bir kitabı bitirmek nadir bir olay; ama olduğunda etiketin hemen
    // çıkması gerekiyor, o yüzden uzun bir tazelik süresi verilmedi.
    staleTime: 30 * 1000,
  });
}
