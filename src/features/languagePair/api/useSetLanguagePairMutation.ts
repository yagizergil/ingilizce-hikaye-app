import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { languagePairQueryKeys } from "@/features/languagePair/api/useActiveLanguagePairQuery";
import { homeQueryKeys } from "@/features/home/api/queryKeys";

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
        void queryClient.invalidateQueries({ queryKey: languagePairQueryKeys.all });
        // Kütüphane şu an aktif hedef dile göre filtreleniyor; çift
        // değişince listenin yenilenmesi gerekiyor.
        void queryClient.invalidateQueries({ queryKey: ["library"] });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        // DENETİM BULGUSU (2026-09-20, kullanıcı bulgusu): ana sayfa
        // ("Yeni Kitaplar", tür/yazar rafları) `["library"]`den TAMAMEN
        // AYRI bir query key altında (`homeQueryKeys.extras()`) önbelleğe
        // alınıyor -- kendi içinde `queryClient.ensureQueryData` ile
        // kitaplık önbelleğini paylaşsa da, bu SADECE ensureQueryData'nın
        // KENDİSİ çağrıldığında işe yarıyor; `homeQueryKeys.extras()`in
        // kendisi ayrıca invalidate edilmediği sürece TanStack bu query'i
        // yeniden ÇALIŞTIRMIYOR. Sonuç: dil çifti değiştirilince kitaplık
        // sekmesi doğru dille güncelleniyordu ama ana sayfa eski dilin
        // kitaplarını göstermeye devam ediyordu -- uygulama tamamen kapatılıp
        // yeniden açılana kadar (yeni bir QueryClient/mount ile).
        void queryClient.invalidateQueries({ queryKey: homeQueryKeys.all });
      }
    },
  });
}
