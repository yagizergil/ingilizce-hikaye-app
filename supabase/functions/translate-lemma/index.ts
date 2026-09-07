// Task 4 (3. seviye fallback) — cihazda hem book_lemmas hem lemma_canonical
// karşılığı bulunamayan NADİR bir lemma için çalışma zamanında LLM ile tek
// kelimelik bağlamsal Türkçe çeviri üretir, `lemmas` tablosuna
// source='runtime' olarak yazar ve sonucu çağırana döner.
//
// Provider seçimi: pipeline (pipeline/src/lemmas.py, pipeline/.env.example)
// tr_gloss üretimi için zaten Anthropic Claude kullanıyor
// (ANTHROPIC_API_KEY) — CLAUDE.md'nin "zaten var olan sağlayıcıyı kullan"
// ilkesi gereği burada da aynı sağlayıcı kullanılıyor, yeni bir üçüncü
// parti hesap/anahtar eklenmiyor. Bu fonksiyonun kendi ortam değişkeni
// ANTHROPIC_API_KEY olarak Supabase proje secrets'ında AYRICA
// tanımlanmalıdır (Edge Function'lar pipeline/.env'i okuyamaz — bu, ADR-005
// gereği ayrı bir sunucu-taraflı secret'tır ve ürün sahibi tarafından
// `supabase secrets set ANTHROPIC_API_KEY=...` ile sağlanmalıdır).
//
// Rate limiting: basit, per-user günlük sayaç. Mevcut `ai_usage` tablosu
// (feature bazlı, user_id + created_at indeksli) tam bu iş için var --
// ayrı bir rate-limiter servisi kurmak yerine bu tabloyu sorguluyoruz.
// Limit: kullanıcı başına günde 30 çağrı (cömert ama sınırsız değil --
// ölçüme göre bu fallback zaten NADİR tetiklenmesi bekleniyor, bkz. görev
// tanımı). Limit aşılırsa 200 döner (opak 500 değil) ve client Task 3'ün
// "karşılık bulunamadı" durumuna geçer.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DAILY_LIMIT = 30;
// Modeli guncellerken: eski `claude-3-5-haiku-20241022` emekliye ayrildi ve
// Anthropic API'si 3 hafta boyunca sessizce 404 dondurdu. Fonksiyon 404'u
// "provider_error" olarak yutunca kullanicida yalnizca "ceviri alinamadi"
// gorunuyordu; sorun 2026-09-07'de `ai_usage`'a birakilan tani koduyla
// bulundu. Model kimligi bu yuzden tek bir sabitte ve yorumlu duruyor.
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

interface RequestBody {
  surface: string;
  lemma: string;
  contextSentence: string;
  cefrHint?: string;
}

interface LlmGlossResult {
  tr_gloss: string;
  pos: string;
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
    typeof record.surface === "string" &&
    typeof record.lemma === "string" &&
    typeof record.contextSentence === "string" &&
    (record.cefrHint === undefined || typeof record.cefrHint === "string")
  );
}

const ALLOWED_POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "determiner",
  "pronoun",
  "conjunction",
  "interjection",
  "other",
]);

/** Calls Claude for a single-word-in-context Turkish gloss. Returns null
 * (never throws) on any parse/API failure so the caller can uniformly
 * treat "no result" as "unavailable". */
async function requestLlmGloss(
  apiKey: string,
  body: RequestBody,
): Promise<LlmGlossResult | null> {
  const prompt =
    `English word: "${body.lemma}" (as it appears: "${body.surface}")\n` +
    `Sentence: "${body.contextSentence}"\n\n` +
    "Give the best short Turkish translation (gloss) for this specific word " +
    "AS USED in this sentence, and its part of speech. Respond with ONLY a " +
    "compact JSON object, no markdown fences, no extra text, in exactly " +
    'this shape: {"tr_gloss":"...","pos":"noun|verb|adjective|adverb|' +
    'preposition|determiner|pronoun|conjunction|interjection|other"}';

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
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (fetchError) {
    console.error(`translate-lemma fetch threw: ${String(fetchError).slice(0, 200)}`);
    return null;
  }

  if (!response.ok) {
    // Sessizce null donmek, emekliye ayrilan model yuzunden gelen 404'un
    // uc hafta fark edilmemesine yol acti; artik gunluge dusuyor.
    const errorBody = await response.text().catch(() => "<no body>");
    console.error(
      `translate-lemma provider failure: model=${ANTHROPIC_MODEL} status=${response.status} body=${errorBody.slice(0, 200)}`,
    );
    return null;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  const content = (payload as { content?: { text?: string }[] })?.content;
  const text = content?.[0]?.text;
  if (typeof text !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.tr_gloss !== "string" || record.tr_gloss.length === 0) return null;
  const pos = typeof record.pos === "string" && ALLOWED_POS.has(record.pos) ? record.pos : "other";

  return { tr_gloss: record.tr_gloss, pos };
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

  if (!anthropicApiKey) {
    // Secret not provisioned yet — a clear, non-throwing "unavailable" so
    // the client falls through to Task 3's UI state instead of an opaque 500.
    return jsonResponse({ status: "unavailable", reason: "provider_not_configured" }, 200);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: usageCountError } = await adminClient
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "live_word_translation")
    .gte("created_at", since);

  if (usageCountError) {
    return jsonResponse({ status: "unavailable", reason: "rate_limit_check_failed" }, 200);
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return jsonResponse({ status: "unavailable", reason: "rate_limited" }, 200);
  }

  const lemma = body.lemma.trim().toLowerCase();
  if (lemma.length === 0) {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
  }

  const result = await requestLlmGloss(anthropicApiKey, body);

  // Log the attempt either way so the daily counter reflects real usage,
  // including failed calls (a failing provider shouldn't let a user retry
  // it unboundedly within the same window).
  await adminClient.from("ai_usage").insert({
    user_id: user.id,
    feature: "live_word_translation",
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
  });

  if (!result) {
    return jsonResponse({ status: "unavailable", reason: "provider_error" }, 200);
  }

  const { error: upsertError } = await adminClient.from("lemmas").upsert(
    {
      lemma,
      pos: result.pos,
      tr_gloss: result.tr_gloss,
      source: "runtime",
    },
    { onConflict: "lemma,pos" },
  );

  if (upsertError) {
    // Translation succeeded but persisting it failed -- still return the
    // gloss to the caller (better than surfacing "unavailable" for a
    // result we actually have), the write-back is a nice-to-have, not a
    // precondition for showing the user something useful right now.
    return jsonResponse(
      { status: "ok", tr_gloss: result.tr_gloss, pos: result.pos, persisted: false },
      200,
    );
  }

  return jsonResponse({ status: "ok", tr_gloss: result.tr_gloss, pos: result.pos, persisted: true }, 200);
});
