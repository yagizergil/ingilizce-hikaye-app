import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { profileQueryKeys } from "@/features/profile/api/queryKeys";

import type { SubscriptionTier } from "@/features/profile/types";

interface EntitlementRow {
  tier: string;
}

/**
 * `user_entitlements` — one row per user, `tier` defaults to `'free'` at
 * signup and is only ever written by the RevenueCat webhook Edge Function
 * (service_role), per ADR-005 and
 * supabase/migrations/20260805084609_002_user.sql. The client only ever
 * selects its own row (RLS: `user_entitlements_select_own`).
 *
 * A missing row (e.g. a brand-new anonymous user the bootstrap trigger
 * hasn't caught up with yet) is treated as `'free'`, matching the column
 * default — not an error state.
 */
export async function fetchSubscriptionTier(): Promise<SubscriptionTier> {
  const { data, error } = await supabase.from("user_entitlements").select("tier").maybeSingle<EntitlementRow>();

  if (error) {
    throw error;
  }

  return (data?.tier as SubscriptionTier | undefined) ?? "free";
}

export function useSubscriptionStatusQuery() {
  return useQuery({
    queryKey: profileQueryKeys.subscription(),
    queryFn: fetchSubscriptionTier,
  });
}
