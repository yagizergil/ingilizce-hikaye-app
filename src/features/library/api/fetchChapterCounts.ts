import { supabase } from "@/lib/supabase";

interface RawCountRow {
  book_id: string;
  section_count: number;
}

/**
 * Kitap başına bölüm sayısını getirir.
 *
 * ÇÖZÜLEN HATA (2026-09-07): bu fonksiyon eskiden `book_sections`'tan her
 * satırı çekip istemcide sayıyordu. PostgREST varsayılan olarak en fazla
 * 1000 satır döndürüyor; katalog 1.709 bölüme ulaşınca sorgu sessizce
 * kesildi ve listenin sonundaki kitaplar kullanıcıya "0 bölüm" gösterdi.
 * Hiçbir yerde hata görünmüyordu çünkü teknik olarak hata yoktu — sadece
 * eksik veri vardı.
 *
 * Sayım artık veritabanında yapılıyor (migration 025): dönen satır sayısı
 * kitap sayısı kadar, bölüm sayısı kadar değil.
 */
export async function fetchChapterCounts(bookIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (bookIds.length === 0) return counts;

  const { data, error } = await supabase.rpc("book_section_counts", {
    book_ids: bookIds,
  });

  if (error) throw error;

  // `.returns<T[]>()` RPC üzerinde çalışmıyor; sonuç elle daraltılıyor.
  const rows = (Array.isArray(data) ? data : []) as RawCountRow[];
  for (const row of rows) {
    counts.set(row.book_id, row.section_count);
  }

  return counts;
}
