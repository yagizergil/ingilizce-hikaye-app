import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export const subscriptionQueryKeys = {
  all: ["subscription"] as const,
  status: () => [...subscriptionQueryKeys.all, "status"] as const,
  offerings: () => [...subscriptionQueryKeys.all, "offerings"] as const,
};

export interface SubscriptionStatus {
  isPremium: boolean;
  /** Kayıtlı kelime sayısı — defter doluluk şeridi bunu kullanıyor. */
  savedWordCount: number;
  /** Ücretsiz katmanın üst sınırı (sunucudan, migration 024). */
  savedWordLimit: number;
}

interface EntitlementRow {
  tier: string;
  expires_at: string | null;
}

/**
 * Abonelik durumu ve defter doluluğu.
 *
 * Yetki RevenueCat'ten DEĞİL sunucudan okunuyor: ücretsiz katman sınırını
 * zorlayan tetikleyici de aynı tabloya bakıyor, dolayısıyla istemcinin
 * gördüğü durumla sunucunun uyguladığı kural aynı kaynaktan geliyor.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const [entitlement, wordCount, limit] = await Promise.all([
    supabase.from("user_entitlements").select("tier, expires_at").maybeSingle<EntitlementRow>(),
    supabase.from("user_saved_words").select("id", { count: "exact", head: true }),
    supabase.rpc("free_tier_saved_word_limit"),
  ]);

  if (entitlement.error) throw entitlement.error;
  if (wordCount.error) throw wordCount.error;

  const row = entitlement.data;
  const notExpired = row?.expires_at == null || new Date(row.expires_at) > new Date();

  return {
    isPremium: row?.tier === "premium" && notExpired,
    savedWordCount: wordCount.count ?? 0,
    savedWordLimit: typeof limit.data === "number" ? limit.data : 100,
  };
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: subscriptionQueryKeys.status(),
    queryFn: fetchSubscriptionStatus,
    staleTime: 60_000,
  });
}
