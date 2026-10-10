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

import {
  buildGlossPrompt,
  FALLBACK_PROMPT_VERSIONS,
  glossMatchesNativeScript,
  LANGUAGE_NAMES,
  normalizeSentence,
  normalizeSurface,
  parseGlossResponse,
  PROMPT_VERSION,
  type ParsedGloss,
} from "./prompt.ts";

const DAILY_LIMIT = 30;

/** `lemmas` tablosunun bildiği tür kümesi (yeni prompt daha fazlasını dönebiliyor). */
const LEGACY_POS = new Set([
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
// Modeli guncellerken: eski `claude-3-5-haiku-20241022` emekliye ayrildi ve
// Anthropic API'si 3 hafta boyunca sessizce 404 dondurdu. Model kimligi bu
// yuzden tek bir sabitte duruyor.
//
// 2026-10-10 ölçümü (28 zor kelime, fr/de/es/it/ru): Sonnet işlev
// kelimelerinde ve eş yazımlılarda belirgin biçimde daha doğru (fr "le son"
// -> "ses", es "hace dos años" -> "önce"); Haiku aynı sette 5 hatalı/İngilizce
// karışık karşılık verdi. Sonuçlar önbelleklendiği için maliyet kelime
// başına bir kez ödeniyor. Sonnet başarısız olursa Haiku'ya düşülüyor.
const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const ANTHROPIC_FALLBACK_MODEL = "claude-haiku-4-5-20251001";

/** Eski istemcilerle (build 9 ve öncesi) geriye dönük uyumluluk için varsayılanlar. */
const DEFAULT_NATIVE_LANGUAGE = "tr";
const DEFAULT_TARGET_LANGUAGE = "en";

interface RequestBody {
  surface: string;
  lemma: string;
  contextSentence: string;
  cefrHint?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
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

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/**
 * Claude'dan BAĞLAM İÇİNDE kelime anlamı ister (kaynak dil + yüzey biçimi +
 * lemma + cümle). Herhangi bir hata durumunda null döner (asla fırlatmaz).
 */
async function requestLlmGloss(
  apiKey: string,
  body: RequestBody,
  nativeLanguage: string,
  targetLanguage: string,
): Promise<ParsedGloss | null> {
  const first =
    (await requestLlmGlossWith(ANTHROPIC_MODEL, apiKey, body, nativeLanguage, targetLanguage)) ??
    (await requestLlmGlossWith(
      ANTHROPIC_FALLBACK_MODEL,
      apiKey,
      body,
      nativeLanguage,
      targetLanguage,
    ));
  if (!first || glossMatchesNativeScript(first.gloss, nativeLanguage)) return first;
  // Yanlış yazı sisteminde cevap (ör. Japonca okura İngilizce karşılık):
  // bir kez, daha katı talimatla yeniden dene; yine olmazsa "bulunamadı"
  // -- yanlış dilde bir karşılık göstermekten iyidir.
  console.error(`translate-lemma wrong script: native=${nativeLanguage} retrying`);
  const retry = await requestLlmGlossWith(
    ANTHROPIC_MODEL,
    apiKey,
    body,
    nativeLanguage,
    targetLanguage,
    true,
  );
  return retry && glossMatchesNativeScript(retry.gloss, nativeLanguage) ? retry : null;
}

async function requestLlmGlossWith(
  model: string,
  apiKey: string,
  body: RequestBody,
  nativeLanguage: string,
  targetLanguage: string,
  strict = false,
): Promise<ParsedGloss | null> {
  const prompt = buildGlossPrompt({
    strict,
    surface: body.surface,
    lemma: body.lemma,
    contextSentence: body.contextSentence,
    targetLanguage,
    nativeLanguage,
  });

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
        model,
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (fetchError) {
    console.error(`translate-lemma fetch threw: ${String(fetchError).slice(0, 200)}`);
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "<no body>");
    console.error(
      `translate-lemma provider failure: model=${model} status=${response.status} body=${errorBody.slice(0, 200)}`,
    );
    return null;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (jsonError) {
    console.error(`translate-lemma json failure: ${String(jsonError).slice(0, 120)}`);
    return null;
  }

  const content = (payload as { content?: { text?: string }[] })?.content;
  const text = content?.[0]?.text;
  if (typeof text !== "string") return null;
  return parseGlossResponse(text);
}

interface CachedRow {
  context_key: string;
  lemma: string | null;
  pos: string;
  gloss: string;
  alternatives: string[] | null;
  prompt_version: number;
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
  } catch (bodyError) {
    console.error(`translate-lemma invalid body: ${String(bodyError).slice(0, 120)}`);
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

  // İngilizce->Türkçe dışındaki HER çift: bağlama duyarlı önbellek
  // (migration 056, `word_context_glosses`). Anahtar dil çiftini, yüzey
  // biçimini ve -- anlamı bağlama göre değişen kelimelerde -- cümlenin
  // özetini taşıyor. Önbellek isabeti LLM'e ve günlük sayaca dokunmuyor.
  const isEnglishTurkish =
    targetLanguage === DEFAULT_TARGET_LANGUAGE && nativeLanguage === DEFAULT_NATIVE_LANGUAGE;
  const surfaceKey = normalizeSurface(body.surface) || body.lemma.trim().toLowerCase();
  const sentenceKey = await sha256Hex(normalizeSentence(body.contextSentence));

  if (!isEnglishTurkish && surfaceKey.length > 0) {
    const { data: cachedRows, error: cacheError } = await adminClient
      .from("word_context_glosses")
      .select("context_key, lemma, pos, gloss, alternatives, prompt_version")
      .eq("target_language", targetLanguage)
      .eq("native_language", nativeLanguage)
      .eq("surface", surfaceKey)
      .in("prompt_version", [PROMPT_VERSION, ...FALLBACK_PROMPT_VERSIONS])
      .in("context_key", ["", sentenceKey]);
    if (cacheError) {
      console.error(`translate-lemma cache read failed: ${cacheError.message}`);
    } else {
      const rows = (cachedRows ?? []) as CachedRow[];
      // Önce güncel sürüm, sonra eski sürüm; her sürümde cümleye özel kayıt önce.
      const versions = [PROMPT_VERSION, ...FALLBACK_PROMPT_VERSIONS];
      let hit: CachedRow | undefined;
      for (const version of versions) {
        const ofVersion = rows.filter((row) => row.prompt_version === version);
        hit = ofVersion.find((row) => row.context_key === sentenceKey) ?? ofVersion[0];
        if (hit) break;
      }
      if (hit) {
        return jsonResponse(
          {
            status: "ok",
            gloss: hit.gloss,
            pos: hit.pos,
            lemma: hit.lemma,
            alternatives: hit.alternatives ?? [],
            cached: true,
          },
          200,
        );
      }
    }
  }

  // ÇÖZÜLEN HATA (kullanıcı bulgusu, 2026-09-16): bu limit HER kullanıcıya
  // -- premium dahil -- düz 30/gün uyguluyordu. Türkçe→İngilizce dışındaki
  // HER dil çifti için bu fonksiyon artık "nadir bir 3. seviye fallback"
  // değil, kelime çevirisinin TEK yolu (bkz. dosyanın en üstündeki
  // genelleştirme notu ve WordSheet.tsx'teki `nativeIsTurkish` ayrımı) --
  // yani bir Almanca/Fransızca/... okuyan premium kullanıcı, "sınırsız
  // kelime çevirisi" vaadine rağmen günde 30 kelimeden sonra hiç karşılık
  // alamıyordu. Ölçüldü: premium bir hesap tam 30 çağrıda tıkandı.
  //
  // Düzeltme: limit yalnızca ÜCRETSİZ katmana uygulanıyor. Zaten ücretsiz
  // kullanıcı bu fonksiyona hiç ulaşmadan önce `consume_word_lookup()`
  // (migration 038) günde 15 sözlük açılışında duruyor -- yani ücretsiz
  // kullanıcı pratikte asla 30'a yaklaşamıyor, bu limit onun için sadece
  // bir güvenlik payı. Premium'da tamamen kaldırılıyor.
  const { data: entitlement } = await adminClient
    .from("user_entitlements")
    .select("tier, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPremium =
    entitlement?.tier === "premium" &&
    (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date());

  if (!isPremium) {
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
  }

  const lemma = body.lemma.trim().toLowerCase();
  if (lemma.length === 0) {
    return jsonResponse({ status: "unavailable", reason: "invalid_body" }, 400);
  }

  const result = await requestLlmGloss(anthropicApiKey, body, nativeLanguage, targetLanguage);

  // Uzun/alakasız çıktı (prompt-injection savunması) parseGlossResponse içinde
  // 120 karakterde eleniyor; elenen sonuç burada `null` olarak geliyor.

  // HIZ İYİLEŞTİRMESİ (kullanıcı bulgusu, 2026-09-16 -- "çevirirse çok
  // uzun sürüyor"): bu iki yazma (kullanım sayacı + paylaşımlı sözlüğe
  // kaydetme) daha önce yanıt dönmeden ÖNCE, birbiri ardına (sıralı)
  // bekleniyordu -- kullanıcı, zaten en yavaş adım olan LLM çağrısının
  // ÜZERİNE iki DB round-trip'i daha bekliyordu. İkisi de yanıtın
  // İÇERİĞİNİ etkilemiyor (istemci `persisted` alanını hiç okumuyor,
  // bkz. useLiveWordTranslation.ts) -- yalnızca ARKA PLANDA kalıcı
  // olmaları gerekiyor. `EdgeRuntime.waitUntil` ile yanıt hemen dönüyor,
  // yazmalar yanıttan SONRA tamamlanıyor.
  const persistInBackground = async (): Promise<void> => {
    await adminClient.from("ai_usage").insert({
      user_id: user.id,
      feature: "live_word_translation",
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
    });

    if (!result) return;

    // BUGÜNE KADARKİ TEK YOL (en->tr): AYNEN eskisi gibi `lemmas` tablosuna
    // yazılıyor. Şema, sütun adları, onConflict hedefi -- hiçbiri değişmedi.
    if (targetLanguage === DEFAULT_TARGET_LANGUAGE && nativeLanguage === DEFAULT_NATIVE_LANGUAGE) {
      await adminClient.from("lemmas").upsert(
        {
          lemma,
          pos: LEGACY_POS.has(result.pos) ? result.pos : "other",
          tr_gloss: result.gloss,
          source: "runtime",
        },
        // ÇÖZÜLEN GÜVENLİK BULGUSU (denetim, 2026-09-16): `onConflict` tek
        // başına bir UPDATE'tir -- bu satır var olan bir `lemma,pos`
        // girdisini KOŞULSUZ ÜZERİNE YAZIYORDU. `contextSentence`/`surface`
        // alanları kullanıcıdan geliyor ve doğrudan LLM prompt'una
        // gömülüyor (yukarıdaki `requestLlmGloss`); bir kullanıcı özenle
        // hazırlanmış bir context ile modeli kandırıp yaygın bir kelimenin
        // karşılığını bozabilir ve bu, o kelimeyi arayan HERKESE
        // (paylaşımlı sözlük) kalıcı olarak yansırdı. `ignoreDuplicates:
        // true` bunu "yoksa yaz"a çeviriyor -- var olan bir girdi ARTIK
        // ASLA runtime çağrısıyla ezilemiyor.
        { onConflict: "lemma,pos", ignoreDuplicates: true },
      );
      return;
    }

    // Bağlama duyarlı önbellek. Anlamı bağlama göre değişmeyen kelime
    // (model `context_dependent: false` dedi) cümleden bağımsız ('') yazılıyor,
    // değişen kelime yalnızca bu cümlenin anahtarıyla.
    const contextKey = result.contextDependent ? sentenceKey : "";
    const { error: cacheWriteError } = await adminClient.from("word_context_glosses").upsert(
      {
        target_language: targetLanguage,
        native_language: nativeLanguage,
        surface: surfaceKey,
        context_key: contextKey,
        lemma: result.lemma,
        pos: result.pos,
        gloss: result.gloss,
        alternatives: result.alternatives,
        context_dependent: result.contextDependent,
        prompt_version: PROMPT_VERSION,
        source: "llm",
      },
      {
        onConflict: "target_language,native_language,surface,context_key,prompt_version",
        ignoreDuplicates: true,
      },
    );
    if (cacheWriteError)
      console.error(`translate-lemma cache write failed: ${cacheWriteError.message}`);

    // Kelime defteri / tekrar listeleri lemma düzeyinde `lemma_translations`
    // okuyor. Yalnızca bağlamdan bağımsız anlam oraya yazılıyor; var olan
    // satır ezilmiyor.
    if (!result.contextDependent && result.lemma) {
      await adminClient.from("lemma_translations").upsert(
        {
          target_language: targetLanguage,
          lemma: result.lemma,
          pos: result.pos,
          native_language: nativeLanguage,
          gloss: result.gloss,
          source: "runtime",
        },
        { onConflict: "target_language,lemma,pos,native_language", ignoreDuplicates: true },
      );
    }
  };

  // `EdgeRuntime` yalnızca gerçek Supabase Edge Functions ortamında var
  // (Deno Deploy) -- yerel test/derleme ortamında tanımsız olabileceği
  // için güvenli bir fallback (doğrudan await) ile korunuyor.
  const runtimeWithWaitUntil = globalThis as {
    EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
  };
  if (runtimeWithWaitUntil.EdgeRuntime) {
    runtimeWithWaitUntil.EdgeRuntime.waitUntil(persistInBackground());
  } else {
    await persistInBackground();
  }

  if (!result) {
    return jsonResponse({ status: "unavailable", reason: "provider_error" }, 200);
  }
  return jsonResponse(
    {
      status: "ok",
      gloss: result.gloss,
      pos: result.pos,
      lemma: result.lemma,
      alternatives: result.alternatives,
      cached: false,
      persisted: true,
    },
    200,
  );
});
