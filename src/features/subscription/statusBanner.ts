import { daysUntil, isTrialLastDay } from "@/features/subscription/lifecycle";

import type { SubscriptionLifecycle } from "@/features/subscription/lifecycle";

/** Bitişe bu kadar gün kala iptal edilmiş aboneye kart gösterilir (C9). */
export const ENDING_BANNER_DAYS = 3;

export type StatusBanner =
  | { kind: "grace"; date: Date | null }
  | { kind: "billing_retry" }
  | { kind: "ending"; date: Date; days: number }
  | { kind: "trial_last_day"; date: Date }
  | null;

/**
 * Ana sayfada (okuyucu DIŞINDA) hangi abonelik kartının görüneceği.
 * Öncelik: ödeme sorunu > bitmek üzere olan iptal edilmiş abonelik >
 * denemenin son günü. Hiçbiri satış değil; hepsi kullanıcının parasıyla
 * ilgili bir bilgi.
 */
export function statusBannerFor(lifecycle: SubscriptionLifecycle | null, now: Date): StatusBanner {
  if (!lifecycle) return null;
  if (lifecycle.status === "grace") return { kind: "grace", date: lifecycle.graceEndsAt };
  if (lifecycle.status === "billing_retry") return { kind: "billing_retry" };
  if (lifecycle.status === "cancelled" && lifecycle.expiresAt) {
    const days = daysUntil(lifecycle.expiresAt, now);
    if (days !== null && days <= ENDING_BANNER_DAYS) {
      return { kind: "ending", date: lifecycle.expiresAt, days };
    }
  }
  if (isTrialLastDay(lifecycle, now) && lifecycle.expiresAt) {
    return { kind: "trial_last_day", date: lifecycle.expiresAt };
  }
  return null;
}
