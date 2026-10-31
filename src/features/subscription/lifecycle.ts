import type { CustomerLifecycleSnapshot } from "@/lib/revenuecat";

/**
 * Abonelik yaşam döngüsünün SAF mantığı (C9-C12).
 *
 * TEK YETKİ KAYNAĞI KORUNUYOR (ADR-009): `isPremium` burada da sunucudaki
 * `user_entitlements` satırından, `fetchSubscriptionStatus` ile AYNI kuralla
 * (tier premium ve süresi dolmamış) hesaplanıyor. RevenueCat CustomerInfo
 * hiçbir zaman premium AÇMAZ ya da KAPATMAZ; yalnızca sunucunun henüz
 * bilmediği BİLGİ alanlarını (ödeme sorunu, otomatik yenileme) tamamlıyor --
 * webhook birkaç saniye ile dakikalar arası gecikebiliyor, CustomerInfo
 * StoreKit'ten taze geliyor.
 */

/** `user_entitlements` satırının yaşam döngüsü için okunan sütunları. */
export interface EntitlementLifecycleRow {
  tier: string;
  expires_at: string | null;
  is_trial?: boolean | null;
  product_id?: string | null;
  // Migration 100 (henüz uygulanmamışsa hepsi undefined).
  will_renew?: boolean | null;
  billing_issue_at?: string | null;
  grace_expires_at?: string | null;
  expired_at?: string | null;
  expiration_reason?: string | null;
  trial_used?: boolean | null;
  had_paid?: boolean | null;
}

export type LifecycleStatus =
  /** Hiç abone olmamış. */
  | "none"
  /** Ücretsiz denemede, yenileme açık. */
  | "trial"
  /** Ücretli, yenileme açık. */
  | "active"
  /** Premium sürüyor ama otomatik yenileme kapalı (deneme ya da ücretli). */
  | "cancelled"
  /** Premium sürüyor, ödeme alınamadı (grace period). */
  | "grace"
  /** Premium kesildi, Apple tahsilatı yeniden deniyor (billing retry). */
  | "billing_retry"
  /** Ödemiş, sonra bitmiş. */
  | "lapsed_paid"
  /** Yalnızca deneme kullanmış, dönüşmemiş. */
  | "lapsed_trial";

export interface SubscriptionLifecycle {
  status: LifecycleStatus;
  isPremium: boolean;
  isTrial: boolean;
  /** Yenileme / bitiş / deneme bitişi anı (premium'da). */
  expiresAt: Date | null;
  /** Grace period bitişi (biliniyorsa). */
  graceEndsAt: Date | null;
  /** Ödeme sorununun görüldüğü an. */
  billingIssueAt: Date | null;
  /** Aboneliğin bittiği an (premium değilken). */
  expiredAt: Date | null;
  productId: string | null;
}

/**
 * App Store Billing Grace Period (IZLENECEK-YOL §3.3: açık, 16 gün).
 * Webhook `grace_period_expiration_at_ms` göndermezse bitiş bu süreyle
 * TAHMİN ediliyor; yalnızca metin için, yetki kararı değil.
 */
export const GRACE_PERIOD_DAYS = 16;

/** Apple ödeme hatasında tahsilatı en fazla bu kadar yeniden dener. */
export const BILLING_RETRY_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `fetchSubscriptionStatus` ile birebir aynı premium kuralı. */
export function isPremiumRow(row: EntitlementLifecycleRow | null, now: Date): boolean {
  if (!row || row.tier !== "premium") return false;
  const expires = toDate(row.expires_at);
  return row.expires_at == null || (expires !== null && expires > now);
}

export function deriveLifecycle(
  row: EntitlementLifecycleRow | null,
  store: CustomerLifecycleSnapshot | null,
  now: Date,
): SubscriptionLifecycle {
  const isPremium = isPremiumRow(row, now);
  const expiresAt = toDate(row?.expires_at);
  const productId = row?.product_id ?? store?.productIdentifier ?? null;

  // Ödeme sorunu: StoreKit görüntüsü varsa o taze (RevenueCat sorun çözülünce
  // alanı temizliyor); yoksa sunucu.
  const billingIssueAt = store
    ? toDate(store.billingIssueDetectedAt)
    : toDate(row?.billing_issue_at ?? null);
  const willRenew = store ? store.willRenew : (row?.will_renew ?? null);
  const isTrial = Boolean(row?.is_trial) || store?.periodType === "TRIAL";

  if (isPremium) {
    const base = {
      isPremium: true,
      isTrial,
      expiresAt,
      graceEndsAt:
        toDate(row?.grace_expires_at ?? null) ??
        (billingIssueAt ? new Date(billingIssueAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS) : null),
      billingIssueAt,
      expiredAt: null,
      productId,
    };
    if (billingIssueAt) return { ...base, status: "grace" };
    if (willRenew === false) return { ...base, status: "cancelled" };
    return { ...base, status: isTrial ? "trial" : "active" };
  }

  const expiredAt = toDate(row?.expired_at ?? null) ?? (row?.tier === "free" ? expiresAt : null);
  const base = {
    isPremium: false,
    isTrial: false,
    expiresAt: null,
    graceEndsAt: null,
    billingIssueAt,
    expiredAt,
    productId,
  };

  const billingExpired = row?.expiration_reason === "BILLING_ERROR";
  const withinRetry =
    expiredAt === null || now.getTime() - expiredAt.getTime() < BILLING_RETRY_WINDOW_DAYS * DAY_MS;
  // StoreKit görüntüsü ödeme sorununu temizlediyse sunucunun BILLING_ERROR
  // izi bayattır (kullanıcı ödemeyi düzeltti, webhook henüz gelmedi).
  const storeCleared = store !== null && !store.billingIssueDetectedAt;
  const billingSignal = billingIssueAt !== null || (billingExpired && !storeCleared);
  if (billingSignal && withinRetry) return { ...base, status: "billing_retry" };

  if (row?.had_paid) return { ...base, status: "lapsed_paid" };
  if (row?.trial_used) return { ...base, status: "lapsed_trial" };

  // Migration 100 öncesi satır ya da sunucu henüz bilmiyor: son olaydan /
  // StoreKit görüntüsünden çıkar.
  const hadHistory = (row?.tier === "free" && row.product_id != null) || store !== null;
  if (!hadHistory) return { ...base, status: "none" };
  const lastWasTrial =
    row?.product_id != null ? Boolean(row.is_trial) : store?.periodType === "TRIAL";
  return { ...base, status: lastWasTrial ? "lapsed_trial" : "lapsed_paid" };
}

