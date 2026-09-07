import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

export interface OnboardingStatus {
  /** Kullanıcı onboarding'i tamamladı mı. */
  completed: boolean;
  /** Seçtiği okuma seviyesi; henüz seçmediyse null. */
  targetLevel: CefrLevel | null;
}

interface ProfileRow {
  target_level: string | null;
  onboarding_completed_at: string | null;
}

/**
 * Onboarding'in gösterilip gösterilmeyeceğini belirler.
 *
 * Profil satırı hiç yoksa (yeni anonim kullanıcı) onboarding gösterilir.
 * Sorgu hata verirse `completed: true` dönülüyor — ağ sorunu yüzünden
 * mevcut kullanıcıyı tekrar teste sokmak, testi hiç göstermemekten çok
 * daha kötü bir deneyim.
 */
export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { completed: true, targetLevel: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("target_level, onboarding_completed_at")
    .eq("id", userData.user.id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  return {
    completed: data?.onboarding_completed_at != null,
    targetLevel: (data?.target_level as CefrLevel | null) ?? null,
  };
}

export function useOnboardingStatusQuery() {
  return useQuery({
    queryKey: ["onboarding", "status"],
    queryFn: fetchOnboardingStatus,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
