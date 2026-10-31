import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { isMissingFunctionError } from "@/features/library/api/audioAccessRules";

import type { BookAudioAccess } from "@/features/library/api/audioAccessRules";

export type { BookAudioAccess } from "@/features/library/api/audioAccessRules";

/**
 * Bir kitabın stüdyo seslendirmesine erişim durumu.
 *
 * NEDEN KİTAP DETAYINDA: premium teklifinin gösterildiği yer okuma akışının
 * DIŞINDA olmak zorunda (Ürün İlkesi #1). Okuyucu bu sorguyu yalnızca dinle
 * yuvarlağının kilit rozetine karar vermek için okuyor (aynı önbellek).
 *
 * NEDEN SUNUCUYA SORULUYOR: "tam erişim" kuralı `can_play_book_audio()`
 * (migration 032), "ücretsiz bölüm hangisi" tanımı `free_audio_section_id()`
 * (migration 110) içinde ve tek kopyaları orada. İstemcide ikinci bir kopya
 * yazmak, iki kopyanın zamanla ayrışması demek.
 */
export const bookAudioAccessKeys = {
  all: ["bookAudioAccess"] as const,
  forBook: (bookId: string) => [...bookAudioAccessKeys.all, bookId] as const,
};

async function fetchFreeAudioSectionId(bookId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("free_audio_section_id", { p_book_id: bookId });
  if (error) {
    // Migration 110 canlıda değilse eski davranış: ücretsiz bölüm yok.
    if (isMissingFunctionError(error)) return null;
    throw error;
  }
  return typeof data === "string" && data.length > 0 ? data : null;
}

async function fetchBookAudioAccess(bookId: string): Promise<BookAudioAccess> {
  const [full, freeSectionId] = await Promise.all([
    supabase.rpc("can_play_book_audio", { p_book_id: bookId }),
    fetchFreeAudioSectionId(bookId),
  ]);
  if (full.error) throw full.error;
  return { canPlay: full.data === true, freeSectionId };
}

export function useBookAudioAccessQuery(bookId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: bookAudioAccessKeys.forBook(bookId ?? ""),
    enabled: Boolean(bookId) && enabled,
    queryFn: () => fetchBookAudioAccess(bookId as string),
    staleTime: 60_000,
  });
}