/** Ödeme düzeltme ekranı/banner'ı gerektiren durumlar. */
export function needsBillingFix(lifecycle: SubscriptionLifecycle | null | undefined): boolean {
  return lifecycle?.status === "grace" || lifecycle?.status === "billing_retry";
}

/** Winback (tekrar hoş geldin) adayı mı. */
export function isLapsed(lifecycle: SubscriptionLifecycle | null | undefined): boolean {
  return lifecycle?.status === "lapsed_paid" || lifecycle?.status === "lapsed_trial";
}

/**
 * Denemenin son 24 saati mi (IZLENECEK-YOL §3.2 A8: son gün ana sayfa
 * kartı, okuyucu dışında). Yalnızca yenilemesi açık denemede: iptal etmiş
 * kullanıcıya "yarın ücret alınacak" demek yanlış olurdu.
 */
export function isTrialLastDay(lifecycle: SubscriptionLifecycle | null, now: Date): boolean {
  if (lifecycle?.status !== "trial" || !lifecycle.expiresAt) return false;
  const left = lifecycle.expiresAt.getTime() - now.getTime();
  return left > 0 && left <= DAY_MS;
}

/** Bitişe kalan tam gün (yukarı yuvarlanır); geçmişse 0. */
export function daysUntil(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / DAY_MS));
}

// ---------------------------------------------------------------------------
// Kendiliğinden açılan ekranlar (oturum başına bir kez, kurallı)
// ---------------------------------------------------------------------------

/** Ödeme düzeltme ekranı en fazla bu aralıkla kendiliğinden açılır. */
export const BILLING_FIX_COOLDOWN_MS = DAY_MS;
/** Bundan eski bir bitişe winback ekranı açılmaz (normal takvim devralır). */
export const WINBACK_MAX_AGE_DAYS = 30;

export interface AutoOpenMemory {
  /** Ödeme düzeltme ekranının en son kendiliğinden açıldığı an (ms). */
  billingFixShownAt: number | null;
  /** Winback ekranının gösterildiği bitiş anahtarları (bitiş başına bir kez). */
  winbackShownFor: string[];
}

export type AutoOpen = { kind: "billing_fix" } | { kind: "winback"; key: string } | null;

/** Bir bitişin winback anahtarı: aynı bitiş için ekran yalnızca bir kez. */
export function winbackKey(lifecycle: SubscriptionLifecycle): string | null {
  return lifecycle.expiredAt ? lifecycle.expiredAt.toISOString() : null;
}

/**
 * Açılışta kendiliğinden hangi ekranın açılacağı. Öncelik ödeme düzeltmede
 * (Vocabulary §11.4: sorun varken satış değil düzeltme). Oturum başına tek
 * karar; oturum bayrağını çağıran tutuyor.
 */
export function decideAutoOpen(
  lifecycle: SubscriptionLifecycle | null,
  memory: AutoOpenMemory,
  now: number,
): AutoOpen {
  if (!lifecycle) return null;
  if (needsBillingFix(lifecycle)) {
    const last = memory.billingFixShownAt;
    if (last !== null && now - last < BILLING_FIX_COOLDOWN_MS) return null;
    return { kind: "billing_fix" };
  }
  if (isLapsed(lifecycle)) {
    const key = winbackKey(lifecycle);
    if (!key || !lifecycle.expiredAt) return null;
    const age = now - lifecycle.expiredAt.getTime();
    if (age < 0 || age > WINBACK_MAX_AGE_DAYS * DAY_MS) return null;
    if (memory.winbackShownFor.includes(key)) return null;
    return { kind: "winback", key };
  }
  return null;
}

/**
 * Ödeme sorunundan sağlıklı premium'a dönüş ("Ödeme düzeldi" bildirimi ve
 * `billing_recovered` ölçümü).
 */
export function isBillingRecovery(
  previous: LifecycleStatus | null,
  current: LifecycleStatus,
): boolean {
  return (
    (previous === "grace" || previous === "billing_retry") &&
    (current === "active" || current === "trial" || current === "cancelled")
  );
}
