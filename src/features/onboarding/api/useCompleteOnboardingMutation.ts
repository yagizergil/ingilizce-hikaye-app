import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

interface CompleteOnboardingInput {
  /** Kullanıcının okumaya başlayacağı seviye. */
  targetLevel: CefrLevel;
  /**
   * Testten çıkan tahmin. Kullanıcı test yapmadan geçtiyse null — profil
   * yine tamamlanmış sayılır, sadece ölçüm kaydı yazılmaz.
   */
  estimate: { size: number; level: CefrLevel } | null;
  /** Kullanıcı sonucu elle değiştirdi mi (ölçümün güvenilirliği için). */
  adjusted: boolean;
  /**
   * Onboarding'deki günlük hedef adımında seçilen dakika.
   *
   * İSTEĞE BAĞLI çünkü bu mutasyonun diğer çağıranı (`LevelTestScreen`)
   * hedefi sormuyor -- verilmezse `profiles.daily_goal_minutes` kendi
   * varsayılanında kalıyor, üzerine null yazılmıyor.
   */
  dailyGoalMinutes?: number;
}

/**
 * Onboarding'i tamamlar: seviye tercihini profile, ölçümü ayrı bir tabloya
 * yazar.
 *
 * İkisi ayrı bilerek: `profiles.target_level` kullanıcının TERCİHİ (istediği
 * zaman değiştirebilir), `user_vocabulary_estimate` ise bir ÖLÇÜM kaydı
 * (zaman içinde birikir, ilerleme grafiği buradan çıkacak).
 */
async function completeOnboarding({
  targetLevel,
  estimate,
  adjusted,
  dailyGoalMinutes,
}: CompleteOnboardingInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");
  const userId = userData.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      target_level: targetLevel,
      onboarding_completed_at: new Date().toISOString(),
      // Seçilmediyse alan hiç gönderilmiyor -- mevcut değerin üzerine
      // null yazmak, hatırlatma bildirimlerini (ADR-010) bozardı.
      ...(dailyGoalMinutes !== undefined ? { daily_goal_minutes: dailyGoalMinutes } : {}),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  if (estimate) {
    const { error: estimateError } = await supabase.from("user_vocabulary_estimate").insert({
      user_id: userId,
      estimated_size: estimate.size,
      cefr_level: estimate.level,
      // Yöntem etiketi: ileride puanlama değişirse eski ölçümler ayırt
      // edilebilsin. Bkz. levelEstimate.ts başlığı.
      method: adjusted ? "yes_no_v1_adjusted" : "yes_no_v1",
    });
    if (estimateError) throw estimateError;
  }
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (_data, variables) => {
      trackEvent("onboarding_completed", {
        target_level: variables.targetLevel,
        estimated_size: variables.estimate?.size ?? -1,
        adjusted: variables.adjusted,
        skipped_test: variables.estimate === null,
      });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}
