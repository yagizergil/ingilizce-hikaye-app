import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Bir kitabın stüdyo seslendirmesine erişim durumu.
 *
 * NEDEN KİTAP DETAYINDA, READER'DA DEĞİL: erişim kararının kullanıcıya
 * gösterildiği ve ücretsiz hakkın harcandığı yer okuma akışının DIŞINDA
 * olmak zorunda (Ürün İlkesi #1 — reader içinde premium promosyonu yok).
 * Reader tarafında hiçbir kilit görünmüyor; erişim yoksa sessizce cihaz
 * sesine düşüyor.
 */
export interface BookAudioAccess {
  /** Bu kitabın sesi bu kullanıcıya açık mı (premium ya da ücretsiz hak). */
  canPlay: boolean;
  /** Ücretsiz hak hangi kitaba bağlı; hiç kullanılmadıysa null. */
  tasterBookId: string | null;
}

export const bookAudioAccessKeys = {
  all: ["bookAudioAccess"] as const,
  forBook: (bookId: string) => [...bookAudioAccessKeys.all, bookId] as const,
};

async function fetchBookAudioAccess(bookId: string): Promise<BookAudioAccess> {
  const [access, grant] = await Promise.all([
    supabase.rpc("can_play_book_audio", { p_book_id: bookId }),
    supabase.from("audio_taster_grants").select("book_id").maybeSingle<{ book_id: string }>(),
  ]);

  if (access.error) throw access.error;
  if (grant.error) throw grant.error;

  return {
    canPlay: access.data === true,
    tasterBookId: grant.data?.book_id ?? null,
  };
}

export function useBookAudioAccessQuery(bookId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: bookAudioAccessKeys.forBook(bookId ?? ""),
    enabled: Boolean(bookId) && enabled,
    queryFn: () => fetchBookAudioAccess(bookId as string),
    staleTime: 60_000,
  });
}

/**
 * Ücretsiz hakkı bu kitaba bağlar.
 *
 * Sunucu idempotent: hak zaten kullanılmışsa yenisini VERMEZ, mevcut kitabı
 * döndürür (migration 031). Sınır uygulama kodunda değil şemada — tablonun
 * birincil anahtarı `user_id`, ikinci satır oluşamıyor.
 */
export function useClaimAudioTasterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("claim_audio_taster", { p_book_id: bookId });
      if (error) throw error;
      return typeof data === "string" ? data : null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookAudioAccessKeys.all });
      // İmzalı bağlantı sorgusu da tazelenmeli: kilit az önce açıldı.
      void queryClient.invalidateQueries({ queryKey: ["reader", "signedAudio"] });
    },
  });
}
