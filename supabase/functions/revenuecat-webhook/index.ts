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
//     üzerinden yapılır (migration 028, 060). Fonksiyon idempotans (olay
//     defteri `revenuecat_events`), sıralama (`rc_event_ms`) ve sandbox
//     kurallarını kendi içinde, kullanıcı başına kilitle uygular.
//
// SANDBOX (migration 060): olayın `environment` alanı SQL'e geçiyor. Sandbox
//   olayı, son olayı PRODUCTION olan ve hâlâ geçerli premium bir satırı
//   ezemez ('sandbox_ignored'). Sandbox TAMAMEN düşürülmüyor: App Review
//   satın almayı üretimdeki uygulamada sandbox ortamında yapar; o ödemenin
//   premium açmaması Guideline 2.1 reddi olurdu.
//
// TESLİM GARANTİSİ: RevenueCat "at least once" teslim eder ve sıralama
// garanti etmez. Bu yüzden 2xx dönmek "işlendi" demektir; işlenemeyen ama
// tekrar denenmesi anlamsız olan durumlar (bilinmeyen kullanıcı, test
// olayı) da 200 döner — aksi halde RevenueCat aynı olayı günlerce yeniden
// dener ve panoda kalıcı hata birikir. Yalnızca gerçekten geçici olan
// hatalar (DB erişilemedi) 5xx döner.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

import {
  decideEntitlementWrite,
  eventTimestampMs,
  IGNORED_EVENTS,
  normalizeEnvironment,
  PREMIUM_ENTITLEMENT,
  resolveUserId,
  type RevenueCatEvent,
  secretsMatch,
  touchesPremium,
  uuids,
} from "./rules.ts";
import { lifecyclePatchFor } from "./lifecycle.ts";

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
  const eventMs = eventTimestampMs(event);
  const environment = normalizeEnvironment(event.environment);

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
      p_environment: environment,
      p_event_type: "TRANSFER",
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
      p_environment: environment,
      p_event_type: "TRANSFER",
    });
    if (error && error.code !== "23503") {
      console.error(`revenuecat-webhook: transfer revoke failed from=${from} code=${error.code}`);
      return jsonResponse({ error: "apply_failed" }, 500);
    }
    results.push(`from:${from}:${error ? "unknown_user" : String(data)}`);
  }

  console.log(`revenuecat-webhook: type=TRANSFER ${results.join(" ")} env=${environment ?? "?"}`);
  return jsonResponse({ status: "ok", type: "TRANSFER", results }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Yaşam döngüsü (bilgi) alanlarını yazar: ödeme sorunu, iptal, bitiş nedeni
 * (migration 100). YETKİ yazımından SONRA ve ondan bağımsız çağrılıyor;
 * yetki mantığı (yukarıdaki tier kararı, apply_entitlement_event) DEĞİŞMEDİ.
 *
 * Yetki "duplicate" dönse bile çağrılıyor: bir önceki teslimde yetki
 * yazılıp burası geçici olarak başarısız olduysa RevenueCat'in yeniden
 * denemesi bu alanları tamamlasın. Fonksiyonun kendi idempotansı var.
 *
 * Fonksiyon canlıda yoksa (migration 100 henüz uygulanmamış) yalnızca log:
 * yetkisi zaten yazılmış bir olayı günlerce yeniden denetmek anlamsız.
 */
async function applyLifecycle(
  admin: AdminClient,
  userId: string,
  event: RevenueCatEvent,
): Promise<string> {
  const patch = lifecyclePatchFor(event, Date.now());
  if (!patch) return "skipped";
  const eventMs = typeof event.event_timestamp_ms === "number" ? event.event_timestamp_ms : null;
  const { data, error } = await admin.rpc("apply_subscription_lifecycle", {
    p_user_id: userId,
    p_event_id: event.id ?? `${event.type ?? "UNKNOWN"}:${eventMs ?? Date.now()}`,
    p_event_ms: eventMs,
    p_event_type: event.type ?? "UNKNOWN",
    p_patch: patch,
  });
  if (!error) return String(data);
  if (error.code === "PGRST202" || error.code === "42883") {
    console.error("revenuecat-webhook: apply_subscription_lifecycle missing (migration 100?)");
    return "not_installed";
  }
  console.error(
    `revenuecat-webhook: lifecycle failed user_id=${userId} code=${error.code} message=${error.message}`,
  );
  return "retry";
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

  // Süresi geçmiş yenileme -> free; bitişsiz premium -> yazılmaz (rules.ts).
  const decision = decideEntitlementWrite(event, Date.now());
  if (decision.action === "ignore") {
    console.error(
      `revenuecat-webhook: premium without expiration ignored type=${type} product=${event.product_id ?? "?"}`,
    );
    return jsonResponse({ status: "ignored", reason: decision.reason, type }, 200);
  }
  const { tier, expiresAtMs } = decision;
  const environment = normalizeEnvironment(event.environment);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.rpc("apply_entitlement_event", {
    p_user_id: userId,
    p_tier: tier,
    p_expires_at: expiresAtMs !== null ? new Date(expiresAtMs).toISOString() : null,
    p_product_id: event.product_id ?? null,
    p_store: event.store ?? null,
    p_event_id: event.id ?? null,
    p_event_ms: eventTimestampMs(event),
    p_is_trial: event.period_type === "TRIAL",
    p_environment: environment,
    p_event_type: type,
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

  const lifecycle = await applyLifecycle(adminClient, userId, event);
  if (lifecycle === "retry") return jsonResponse({ error: "lifecycle_failed" }, 500);

  console.log(
    `revenuecat-webhook: type=${type} user_id=${userId} tier=${tier} result=${String(data)} lifecycle=${lifecycle} env=${environment ?? "?"}`,
  );

  return jsonResponse({ status: "ok", result: data, tier, lifecycle }, 200);
});
