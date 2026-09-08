import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Bir kitabın stüdyo seslendirmesine erişim durumu.
 *
 * NEDEN KİTAP DETAYINDA, READER'DA DEĞİL: premium teklifinin gösterildiği
 * yer okuma akışının DIŞINDA olmak zorunda (Ürün İlkesi #1). Reader'da
 * kilit ikonu ya da "yükselt" düğmesi yok; erişim yoksa seslendirme düğmesi
 * hiç görünmüyor.
 *
 * NEDEN SUNUCUYA SORULUYOR: kural `can_play_book_audio()` içinde ve tek
 * kopyası orada (migration 032). İstemcide "premium mi" diye ikinci bir
 * kontrol yazmak, iki kopyanın zamanla ayrışması demek — ayrıştığında da
 * kullanıcı ya ödediğini göremez ya da ödemediğini dinler.
 */
export interface BookAudioAccess {
  /** Bu kitabın stüdyo sesi bu kullanıcıya açık mı (aktif premium). */
  canPlay: boolean;
}

export const bookAudioAccessKeys = {
  all: ["bookAudioAccess"] as const,
  forBook: (bookId: string) => [...bookAudioAccessKeys.all, bookId] as const,
};

async function fetchBookAudioAccess(bookId: string): Promise<BookAudioAccess> {
  const { data, error } = await supabase.rpc("can_play_book_audio", { p_book_id: bookId });
  if (error) throw error;
  return { canPlay: data === true };
}

export function useBookAudioAccessQuery(bookId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: bookAudioAccessKeys.forBook(bookId ?? ""),
    enabled: Boolean(bookId) && enabled,
    queryFn: () => fetchBookAudioAccess(bookId as string),
    staleTime: 60_000,
  });
}
