import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchCustomerInfo, readCustomerLifecycle } from "@/lib/revenuecat";
import { subscriptionQueryKeys } from "@/features/paywall";

import { deriveLifecycle } from "@/features/subscription/lifecycle";

import type {
  EntitlementLifecycleRow,
  SubscriptionLifecycle,
} from "@/features/subscription/lifecycle";

/** Anahtar `subscription` altında: satın alma sonrası tam geçersiz kılma onu da kapsar. */
export const lifecycleQueryKey = [...subscriptionQueryKeys.all, "lifecycle"] as const;

const BASE_COLUMNS = "tier, expires_at, is_trial, product_id";
const LIFECYCLE_COLUMNS =
  `${BASE_COLUMNS}, will_renew, billing_issue_at, grace_expires_at, expired_at, ` +
  "expiration_reason, trial_used, had_paid";

/** Postgres "undefined_column": migration 100 bu veritabanında henüz yok. */
const UNDEFINED_COLUMN = "42703";

/**
 * Yetki satırını yaşam döngüsü sütunlarıyla okur.
 *
 * Migration 100 uygulanmadan yeni uygulama yayına çıkarsa sütunlar yok;
 * o zaman temel sütunlara düşülüyor -- yaşam döngüsü kısmen (StoreKit
 * görüntüsüyle) çalışır, hiçbir premium kapısı etkilenmez (bu sorgu kapı
 * değil, `useSubscriptionQuery` kapı).
 */
async function fetchLifecycleRow(): Promise<EntitlementLifecycleRow | null> {
  const full = await supabase
    .from("user_entitlements")
    .select(LIFECYCLE_COLUMNS)
    .maybeSingle<EntitlementLifecycleRow>();
  if (!full.error) return full.data;
  if (full.error.code !== UNDEFINED_COLUMN) throw full.error;

  const basic = await supabase
    .from("user_entitlements")
    .select(BASE_COLUMNS)
    .maybeSingle<EntitlementLifecycleRow>();
  if (basic.error) throw basic.error;
  return basic.data;
}

export async function fetchSubscriptionLifecycle(): Promise<SubscriptionLifecycle> {
  const [row, info] = await Promise.all([fetchLifecycleRow(), fetchCustomerInfo()]);
  return deriveLifecycle(row, readCustomerLifecycle(info), new Date());
}

/**
 * Abonelik yaşam döngüsü (ödeme sorunu, iptal, bitiş). Premium KAPISI
 * DEĞİL -- kapı `useSubscriptionQuery().isPremium`; bu sorgu aynı kuralı
 * kullanıyor ama yalnızca durum ekranları ve banner'lar için.
 */
export function useSubscriptionLifecycleQuery() {
  return useQuery({
    queryKey: lifecycleQueryKey,
    queryFn: fetchSubscriptionLifecycle,
    staleTime: 60_000,
  });
}
