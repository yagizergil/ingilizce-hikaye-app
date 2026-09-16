// Task 4 (3. seviye fallback) — cihazda hem book_lemmas hem lemma_canonical
// karşılığı bulunamayan NADİR bir lemma için çalışma zamanında LLM ile tek
// kelimelik bağlamsal çeviri üretir ve sonucu çağırana döner.
//
// GENELLEŞTİRME (v2, 2026-09-13 — dil çiftleri): eskiden hedef HER ZAMAN
// İngilizce, ana dil HER ZAMAN Türkçe idi ve sonuç `lemmas.tr_gloss`'a
// yazılıyordu. Artık `nativeLanguage`/`targetLanguage` istekte geliyor.
//
// NEDEN `lemmas` TABLOSU DEĞİŞMEDİ: (targetLanguage="en", nativeLanguage=
// "tr") -- yani bugüne kadarki TEK yol -- hâlâ `lemmas` tablosuna, hâlâ
// aynı şemayla yazıyor. 26.100 kelimelik bu tablo üretimde kanıtlanmış;
// onu değiştirmenin hiçbir Türkçe kullanıcıya faydası yok, sadece riski
// var. Diğer 9 ana dil (ya da ileride başka bir hedef dil) için sonuç
// `lemma_translations` tablosuna yazılıyor -- migration 033'te tanımlı
// genel (target_language, lemma, pos, native_language) önbelleği.
// Böylece mevcut yol satır satır aynı kalıyor, yeni yol ONA EK.
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

/** Eski istemcilerle (build 9 ve öncesi) geriye dönük uyumluluk için varsayılanlar. */
const DEFAULT_NATIVE_LANGUAGE = "tr";
const DEFAULT_TARGET_LANGUAGE = "en";

/**
 * Prompt'ta okunabilir dil adı için. `languages` tablosunun `name_en`
 * sütunuyla aynı değerler -- burada sabit tutuluyor çünkü bu fonksiyon
 * her çağrıda ekstra bir DB round-trip yapmadan çalışmalı ve liste zaten
 * sabit (yeni dil eklemek zaten bir migration + deploy gerektiriyor).
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  de: "German",
  fr: "French",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  it: "Italian",
  uk: "Ukrainian",
  ar: "Arabic",
  es: "Spanish",
};

interface RequestBody {
  surface: string;
  lemma: string;
  contextSentence: string;
  cefrHint?: string;
  /** Kelimenin çevrileceği dil. Varsayılan "tr" (eski istemci uyumu). */
  nativeLanguage?: string;
  /** Kelimenin AİT OLDUĞU metnin dili. Varsayılan "en". */
  targetLanguage?: string;
}

