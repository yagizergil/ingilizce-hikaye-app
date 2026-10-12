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
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

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
  transferred_from?: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuids(list: string[] | undefined): string[] {
  return (list ?? [])
    .filter((v) => typeof v === "string" && UUID_RE.test(v))
    .map((v) => v.toLowerCase());
}

type AdminClient = SupabaseClient;

interface StoreEntitlement {
  expires_at: string;
  product_id: string | null;
  store: string | null;
  is_trial: boolean;
}

/**
 * Kaynak hesap yoksa (silinmiş ya da hiç satırı yok) yetkiyi doğrudan
 * RevenueCat'ten okur (REVENUECAT_API_KEY, sync-entitlement ile aynı yol).
 * Aktif ve bitiş tarihli bir premium yoksa null döner — süresiz yazılmaz.
 */
async function fetchStoreEntitlement(userId: string): Promise<StoreEntitlement | null> {
  const apiKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!apiKey) {
    console.error("revenuecat-webhook: REVENUECAT_API_KEY is not set (transfer fallback skipped)");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    if (!res.ok) {
      console.error(`revenuecat-webhook: transfer fallback http=${res.status}`);
      return null;
    }
    const payload = (await res.json()) as {
      subscriber?: {
        entitlements?: Record<
          string,
          { expires_date?: string | null; product_identifier?: string | null }
        >;
        subscriptions?: Record<string, { store?: string | null; period_type?: string | null }>;
      };
    };
    const ent = payload.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT];
    const exp = ent?.expires_date ?? null;
    if (!ent || !exp || !(Date.parse(exp) > Date.now())) return null;
    const productId = ent.product_identifier ?? null;
    const sub = productId ? payload.subscriber?.subscriptions?.[productId] : undefined;
    return {
      expires_at: exp,
      product_id: productId,
      store: sub?.store ?? null,
      is_trial: sub?.period_type === "trial",
    };
  } catch (error) {
    console.error("revenuecat-webhook: transfer fallback fetch failed", error);
    return null;
  }
}

/**
 * TRANSFER (2026-10-12 denetim bulgusu): RevenueCat satın almayı bir hesaptan
 * diğerine taşıdığında (geri yükleme, yeniden kurulum, hesap sıfırlama) olayda
 * ÜRÜN ve BİTİŞ TARİHİ YOK. Genel yol bunu `expires_at = null` ile premium
 * yazıyordu; `has_active_premium()` null'ı süresiz sayıyor, yani her transfer
 * ÖMÜR BOYU premium veriyordu ve eski hesabın premium'u da kapanmıyordu.
 *
 * Doğrusu: yeni sahip, eski sahibin GERÇEK yetkisini (bitiş, ürün, deneme)
 * devralır; eski sahip(ler) 'free' olur. Eski satır yoksa ya da süresi dolmuşsa
 * hiçbir şey verilmez — uygulama açılışta `sync-entitlement` ile gerçek durumu
 * RevenueCat'ten okur.
 */
async function handleTransfer(event: RevenueCatEvent, admin: AdminClient): Promise<Response> {
  const toIds = uuids(event.transferred_to);
  const fromIds = uuids(event.transferred_from);
  const eventId = event.id ?? `transfer:${event.event_timestamp_ms ?? Date.now()}`;
  const eventMs = typeof event.event_timestamp_ms === "number" ? event.event_timestamp_ms : null;

  const { data: rows, error: readError } = fromIds.length
    ? await admin
        .from("user_entitlements")
        .select("tier, expires_at, product_id, store, is_trial")
        .in("user_id", fromIds)
    : { data: [], error: null };
  if (readError) {
    console.error(
      `revenuecat-webhook: transfer read failed code=${readError.code} message=${readError.message}`,
    );
    return jsonResponse({ error: "apply_failed" }, 500);
  }

  const now = Date.now();
  const source = (rows ?? [])
    .filter((r) => r.tier === "premium" && r.expires_at !== null && Date.parse(r.expires_at) > now)
    .sort((a, b) => Date.parse(b.expires_at) - Date.parse(a.expires_at))[0];

  const results: string[] = [];
  for (const to of toIds) {
    // Eski hesap silinmişse ya da satırı yoksa gerçeği RevenueCat söyler.
    const grant = source ?? (await fetchStoreEntitlement(to));
    if (!grant) {
      results.push(`to:${to}:no_active_source`);
      continue;
    }
    const { data, error } = await admin.rpc("apply_entitlement_event", {
      p_user_id: to,
      p_tier: "premium",
      p_expires_at: grant.expires_at,
      p_product_id: grant.product_id,
      p_store: grant.store ?? event.store ?? null,
      p_event_id: `${eventId}:to`,
      p_event_ms: eventMs,
      p_is_trial: grant.is_trial,
    });
    if (error && error.code !== "23503") {
      console.error(`revenuecat-webhook: transfer apply failed to=${to} code=${error.code}`);
      return jsonResponse({ error: "apply_failed" }, 500);
    }
    results.push(`to:${to}:${error ? "unknown_user" : String(data)}`);
  }
  for (const from of fromIds) {
    if (toIds.includes(from)) continue;
    const { data, error } = await admin.rpc("apply_entitlement_event", {
      p_user_id: from,
      p_tier: "free",
      p_expires_at: new Date(now).toISOString(),
      p_product_id: null,
      p_store: event.store ?? null,
      p_event_id: `${eventId}:from`,
      p_event_ms: eventMs,
      p_is_trial: false,
    });
    if (error && error.code !== "23503") {
      console.error(`revenuecat-webhook: transfer revoke failed from=${from} code=${error.code}`);
      return jsonResponse({ error: "apply_failed" }, 500);
    }
    results.push(`from:${from}:${error ? "unknown_user" : String(data)}`);
  }

  console.log(
    `revenuecat-webhook: type=TRANSFER ${results.join(" ")} env=${event.environment ?? "?"}`,
  );
  return jsonResponse({ status: "ok", type: "TRANSFER", results }, 200);
}

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

  if (type === "TRANSFER") {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    return await handleTransfer(event, admin);
  }

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

  // Süresiz ürün SATMIYORUZ: bitiş tarihi olmayan bir premium olay, ömür boyu
  // premium yazılmasın diye işlenmez (has_active_premium null'ı süresiz sayar).
  if (tier === "premium" && expirationMs === null) {
    console.error(
      `revenuecat-webhook: premium without expiration ignored type=${type} product=${event.product_id ?? "?"}`,
    );
    return jsonResponse({ status: "ignored", reason: "no_expiration", type }, 200);
  }

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
