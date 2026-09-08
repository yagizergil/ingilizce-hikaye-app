// RevenueCat -> user_entitlements ONARIM yolu.
//
// NEDEN BU FONKSİYON VAR (olay kaydı, 2026-09-07):
//   Gerçek bir sandbox satın alması yapıldı (RevenueCat sunucusunda
//   `premium`, ürün com.ingilizcehikaye.app.premium.monthly, 22:01:09).
//   Buna ait TEK webhook teslimi 22:01:15'te geldi ve o an RevenueCat'teki
//   yetki adı `premium` DEĞİLDİ; webhook olayı "other_entitlement" sayıp
//   200 döndü ve hiçbir şey yazmadı. Yapılandırma sonradan düzeltildi ama
//   o abonelik için yeni bir olay ÜRETİLMEDİ — RevenueCat aynı satın alma
//   için INITIAL_PURCHASE'ı tekrar göndermez.
//
//   Sonuç: kullanıcı ödedi, RevenueCat "premium" diyor, sunucu sonsuza
//   kadar 'free' diyor. Kaybı geri getirecek hiçbir yol yoktu.
//
// YAPISAL BOŞLUK (asıl mesele): webhook teslimi "at least once" garantisi
//   verir, "asla kaybolmaz" garantisi VERMEZ. Yanlış yapılandırma, geçici
//   bir 5xx penceresi ya da fonksiyonun yeniden dağıtıldığı bir an — bir
//   olayın kaçması yetkinin KALICI kaybı demekti. Ayrıca "Satın alımları
//   geri yükle" (App Store'un zorunlu tuttuğu akış) yalnızca cihazdaki
//   SDK durumunu tazeliyordu, sunucuya hiç yazmıyordu: uygulamayı silip
//   yeniden kuran ödeyen bir kullanıcı SDK'da premium, sunucuda 'free'
//   kalıyordu ve ücretsiz katman sınırını sunucudaki tetikleyici
//   (migration 024) zorladığı için sınıra takılıyordu.
//
// KARAR: ADR-009'un tek yazarlı zinciri BOZULMUYOR. Yazma yine sunucuda,
//   yine service_role ile ve yine `apply_entitlement_event()` üzerinden
//   yapılıyor. İstemci yalnızca "benim durumumu mağazadan tazele" diyor;
//   ne yazılacağına RevenueCat'in kendi API'si karar veriyor.
//
// YALNIZCA VERİR, ASLA ALMAZ:
//   RevenueCat aktif bir yetki göstermiyorsa bu fonksiyon HİÇBİR ŞEY
//   yazmaz, sadece "free" raporlar. İki sebeple:
//     1. Yetkiyi kaldırmak EXPIRATION webhook'unun işi (ADR-009).
//     2. Satın alma ile webhook arasındaki saniyelerde çağrılırsa,
//        `rc_event_ms`'i now() olan bir 'free' yazması, hemen ardından
//        gelen gerçek satın alma olayını 'stale' yapıp yutardı.
//   Böylece bu yol en kötü ihtimalle etkisiz kalır; hiçbir koşulda
//   kullanıcının ödediği erişimi elinden alamaz.
import { createClient } from "jsr:@supabase/supabase-js@2";

/** Uygulamanın RevenueCat'teki yetki adı — src/lib/revenuecat.ts ile aynı. */
const PREMIUM_ENTITLEMENT = "premium";

const REVENUECAT_API = "https://api.revenuecat.com/v1/subscribers";

interface RcEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
}

interface RcSubscription {
  store?: string | null;
  period_type?: string | null;
  expires_date?: string | null;
}

interface RcSubscriber {
  entitlements?: Record<string, RcEntitlement>;
  subscriptions?: Record<string, RcSubscription>;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `expires_date` yoksa süresiz (lifetime) demektir; varsa gelecekte mi. */
function isActive(entitlement: RcEntitlement): boolean {
  const raw = entitlement.expires_date;
  if (raw === null || raw === undefined) return true;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) && ms > Date.now();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const apiKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!apiKey) {
    // Sır tanımlanmadan dağıtıldıysa sessizce "free" dönmek, ödeyen
    // kullanıcıyı ücretsiz katmanda bırakıp sebebini gizlerdi.
    console.error("sync-entitlement: REVENUECAT_API_KEY is not set");
    return jsonResponse({ error: "not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Çağıranın kimliği JWT'den okunuyor — gövdeden GELMİYOR. Aksi hâlde bir
  // kullanıcı başkasının kimliğini gönderip onun yetkisini tetikleyebilirdi.
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return jsonResponse({ error: "not_authorized" }, 401);
  }

  let subscriber: RcSubscriber;
  try {
    const response = await fetch(`${REVENUECAT_API}/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // RevenueCat erişilemedi: bu GEÇİCİ bir durum. 5xx dönerek istemcinin
      // tekrar denemesine izin veriyoruz; "free" demek yanıltıcı olurdu.
      const body = await response.text();
      console.error(
        `sync-entitlement: revenuecat http=${response.status} body=${body.slice(0, 200)}`,
      );
      return jsonResponse({ error: "store_unavailable" }, 502);
    }

    const payload = (await response.json()) as { subscriber?: RcSubscriber };
    subscriber = payload.subscriber ?? {};
  } catch (error) {
    console.error(`sync-entitlement: revenuecat fetch failed user_id=${userId}`, error);
    return jsonResponse({ error: "store_unavailable" }, 502);
  }

  const entitlement = subscriber.entitlements?.[PREMIUM_ENTITLEMENT];

  if (!entitlement || !isActive(entitlement)) {
    // Yazma YOK — yukarıdaki "yalnızca verir, asla almaz" kuralı.
    console.log(`sync-entitlement: no active entitlement user_id=${userId}`);
    return jsonResponse({ tier: "free", applied: false }, 200);
  }

  const productId = entitlement.product_identifier ?? null;
  const subscription = productId ? subscriber.subscriptions?.[productId] : undefined;
  const expiresAt = entitlement.expires_date ?? null;

  // Olay kimliği DURUMDAN türetiliyor: aynı durum ikinci kez senkronlanırsa
  // `apply_entitlement_event` bunu 'duplicate' görüp hiçbir şey yazmıyor.
  // Böylece "geri yükle"ye üst üste basmak veritabanını dövmüyor.
  const eventId = `sync:${userId}:${productId ?? "?"}:${expiresAt ?? "lifetime"}`;

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await adminClient.rpc("apply_entitlement_event", {
    p_user_id: userId,
    p_tier: "premium",
    p_expires_at: expiresAt,
    p_product_id: productId,
    p_store: subscription?.store ?? null,
    p_event_id: eventId,
    // now(): bu, RevenueCat'in ŞU ANKİ durumu. Daha eski bir olayın bunu
    // ezmemesi gerekiyor. Bundan sonra üretilecek gerçek olaylar (örn.
    // EXPIRATION) daha büyük bir zaman damgası taşıyacağı için etkilenmez.
    p_event_ms: Date.now(),
    p_is_trial: subscription?.period_type === "trial",
  });

  if (error) {
    console.error(
      `sync-entitlement: apply failed user_id=${userId} code=${error.code} message=${error.message}`,
    );
    return jsonResponse({ error: "apply_failed" }, 500);
  }

  console.log(
    `sync-entitlement: user_id=${userId} result=${String(data)} expires=${expiresAt ?? "lifetime"}`,
  );
  return jsonResponse({ tier: "premium", applied: true, result: data, expiresAt }, 200);
});