interface LlmGlossResult {
  gloss: string;
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
    (record.cefrHint === undefined || typeof record.cefrHint === "string") &&
    (record.nativeLanguage === undefined || typeof record.nativeLanguage === "string") &&
    (record.targetLanguage === undefined || typeof record.targetLanguage === "string")
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

/**
 * Claude'dan bağlam içinde tek kelimelik bir karşılık ister. Herhangi bir
 * ayrıştırma/API hatasında null döner (asla fırlatmaz) — çağıran "sonuç
 * yok"u tek tip ele alabilsin.
 */
async function requestLlmGloss(
  apiKey: string,
  body: RequestBody,
  nativeLanguage: string,
  targetLanguage: string,
): Promise<LlmGlossResult | null> {
  const targetName = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage;
  const nativeName = LANGUAGE_NAMES[nativeLanguage] ?? nativeLanguage;

  const prompt =
    `${targetName} word: "${body.lemma}" (as it appears: "${body.surface}")\n` +
    `Sentence: "${body.contextSentence}"\n\n` +
    `Give the best short ${nativeName} translation (gloss) for this specific ` +
    `word AS USED in this sentence, and its part of speech. Respond with ` +
    "ONLY a compact JSON object, no markdown fences, no extra text, in " +
    'exactly this shape: {"gloss":"...","pos":"noun|verb|adjective|adverb|' +
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
  // Eski prompt sürümüyle konuşan bir modelin `tr_gloss` döndürme ihtimaline
  // karşı ikisine de bakılıyor -- prompt'u kontrol eden biziz ama model
  // çıktısı üzerinde garanti yok.
  const gloss =
    typeof record.gloss === "string"
      ? record.gloss
      : typeof record.tr_gloss === "string"
        ? record.tr_gloss
        : null;
  if (!gloss || gloss.length === 0) return null;
  const pos = typeof record.pos === "string" && ALLOWED_POS.has(record.pos) ? record.pos : "other";

  return { gloss, pos };
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

  const nativeLanguage = body.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE;
  const targetLanguage = body.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
  // Bilinmeyen bir dil kodu prompt'ta çöp üretir ve sessizce yanlış
  // karşılık döner -- bu, boş sonuçtan daha kötü, o yüzden erken reddediliyor.
  if (!(nativeLanguage in LANGUAGE_NAMES) || !(targetLanguage in LANGUAGE_NAMES)) {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
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

  const result = await requestLlmGloss(anthropicApiKey, body, nativeLanguage, targetLanguage);

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

  // Savunma katmanı (denetim, 2026-09-16): geçerli bir tek kelime/kısa
  // öbek karşılığı hiçbir zaman uzun olmaz. Bir prompt-injection denemesi
  // modeli uzun, alakasız bir metin üretmeye ikna ederse bu satır onu
  // paylaşımlı sözlüğe yazılmadan eler.
  if (result && result.gloss.length > 120) {
    return jsonResponse({ status: "unavailable", reason: "gloss_too_long" }, 200);
  }

  if (!result) {
    return jsonResponse({ status: "unavailable", reason: "provider_error" }, 200);
  }

  // BUGÜNE KADARKİ TEK YOL (en->tr): AYNEN eskisi gibi `lemmas` tablosuna
  // yazılıyor. Şema, sütun adları, onConflict hedefi -- hiçbiri değişmedi.
  if (targetLanguage === DEFAULT_TARGET_LANGUAGE && nativeLanguage === DEFAULT_NATIVE_LANGUAGE) {
    const { error: upsertError } = await adminClient.from("lemmas").upsert(
      {
        lemma,
        pos: result.pos,
        tr_gloss: result.gloss,
        source: "runtime",
      },
      // ÇÖZÜLEN GÜVENLİK BULGUSU (denetim, 2026-09-16): `onConflict` tek
      // başına bir UPDATE'tir -- bu satır var olan bir `lemma,pos` girdisini
      // KOŞULSUZ ÜZERİNE YAZIYORDU. `contextSentence`/`surface` alanları
      // kullanıcıdan geliyor ve doğrudan LLM prompt'una gömülüyor
      // (yukarıdaki `requestLlmGloss`); bir kullanıcı özenle hazırlanmış bir
      // context ile modeli kandırıp yaygın bir kelimenin karşılığını
      // bozabilir ve bu, o kelimeyi arayan HERKESE (paylaşımlı sözlük)
      // kalıcı olarak yansırdı. `ignoreDuplicates: true` bunu "yoksa yaz"a
      // çeviriyor -- var olan bir girdi ARTIK ASLA runtime çağrısıyla
      // ezilemiyor, yalnızca gerçekten eksik olan kelimeler doldurulabiliyor.
      { onConflict: "lemma,pos", ignoreDuplicates: true },
    );

    if (upsertError) {
      return jsonResponse(
        { status: "ok", gloss: result.gloss, pos: result.pos, persisted: false },
        200,
      );
    }
    return jsonResponse(
      { status: "ok", gloss: result.gloss, pos: result.pos, persisted: true },
      200,
    );
  }

  // YENİ YOL (v2): herhangi bir (hedef dil, ana dil) çifti -- migration
  // 033'teki genel önbelleğe yazılıyor, `lemmas` tablosuna DOKUNULMUYOR.
  const { error: upsertError } = await adminClient.from("lemma_translations").upsert(
    {
      target_language: targetLanguage,
      lemma,
      pos: result.pos,
      native_language: nativeLanguage,
      gloss: result.gloss,
      source: "runtime",
    },
    // Yukarıdaki `lemmas` upsert'iyle AYNI gerekçe: var olan bir çeviriyi
    // ezmek yerine yalnızca eksik olanı dolduruyor.
    { onConflict: "target_language,lemma,pos,native_language", ignoreDuplicates: true },
  );

  if (upsertError) {
    return jsonResponse(
      { status: "ok", gloss: result.gloss, pos: result.pos, persisted: false },
      200,
    );
  }
  return jsonResponse({ status: "ok", gloss: result.gloss, pos: result.pos, persisted: true }, 200);
});
