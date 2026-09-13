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
        void queryClient.invalidateQueries({ queryKey: languagePairQueryKeys.all });
        // Kütüphane şu an aktif hedef dile göre filtreleniyor; çift
        // değişince listenin yenilenmesi gerekiyor.
        void queryClient.invalidateQueries({ queryKey: ["library"] });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    },
  });
}
