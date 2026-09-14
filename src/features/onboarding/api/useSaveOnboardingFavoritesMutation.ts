import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * Onboarding'deki kitap zevki adımında beğenilen kitapları favorilere yazar.
 *
 * NEDEN YAZILIYOR: referans akış "Beğendiklerinden kütüphaneni
 * oluşturacağız" diyor. Beğenileri kaydetmeseydik bu bir söz olmaktan
 * çıkıp boşa dönen bir ankete dönerdi -- kullanıcı uygulamaya girip rafını
 * boş bulurdu.
 *
 * HATA AKIŞI TIKAMIYOR: favoriler onboarding'in tamamlanması için şart
 * değil. Yazma başarısız olursa akış devam ediyor; kullanıcı kitapları
 * kütüphaneden yine bulabiliyor. Sessizce yutulmuyor, telemetriye düşüyor.
 */
export function useSaveOnboardingFavoritesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookIds: string[]): Promise<void> => {
      if (bookIds.length === 0) return;

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("no_session");

      const rows = bookIds.map((bookId) => ({ user_id: userData.user.id, book_id: bookId }));
      // Aynı kitap iki kez beğenilemez ama upsert, akışın tekrar
      // oynatılması (geliştirici düğmesi) durumunda çakışmayı önlüyor.
      const { error } = await supabase
        .from("user_favorites")
        .upsert(rows, { onConflict: "user_id,book_id" });
      if (error) throw error;
    },
    onSuccess: (_result, bookIds) => {
      trackEvent("onboarding_favorites_saved", { count: bookIds.length });
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (error) => {
      trackEvent("onboarding_favorites_failed", { message: String(error).slice(0, 120) });
    },
  });
}
