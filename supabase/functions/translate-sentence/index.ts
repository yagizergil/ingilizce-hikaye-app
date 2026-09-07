// Cümle çevirisi (Google Translate benzeri) — WordSheet'te örnek cümlenin
// altında bir toggle ile açılan Türkçe çeviri. `translate-lemma`'nın
// auth/rate-limit desenini birebir izler (bkz. o dosyanın yorumları) --
// tek fark: sonuç DB'ye YAZILMAZ. Kelime çevirisinin aksine cümle çevirisi
// cümleye özgüdür ve tekrar kullanılabilirliği düşüktür, bu yüzden burada
// bir `lemmas`/`book_surface_lemmas` benzeri kalıcı tablo eklemek gereksiz
// kapsam genişlemesi olurdu (CLAUDE.md "Basitlik önce gelir").
import { createClient } from "jsr:@supabase/supabase-js@2";

// Gunluk kota artik burada SABIT DEGIL: katmana gore migration 029'daki
// `ai_sentence_daily_limit()` belirliyor (ucretsiz 10, premium 200) ve
// `my_ai_sentence_quota()` ile tek cagrida okunuyor.
//
// NEDEN: kota daha once herkes icin 30'du, yani paywall'da "AI destekli
// aciklamalar" premium faydasi olarak satiliyor olmasina ragmen ucretsiz
// kullanici birebir aynisini aliyordu (denetim bulgusu, 2026-09-07).
//
// Bu sabit yalnizca kota okunamadiginda kullanilan emniyet degeridir --
// saglayici maliyetini korur, kullaniciyi tamamen kesmez.
const FALLBACK_DAILY_LIMIT = 10;

interface AiQuota {
  isPremium: boolean;
  limit: number;
  used: number;
  remaining: number;
}
// Modeli guncellerken: eski `claude-3-5-haiku-20241022` emekliye ayrildi ve
// Anthropic API'si 3 hafta boyunca sessizce 404 dondurdu. Fonksiyon 404'u
// "provider_error" olarak yutunca kullanicida yalnizca "ceviri alinamadi"
// gorunuyordu; sorun 2026-09-07'de `ai_usage`'a birakilan tani koduyla
// bulundu. Model kimligi bu yuzden tek bir sabitte ve yorumlu duruyor.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

interface RequestBody {
  sentence: string;
  bookId?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRequestBody(value: unknown): value is RequestBody {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sentence === "string" &&
    (record.bookId === undefined || typeof record.bookId === "string")
  );
}

/**
 * Cagri sonucu ve -- basarisizsa -- nedeni.
 *
 * NEDEN AYRI BIR HATA ALANI VAR: bu fonksiyon uc hafta boyunca sessizce
 * bozuktu. Anthropic emekliye ayrilan modele 404 donuyordu, fonksiyon bunu
 * `provider_error` olarak yutuyordu ve kullanici yalnizca "ceviri
 * alinamadi" goruyordu. Basarisizligin NEDENI hicbir yere yazilmadigi icin
 * sorun ancak elle tesbit edilebildi.
 *
 * `diagCode`: 0 = basarili, -1 = fetch firlatti, -2 = json ayristirilamadi,
 * -3 = yanitta metin yok, >0 = Anthropic'in dondurdugu HTTP durumu.
 * Artik `ai_usage` sutunlarina degil, `console.error` ile fonksiyon
 * gunlugune yaziliyor (bir sutunu amaci disinda kullanmak, bu hatayi
 * teshis ederken kafa karistirdi).
 */
interface LlmSentenceResult {
  text: string | null;
  diagCode: number;
  diagDetail: string;
}

/** Calls Claude for a natural, fluent Turkish translation of one English
 * sentence. Returns null (never throws) on any parse/API failure so the
 * caller can uniformly treat "no result" as "unavailable". */
