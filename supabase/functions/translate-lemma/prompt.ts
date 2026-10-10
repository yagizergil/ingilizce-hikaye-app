// Saf (Deno/Node bağımsız) yardımcılar: prompt kurulumu, model çıktısının
// ayrıştırılması ve bağlam anahtarı normalizasyonu. Edge function'dan ayrı
// dosyada duruyor ki Jest ile test edilebilsin
// (src/features/reader/api/__tests__/translateLemmaPrompt.test.ts).
//
// NEDEN BU KADAR AYRINTILI BİR PROMPT (2026-10-10, kullanıcı bulgusu):
// Fransızca bir kitapta "au" -> "altın", "Sa" -> "bilinmeyen kısaltma"
// gösteriliyordu. Kök sebep istemcinin İngilizce sözlüğe düşmesiydi, ama
// eski prompt da yalnızca "en iyi kısa çeviriyi ver" diyordu; işlev
// kelimeleri, kaynaşmış edatlar (au = à + le, zum = zu + dem, del = de + el)
// ve iyelik sıfatları için model genelde sözlük girdisi gibi davranıyor,
// cümledeki işlevi açıklamıyordu.

export const PROMPT_VERSION = 2;

export const LANGUAGE_NAMES: Record<string, string> = {
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

export const ALLOWED_POS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "determiner",
  "pronoun",
  "conjunction",
  "interjection",
  "contraction",
  "particle",
  "numeral",
  "other",
]);

export interface GlossPromptInput {
  surface: string;
  lemma: string;
  contextSentence: string;
  targetLanguage: string;
  nativeLanguage: string;
}

export interface ParsedGloss {
  gloss: string;
  pos: string;
  lemma: string | null;
  alternatives: string[];
  contextDependent: boolean;
}

/** Cümleyi önbellek anahtarı için normalize eder (boşluk/büyük harf farkı aynı cümle). */
export function normalizeSentence(sentence: string): string {
  return sentence.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 600);
}

/** Yüzey biçimini anahtar için normalize eder ("Sa" ile "sa" aynı kayıt). */
export function normalizeSurface(surface: string): string {
  return surface
    .normalize("NFC")
    .replace(/^[\s"'“”‘’«»¿¡()[\].,;:!?-]+|[\s"'“”‘’«»()[\].,;:!?-]+$/g, "")
    .toLowerCase();
}

/** Kullanıcı metnini prompt'a gömmeden önce tırnak/satır kırma etkisizleştirilir. */
function sanitize(text: string, max: number): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .slice(0, max);
}

export function buildGlossPrompt(input: GlossPromptInput): string {
  const source = LANGUAGE_NAMES[input.targetLanguage] ?? input.targetLanguage;
  const native = LANGUAGE_NAMES[input.nativeLanguage] ?? input.nativeLanguage;
  const surface = sanitize(input.surface, 60);
  const lemma = sanitize(input.lemma, 60);
  const sentence = sanitize(input.contextSentence, 600);

  return [
    `You are a bilingual ${source}-${native} dictionary for language learners.`,
    `The learner is reading a ${source} text and tapped ONE word.`,
    "",
    `Source language: ${source}`,
    `Tapped word (exact form): "${surface}"`,
    `Rough lemma guess from a simple tokenizer (may be wrong, ignore if so): "${lemma}"`,
    `Sentence: "${sentence}"`,
    "",
    `Treat the tapped word strictly as a ${source} word. Never read it as an English word,`,
    "abbreviation or symbol (French 'au' is NOT gold, 'sa' is NOT an abbreviation).",
    `Give its meaning in ${native} AS USED IN THIS SENTENCE. Write every field except "lemma" entirely in ${native};`,
    "never use English grammar terms (no 'clitic', 'adverbial pronoun', 'partitive' in English).",
    "Rules:",
    `- "gloss": the short primary ${native} meaning (1-4 words), the way a good bilingual dictionary would print it.`,
    "- Function words: explain the grammatical function briefly in the gloss, in " + native + ".",
    "  * Contractions of preposition+article (fr au/aux/du/des, de zum/zur/im/am/ins/vom, es al/del, it al/del/nel/sul...):",
    "    give the meaning and show the parts in parentheses, e.g. fr 'au' in 'il va au marché' -> Turkish '-e / -a (à + le)'.",
    "  * Possessive determiners (fr sa/son/ses, es su, it suo/sua, de sein/ihr, ru его/её/свой):",
    "    give the possessive meaning, e.g. fr 'Sa' in 'Sa grand-mère' -> Turkish 'onun (dişil iyelik)'.",
    "    The gender/number note describes agreement with the POSSESSED noun, never the owner (it 'sua bicicletta' -> dişil).",
    "  * Articles, elided forms (l', d', qu', j', n'), clitic pronouns, particles: give the function, e.g. 'belirli tanımlık (le/la)'.",
    "  * Partitive / adverbial pronouns (fr en/y, it ne/ci): give what they stand for, e.g. it 'ne' in 'Ne voglio tre' -> Turkish 'ondan / onlardan'.",
    "- Homographs: first decide the part of speech IN THIS SENTENCE. If it is a content word here (fr 'son' in 'le son de la cloche' = noun),",
    "  give only that meaning (Turkish 'ses') with NO grammatical note about the other reading; put the other reading in alternatives.",
    "- Verbs: give the meaning of the infinitive in the native language, not a full conjugated sentence.",
    '- "lemma": the dictionary form of the tapped word in ' + source + ".",
    '- "pos": one of noun, verb, adjective, adverb, preposition, determiner, pronoun, conjunction, interjection, contraction, particle, numeral, other.',
    `- "alternatives": up to 3 OTHER common ${native} meanings of this form (other senses), or [] if none.`,
    '- "context_dependent": true if the same written form can have a different meaning or part of speech',
    "  in other sentences (e.g. fr 'son' = his/her OR sound; de 'sie' = she/they), false if it always means the same.",
    "",
    "Respond with ONLY a compact JSON object, no markdown, no extra text:",
    '{"gloss":"...","lemma":"...","pos":"...","alternatives":["..."],"context_dependent":false}',
  ].join("\n");
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  if (fenced?.[1] !== undefined) return fenced[1];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

/** Model metnini doğrular; geçersizse null (asla fırlatmaz). */
export function parseGlossResponse(text: string): ParsedGloss | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch (parseError) {
    console.error(`translate-lemma parse failure: ${String(parseError).slice(0, 120)}`);
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const rawGloss =
    typeof record.gloss === "string"
      ? record.gloss
      : typeof record.tr_gloss === "string"
        ? record.tr_gloss
        : "";
  const gloss = rawGloss.trim();
  if (gloss.length === 0 || gloss.length > 120) return null;

  const pos = typeof record.pos === "string" && ALLOWED_POS.has(record.pos) ? record.pos : "other";
  const lemma =
    typeof record.lemma === "string" && record.lemma.trim().length > 0 && record.lemma.length <= 60
      ? record.lemma.trim().toLowerCase()
      : null;
  const alternatives = Array.isArray(record.alternatives)
    ? record.alternatives
        .filter((alt): alt is string => typeof alt === "string")
        .map((alt) => alt.trim())
        .filter((alt) => alt.length > 0 && alt.length <= 80 && alt !== gloss)
        .slice(0, 3)
    : [];
  const contextDependent = record.context_dependent === true;
  return { gloss, pos, lemma, alternatives, contextDependent };
}
