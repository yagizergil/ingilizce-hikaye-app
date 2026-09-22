import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { languagePairQueryKeys } from "@/features/languagePair/api/useActiveLanguagePairQuery";

export type SetLanguagePairResult = "ok" | "premium_required";

/**
 * Dil çifti seçer/değiştirir -- tek yazar `public.set_language_pair()`
 * (migration 033). Kural ORADA: ilk çift ücretsiz, sonraki her YENİ çift
 * premium gerektiriyor, mevcut çiftler arasında geçiş her zaman ücretsiz.
 * Bu hook kuralı TEKRARLAMIYOR, yalnızca çağırıp sonucu yorumluyor.
 */
export function useSetLanguagePairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pair: {
      nativeLanguage: string;
      targetLanguage: string;
    }): Promise<SetLanguagePairResult> => {
      const { data, error } = await supabase.rpc("set_language_pair", {
        p_native: pair.nativeLanguage,
        p_target: pair.targetLanguage,
      });

      if (error) throw error;
      return data as SetLanguagePairResult;
    },
    onSuccess: (result, pair) => {
      trackEvent("language_pair_selected", {
        native: pair.nativeLanguage,
        target: pair.targetLanguage,
        result,
      });

      if (result === "ok") {
        /**
         * DENETİM BULGUSU (2026-09-22, kullanıcı bulgusu -- İKİNCİ TUR):
         * bir önceki düzeltme (2026-09-20) burada `["library"]` ve
         * `homeQueryKeys.all`'ı elle invalidate ediyordu, ama bu SEMPTOMU
         * tedavi ediyordu: kitap listesi önbellekleri (`libraryQueryKeys.
         * books()`, `homeQueryKeys.extras()` vb.) aktif dil çiftinden
         * TAMAMEN BAĞIMSIZ, SABİT anahtarlar taşıyordu -- yani "hangi
         * dilin kitapları önbellekte duruyor" bilgisi anahtarın DIŞINDAYDI.
         * En az bir tüketici (`useLibraryBooksQuery`) bu elle-invalidate
         * listesine hiç girmemişti ve kullanıcı hâlâ eski dilin kitaplarını
         * görmeye devam ediyordu.
         *
         * Kök düzeltme `src/features/library/api/queryKeys.ts` ve
         * `src/features/home/api/queryKeys.ts`te: kitap listesine bağımlı
         * HER sorgu artık `useActiveLanguagePairQuery()`den okuduğu hedef
         * dili kendi anahtarının bir PARÇASI yapıyor. Böylece bu mutation
         * yalnızca `languagePairQueryKeys.all`ı invalidate etmesi yeterli
         * -- `useActiveLanguagePairQuery` yeni dille yeniden çekilince
         * ondan türeyen HER kitap sorgusu doğal olarak FARKLI (ve o dil
         * için önbellekte hiç olmayan) bir anahtara düşüyor, kendiliğinden
         * taze veri çekiyor. Elle hatırlanması gereken bir invalidate
         * listesi artık yok.
         */
        void queryClient.invalidateQueries({ queryKey: languagePairQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    },
  });
}
