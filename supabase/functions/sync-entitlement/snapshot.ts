// sync-entitlement'ın SAF kuralı: RevenueCat abone kaydından ne yazılacağı.
//
// Ayrı dosya, jest'te test edilebilsin diye (src/features/paywall/__tests__/
// syncEntitlementSnapshot.test.ts). index.ts yalnızca kimlik doğrulama, HTTP
// ve veritabanı çağrısını yapıyor.

/** Uygulamanın RevenueCat'teki yetki adı — src/lib/revenuecat.ts ile aynı. */
export const PREMIUM_ENTITLEMENT = "premium";

export interface RcEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
}

export interface RcSubscription {
  store?: string | null;
  period_type?: string | null;
  expires_date?: string | null;
  purchase_date?: string | null;
  is_sandbox?: boolean | null;
}

export interface RcSubscriber {
  entitlements?: Record<string, RcEntitlement>;
  subscriptions?: Record<string, RcSubscription>;
}

export type EntitlementSnapshot =
  /** Aktif premium yok: HİÇBİR ŞEY yazılmaz ("yalnızca verir, asla almaz"). */
  | { kind: "none" }
  /**
   * Premium aktif görünüyor ama bitiş tarihi yok. Süresiz ürün satmıyoruz;
   * yazmak `has_active_premium()`'da ömür boyu premium demek olurdu (G3 --
   * webhook'un "süresiz yok" kuralıyla aynı). Yazılmaz, loglanır.
   */
  | { kind: "no_expiration"; productId: string | null }
  | {
      kind: "active";
      expiresAt: string;
      productId: string | null;
      store: string | null;
      isTrial: boolean;
      environment: "PRODUCTION" | "SANDBOX" | null;
      /**
       * Bu durumun RevenueCat'teki zamanı (ms): yetkiyi doğuran son
       * satın alma/yenileme. `apply_entitlement_event` sıra kontrolünde
       * bunu kullanıyor.
       */
      eventMs: number;
    };

function parseMs(raw: string | null | undefined): number | null {
  if (typeof raw !== "string") return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * NEDEN `Date.now()` DEĞİL (G3, mevcut durum raporu): eskiden olay zamanı
 * onarım anıydı. Bu, sıra kontrolünü sunucu saatine kaydırıyordu: onarımdan
 * ÖNCE üretilmiş ama SONRA teslim edilmiş gerçek bir olay (ör. iade sonrası
 * EXPIRATION) `stale` sayılıp yutuluyordu. Doğru zaman, bu yetkiyi doğuran
 * satın almanın/yenilemenin zamanı: ondan sonra üretilen her gerçek olay
 * daha büyük bir zaman damgası taşır ve uygulanır.
 *
 * Satın alma zamanı yoksa (beklenmez) onarım anına düşülüyor -- eski
 * davranış; ileri tarihli bir değer de onarım anıyla sınırlanıyor.
 */
export function entitlementSnapshot(subscriber: RcSubscriber, nowMs: number): EntitlementSnapshot {
  const entitlement = subscriber.entitlements?.[PREMIUM_ENTITLEMENT];
  if (!entitlement) return { kind: "none" };

  const productId = entitlement.product_identifier ?? null;
  const expiresMs = parseMs(entitlement.expires_date);

  if (entitlement.expires_date === null || entitlement.expires_date === undefined) {
    return { kind: "no_expiration", productId };
  }
  if (expiresMs === null || expiresMs <= nowMs) return { kind: "none" };

  const subscription = productId ? subscriber.subscriptions?.[productId] : undefined;
  const purchaseMs = parseMs(entitlement.purchase_date) ?? parseMs(subscription?.purchase_date);

  let environment: "PRODUCTION" | "SANDBOX" | null = null;
  if (subscription?.is_sandbox === true) environment = "SANDBOX";
  else if (subscription?.is_sandbox === false) environment = "PRODUCTION";

  return {
    kind: "active",
    // Ham değer: olay kimliği (syncEventId) önceki sürümün ürettiğiyle aynı kalsın.
    expiresAt: entitlement.expires_date,
    productId,
    store: subscription?.store ?? null,
    isTrial: subscription?.period_type === "trial",
    environment,
    eventMs: purchaseMs !== null ? Math.min(purchaseMs, nowMs) : nowMs,
  };
}

/**
 * Olay kimliği DURUMDAN türetiliyor: aynı durum ikinci kez senkronlanırsa
 * `apply_entitlement_event` bunu 'duplicate' görüp hiçbir şey yazmıyor.
 */
export function syncEventId(
  userId: string,
  snapshot: Extract<EntitlementSnapshot, { kind: "active" }>,
): string {
  return `sync:${userId}:${snapshot.productId ?? "?"}:${snapshot.expiresAt}`;
}
