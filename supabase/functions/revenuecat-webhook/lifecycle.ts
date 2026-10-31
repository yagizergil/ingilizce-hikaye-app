// RevenueCat olayı -> abonelik yaşam döngüsü yaması (migration 100).
//
// SAF MODÜL: Deno ya da Supabase importu YOK, Jest de import edebiliyor
// (src/features/subscription/__tests__/webhookLifecycle.test.ts).
//
// YETKİYE DOKUNMAZ: tier / expires_at kararı index.ts'te ve
// apply_entitlement_event()'te (ADR-009). Burası yalnızca "ödeme sorunu
// var mı, yenilenecek mi, ne zaman ve neden bitti, deneme/ödeme geçmişi"
// bilgisini üretiyor. Hiçbir kapı bu alanlara bakmıyor.

export interface LifecycleEventInput {
  type?: string;
  period_type?: string;
  event_timestamp_ms?: number | null;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string | null;
  expiration_reason?: string | null;
}

/**
 * apply_subscription_lifecycle(p_patch) gövdesi. Anahtar varsa yazılır,
 * değeri null ise temizlenir; olmayan anahtar dokunulmadan kalır.
 */
export type LifecyclePatch = Partial<{
  will_renew: boolean;
  billing_issue_at: string | null;
  grace_expires_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  expired_at: string | null;
  expiration_reason: string | null;
  period_type: string | null;
  trial_used: boolean;
  had_paid: boolean;
}>;

function iso(ms: number | null | undefined): string | null {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Ödeme sorunu ve iptal izlerini temizleyen ortak parça (sağlıklı yenileme). */
const HEALTHY: LifecyclePatch = {
  will_renew: true,
  billing_issue_at: null,
  grace_expires_at: null,
  cancelled_at: null,
  cancel_reason: null,
  expired_at: null,
  expiration_reason: null,
};

/**
 * Olayın yaşam döngüsü yaması; ilgisiz olaylarda null (çağrı yapılmaz).
 *
 * `now` yalnızca olay zaman damgası yoksa kullanılıyor (testte sabit).
 */
export function lifecyclePatchFor(event: LifecycleEventInput, now: number): LifecyclePatch | null {
  const type = event.type ?? "";
  const at = iso(event.event_timestamp_ms ?? now);
  const periodType = event.period_type ?? null;
  const isTrial = periodType === "TRIAL";

  switch (type) {
    case "INITIAL_PURCHASE":
      return {
        ...HEALTHY,
        period_type: periodType,
        ...(isTrial ? { trial_used: true } : { had_paid: true }),
      };
    case "RENEWAL":
      // Yenileme bir tahsilattır (denemeden ücretliye geçiş dahil).
      return { ...HEALTHY, period_type: periodType, had_paid: true };
    case "UNCANCELLATION":
      return { will_renew: true, cancelled_at: null, cancel_reason: null };
    case "CANCELLATION":
      return {
        will_renew: false,
        cancelled_at: at,
        cancel_reason: event.cancel_reason ?? null,
      };
    case "BILLING_ISSUE":
      return {
        billing_issue_at: at,
        grace_expires_at: iso(event.grace_period_expiration_at_ms),
      };
    case "EXPIRATION":
    case "SUBSCRIPTION_PAUSED": {
      const reason =
        event.expiration_reason ?? (type === "SUBSCRIPTION_PAUSED" ? "SUBSCRIPTION_PAUSED" : null);
      const base: LifecyclePatch = {
        will_renew: false,
        expired_at: iso(event.expiration_at_ms) ?? at,
        expiration_reason: reason,
        grace_expires_at: null,
        ...(isTrial ? { trial_used: true } : {}),
      };
      // Ödeme hatasıyla bittiyse Apple tahsilatı 60 güne kadar yeniden
      // dener; "ödemeyi düzelt" izi KORUNUR (billing_issue_at dokunulmaz).
      if (reason === "BILLING_ERROR") return base;
      return { ...base, billing_issue_at: null };
    }
    case "NON_RENEWING_PURCHASE":
      return { will_renew: false, had_paid: true };
    default:
      return null;
  }
}