async function requestLlmSentenceTranslation(
  apiKey: string,
  sentence: string,
): Promise<LlmSentenceResult> {
  const prompt =
    `Aşağıdaki İngilizce cümleyi doğal, akıcı Türkçeye çevir, sadece çeviriyi döndür, ` +
    `başka hiçbir açıklama veya tırnak işareti ekleme.\n\nCümle: "${sentence}"`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (fetchError) {
    return { text: null, diagCode: -1, diagDetail: String(fetchError).slice(0, 200) };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "<no body>");
    return { text: null, diagCode: response.status, diagDetail: errorBody.slice(0, 200) };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (parseError) {
    return { text: null, diagCode: -2, diagDetail: String(parseError).slice(0, 200) };
  }

  const content = (payload as { content?: { text?: string }[] })?.content;
  const text = content?.[0]?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { text: null, diagCode: -3, diagDetail: JSON.stringify(payload).slice(0, 200) };
  }

  return { text: text.trim(), diagCode: 0, diagDetail: "" };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ status: "unavailable", reason: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ status: "unavailable", reason: "not_authorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ status: "unavailable", reason: "not_authorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
  }

  if (!isRequestBody(body)) {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
  }

  const sentence = body.sentence.trim();
  if (sentence.length === 0) {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
  }

  if (!anthropicApiKey) {
    // Secret not provisioned yet — a clear, non-throwing "unavailable" so
    // the client shows a specific error instead of an opaque 500.
    return jsonResponse({ status: "unavailable", reason: "provider_not_configured" }, 200);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Kota, cagiranin KENDI JWT'siyle okunuyor: `my_ai_sentence_quota()`
  // katmani ve kullanimi auth.uid() uzerinden cozuyor, yani sinir tek bir
  // yerde (migration 029) tanimli kaliyor ve burada tekrar yazilmiyor.
  const { data: quotaData, error: quotaError } = await callerClient.rpc("my_ai_sentence_quota");

  let quota: AiQuota;
  if (quotaError || quotaData == null) {
    // Kota okunamadi: ozelligi tamamen kapatmak yerine emniyet sinirina
    // dus. Hatanin kendisi sessiz kalmasin -- bu fonksiyon bir kez tam
    // olarak boyle bir sessiz hata yuzunden uc hafta bozuk kaldi.
    console.error(
      `translate-sentence quota lookup failed user_id=${user.id} message=${quotaError?.message ?? "<null>"}`,
    );
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "sentence_translation")
      .gte("created_at", since);
    const used = count ?? 0;
    quota = {
      isPremium: false,
      limit: FALLBACK_DAILY_LIMIT,
      used,
      remaining: Math.max(FALLBACK_DAILY_LIMIT - used, 0),
    };
  } else {
    quota = quotaData as AiQuota;
  }

  if (quota.remaining <= 0) {
    // Istemci bu iki nedeni ayirt ediyor: ucretsiz kullaniciya premium'un
    // ne cozdugunu anlatan bir mesaj, premium kullaniciya ise gunluk tavana
    // ulasildigini soyleyen notr bir mesaj gosteriliyor. Paywall READER
    // ICINDE ACILMIYOR (urun ilkesi #1) -- yalnizca metin degisiyor.
    return jsonResponse(
      {
        status: "unavailable",
        reason: quota.isPremium ? "rate_limited" : "free_tier_daily_limit",
        limit: quota.limit,
        used: quota.used,
      },
      200,
    );
  }

  const { text: translation, diagCode, diagDetail } = await requestLlmSentenceTranslation(
    anthropicApiKey,
    sentence,
  );

  if (!translation) {
    // Saglayici hatasi fonksiyon gunlugune yaziliyor: sessiz bir
    // `provider_error` yuzunden bu ozellik uc hafta bozuk kaldi.
    console.error(
      `translate-sentence provider failure: model=${ANTHROPIC_MODEL} code=${diagCode} detail=${diagDetail}`,
    );
  }

  // Log the attempt either way so the daily counter reflects real usage,
  // including failed calls (a failing provider shouldn't let a user retry
  // it unboundedly within the same window).
  await adminClient.from("ai_usage").insert({
    user_id: user.id,
    feature: "sentence_translation",
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
  });

  if (!translation) {
    return jsonResponse({ status: "unavailable", reason: "provider_error" }, 200);
  }

  // `remaining` bu cagri sayildiktan SONRAKI hak. Istemci bunu son birkac
  // hakta sakin bir bilgi satiri gostermek icin kullaniyor.
  return jsonResponse(
    {
      status: "ok",
      translation,
      remaining: Math.max(quota.remaining - 1, 0),
      isPremium: quota.isPremium,
    },
    200,
  );
});
