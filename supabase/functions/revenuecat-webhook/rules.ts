// revenuecat-webhook'un SAF karar kuralları.
//
// NEDEN AYRI DOSYA: Deno'ya ya da Supabase istemcisine bağlı olmayan
// kurallar burada; böylece jest'te test edilebiliyorlar (translate-lemma'nın
// prompt.ts'i ile aynı desen -- src/features/paywall/__tests__/
// revenuecatWebhookRules.test.ts). index.ts yalnızca HTTP, sır doğrulama ve
// veritabanı çağrısını yapıyor.

/** Uygulamanın RevenueCat'teki yetki adı — src/lib/revenuecat.ts ile aynı. */
export const PREMIUM_ENTITLEMENT = "premium";

/**
 * Yetkiyi KESİN olarak kaldıran olaylar.
 *
 * CANCELLATION bilerek burada DEĞİL: kullanıcı iptal ettiğinde erişim
 * dönem sonuna kadar sürer. Erişimi orada kesmek, parasını ödediği süreyi
 * kullanıcıdan almak olurdu. Gerçek kesme EXPIRATION ile gelir.
 *
 * BILLING_ISSUE de burada değil: RevenueCat ödeme sorununda önce bir ek
 * süre (grace period) tanır ve süre gerçekten dolduğunda EXPIRATION
 * gönderir.
 */
export const REVOKING_EVENTS = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"]);

/** Hiçbir yetki değişikliği anlamına gelmeyen, yalnızca bilgilendirici olaylar. */
export const IGNORED_EVENTS = new Set([
  "TEST",
  "SUBSCRIBER_ALIAS",
  "SUBSCRIPTION_EXTENDED",
  "INVOICE_ISSUANCE",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

export interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string;
  store?: string;
  environment?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number | null;
  transferred_to?: string[];
  transferred_from?: string[];
  // Yaşam döngüsü alanları (migration 100, bkz. lifecycle.ts).
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string | null;
  expiration_reason?: string | null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuids(list: string[] | undefined): string[] {
  return (list ?? [])
    .filter((v) => typeof v === "string" && UUID_RE.test(v))
    .map((v) => v.toLowerCase());
}

/**
 * Sabit zamanlı string karşılaştırma.
 *
 * Erken çıkan bir `===` karşılaştırması, sırrın ilk karakterlerini zaman
 * ölçerek tahmin etmeye izin verir. Sır uzun ve rastgele olsa bile doğru
 * olan bunu baştan engellemektir.
 */
export function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * RevenueCat kullanıcı kimliğinden Supabase kullanıcı kimliğini çıkarır.
 *
 * `configurePurchases()` SDK'yı Supabase kullanıcı kimliğiyle yapılandırır,
 * yani normal durumda `app_user_id` doğrudan bir uuid'dir. Ama SDK, oturum
 * açılmadan önce yapılandırıldıysa RevenueCat kendi anonim kimliğini
 * ("$RCAnonymousID:...") üretir ve gerçek kimlik sonradan `logIn()` ile
 * takma ad (alias) olarak eklenir. Bu yüzden takma adlara da bakılır.
 */
export function resolveUserId(event: RevenueCatEvent): string | null {
  const candidates = [
    // TRANSFER olayında yetkinin YENİ sahibi burada gelir.
    ...(event.transferred_to ?? []),
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && UUID_RE.test(candidate)) {
      return candidate.toLowerCase();
    }
  }
  return null;
}

/** Olayın premium yetkisiyle ilgili olup olmadığı. */
export function touchesPremium(event: RevenueCatEvent): boolean {
  const ids = event.entitlement_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.includes(PREMIUM_ENTITLEMENT);
  }
  if (typeof event.entitlement_id === "string") {
    return event.entitlement_id === PREMIUM_ENTITLEMENT;
  }
  // RevenueCat bazı olaylarda yetki alanı göndermez (örn. tek ürünlü
  // uygulamalarda). Tek yetkimiz premium olduğu için olayı ona ait sayıyoruz.
  return true;
}

export type RevenueCatEnvironment = "PRODUCTION" | "SANDBOX";

/**
 * Olayın ortamı. Bilinmeyen/eksik değer null: SQL tarafı (migration 060)
 * null'ı "ortamı bilinmiyor" sayar ve sandbox korumasını uygulamaz --
 * bilinmeyen bir değeri SANDBOX diye işaretleyip gerçek bir ödemeyi
 * düşürmek, yanlışlıkla PRODUCTION demekten daha kötü olurdu.
 */
export function normalizeEnvironment(value: unknown): RevenueCatEnvironment | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return upper === "PRODUCTION" || upper === "SANDBOX" ? upper : null;
}

/** Olay zamanı (ms); yoksa ya da sayı değilse null. */
export function eventTimestampMs(event: RevenueCatEvent): number | null {
  const ms = event.event_timestamp_ms;
  return typeof ms === "number" && Number.isFinite(ms) ? ms : null;
}

export type EntitlementDecision =
  | { action: "apply"; tier: "free" | "premium"; expiresAtMs: number | null }
  | { action: "ignore"; reason: "no_expiration" };

/**
 * Genel yol (TRANSFER dışı) için ne yazılacağı.
 *
 * - EXPIRATION / SUBSCRIPTION_PAUSED -> free.
 * - Bitişi geçmişte kalmış bir olay (geç teslim edilmiş yenileme) -> free:
 *   süresi dolmuş bir dönemin olayı yetki vermemeli.
 * - Bitişi olmayan premium olay YAZILMAZ: süresiz ürün satmıyoruz ve
 *   `has_active_premium()` null bitişi süresiz sayıyor (canlı v5 dersi).
 */
export function decideEntitlementWrite(event: RevenueCatEvent, nowMs: number): EntitlementDecision {
  const type = typeof event.type === "string" ? event.type : "UNKNOWN";
  const expirationMs =
    typeof event.expiration_at_ms === "number" && Number.isFinite(event.expiration_at_ms)
      ? event.expiration_at_ms
      : null;

  const expired = expirationMs !== null && expirationMs <= nowMs;
  const tier = REVOKING_EVENTS.has(type) || expired ? "free" : "premium";

  if (tier === "premium" && expirationMs === null) {
    return { action: "ignore", reason: "no_expiration" };
  }
  return { action: "apply", tier, expiresAtMs: expirationMs };
}
