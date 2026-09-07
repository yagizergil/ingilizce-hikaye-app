// RevenueCat webhook -> user_entitlements.
//
// NEDEN BU FONKSİYON VAR (denetim bulgusu, 2026-09-07):
//   `user_entitlements` migration 002'den beri select-only RLS ile
//   korunuyor. İstemcideki `syncEntitlementToServer()` bu yüzden hiçbir
//   zaman yazamadı; hata yutuluyor, satın alma "başarılı" görünüyor ve
//   kullanıcı ücretsiz katmanda kalıyordu. Yetkinin tek doğru yazarı
//   RevenueCat'tir ve burasıdır.
//
// GÜVENLİK:
//   - JWT doğrulaması KAPALI (config.toml: verify_jwt = false). RevenueCat
//     Supabase kullanıcısı değil, bir Authorization başlığı gönderir.
//   - Bunun yerine paylaşılan sır doğrulanır: RevenueCat panosunda
//     "Authorization header" alanına yazılan değer, burada
//     REVENUECAT_WEBHOOK_SECRET ile karşılaştırılır. Karşılaştırma sabit
//     zamanlı yapılır.
//   - Yazma service_role ile ve yalnızca `apply_entitlement_event()`
//     üzerinden yapılır (migration 028). Fonksiyon idempotans ve sıralama
//     kurallarını kendi içinde uygular.
//
// TESLİM GARANTİSİ: RevenueCat "at least once" teslim eder ve sıralama
// garanti etmez. Bu yüzden 2xx dönmek "işlendi" demektir; işlenemeyen ama
// tekrar denenmesi anlamsız olan durumlar (bilinmeyen kullanıcı, test
// olayı) da 200 döner — aksi halde RevenueCat aynı olayı günlerce yeniden
// dener ve panoda kalıcı hata birikir. Yalnızca gerçekten geçici olan
// hatalar (DB erişilemedi) 5xx döner.
import { createClient } from "jsr:@supabase/supabase-js@2";

/** Uygulamanın RevenueCat'teki yetki adı — src/lib/revenuecat.ts ile aynı. */
const PREMIUM_ENTITLEMENT = "premium";

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
const REVOKING_EVENTS = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED"]);

/** Hiçbir yetki değişikliği anlamına gelmeyen, yalnızca bilgilendirici olaylar. */
const IGNORED_EVENTS = new Set([
  "TEST",
  "SUBSCRIBER_ALIAS",
  "SUBSCRIPTION_EXTENDED",
  "INVOICE_ISSUANCE",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

interface RevenueCatEvent {
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
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Sabit zamanlı string karşılaştırma.
 *
 * Erken çıkan bir `===` karşılaştırması, sırrın ilk karakterlerini zaman
 * ölçerek tahmin etmeye izin verir. Sır uzun ve rastgele olsa bile doğru
 * olan bunu baştan engellemektir.
 */
function secretsMatch(a: string, b: string): boolean {
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
function resolveUserId(event: RevenueCatEvent): string | null {
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
function touchesPremium(event: RevenueCatEvent): boolean {
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expectedSecret) {
    // Sır tanımlanmadan fonksiyon canlıya alınmışsa, doğrulanmamış çağrıyı
    // KABUL ETMEK yerine açıkça reddet.
    console.error("revenuecat-webhook: REVENUECAT_WEBHOOK_SECRET is not set");
    return jsonResponse({ error: "not_configured" }, 500);
  }

  const provided = req.headers.get("Authorization") ?? "";
  if (!secretsMatch(provided, expectedSecret)) {
    return jsonResponse({ error: "not_authorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_body" }, 400);
  }

  const event = (payload as { event?: RevenueCatEvent })?.event;
  if (!event || typeof event !== "object") {
    return jsonResponse({ error: "invalid_body" }, 400);
  }

  const type = typeof event.type === "string" ? event.type : "UNKNOWN";

  if (IGNORED_EVENTS.has(type)) {
    console.log(`revenuecat-webhook: ignored informational event type=${type}`);
    return jsonResponse({ status: "ignored", reason: "informational_event", type }, 200);
  }

  if (!touchesPremium(event)) {
    // BU YOL SESSIZDI ve bir teshisi yavaslatti (2026-09-07): gercek bir
    // satin alma olayi 200 donduruldu ama hicbir sey yazilmadi, gunlukte
    // de iz yoktu. Ignored yollarinin da loglanmasi sart — "200 ama etki
    // yok" en zor teshis edilen durum.
    //
    // Bu satir gorunuyorsa: RevenueCat'teki entitlement kimligi tam olarak
    // "premium" degil. Asagidaki `received` alani gercekte ne geldigini
    // gosteriyor.
    const received = Array.isArray(event.entitlement_ids)
      ? event.entitlement_ids.join(",")
      : (event.entitlement_id ?? "<none>");
    console.error(
      `revenuecat-webhook: entitlement mismatch type=${type} expected="${PREMIUM_ENTITLEMENT}" received="${received}" product=${event.product_id ?? "?"}`,
    );
    return jsonResponse(
      {
        status: "ignored",
        reason: "other_entitlement",
        type,
        expected: PREMIUM_ENTITLEMENT,
        received,
      },
      200,
    );
  }

  const userId = resolveUserId(event);
  if (!userId) {
    // Anonim RevenueCat kullanıcısı: henüz bir Supabase hesabına
    // bağlanmamış. Tekrar denemek durumu değiştirmez.
    console.error(
      `revenuecat-webhook: unresolvable app_user_id type=${type} id=${event.app_user_id ?? "<none>"}`,
    );
    return jsonResponse({ status: "ignored", reason: "unresolvable_user", type }, 200);
  }

  const isRevoking = REVOKING_EVENTS.has(type);
  const expirationMs = typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : null;

  // Süresi geçmiş bir yenileme olayı da yetki vermemeli.
  const expired = expirationMs !== null && expirationMs <= Date.now();
  const tier = isRevoking || expired ? "free" : "premium";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.rpc("apply_entitlement_event", {
    p_user_id: userId,
    p_tier: tier,
    p_expires_at: expirationMs !== null ? new Date(expirationMs).toISOString() : null,
    p_product_id: event.product_id ?? null,
    p_store: event.store ?? null,
    p_event_id: event.id ?? null,
    p_event_ms: typeof event.event_timestamp_ms === "number" ? event.event_timestamp_ms : null,
    p_is_trial: event.period_type === "TRIAL",
  });

  if (error) {
    // Kullanıcı silinmişse yabancı anahtar hatası gelir; bunu tekrar
    // denemenin anlamı yok, kalıcı hata olarak 200 ile kapat.
    const isMissingUser = error.code === "23503";
    if (isMissingUser) {
      console.error(`revenuecat-webhook: user not found user_id=${userId} type=${type}`);
      return jsonResponse({ status: "ignored", reason: "unknown_user" }, 200);
    }

    // Gerçekten geçici bir hata: RevenueCat tekrar denesin.
    console.error(
      `revenuecat-webhook: apply failed user_id=${userId} type=${type} code=${error.code} message=${error.message}`,
    );
    return jsonResponse({ error: "apply_failed" }, 500);
  }

  console.log(
    `revenuecat-webhook: type=${type} user_id=${userId} tier=${tier} result=${String(data)} env=${event.environment ?? "?"}`,
  );

  return jsonResponse({ status: "ok", result: data, tier }, 200);
});
