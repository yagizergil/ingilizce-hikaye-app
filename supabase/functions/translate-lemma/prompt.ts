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

export const PROMPT_VERSION = 3;

/**
 * v3 geçişinde soğuk önbellek maliyetini önlemek için: v3 satırı yoksa v2
 * satırı sunuluyor. v2 denetiminde yanlış bulunan kayıtlar veritabanından
 * ayrıca silindi (2026-10-10), yani geri düşüş yalnızca doğru kalanlara isabet eder.
 */
export const FALLBACK_PROMPT_VERSIONS = [2];

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
  /** Yeniden deneme: önceki cevap yanlış yazı sistemindeydi. */
  strict?: boolean;
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
    "    Gloss ONLY the possessive itself, never fold the possessed noun into it (es 'su casa' -> Arabic 'ـه / ـها (his/her)', not 'بيته').",
    "    The gender/number note describes agreement with the POSSESSED noun, never the owner (it 'sua bicicletta' -> dişil).",
    "  * Articles, elided forms (l', d', qu', j', n'), clitic pronouns, particles: give the function, e.g. 'belirli tanımlık (le/la)'.",
    "  * Partitive / adverbial pronouns (fr en/y, it ne/ci): give what they stand for, e.g. it 'ne' in 'Ne voglio tre' -> Turkish 'ondan / onlardan'.",
    "- ROLE FIRST: before glossing, decide what the word DOES in this exact sentence, using its neighbours:",
    "  * article vs pronoun (de der/die/das/den: article before a noun, relative or demonstrative pronoun otherwise; 'der' before a feminine noun is dative/genitive feminine);",
    "  * fr 'des' before a plural noun with no preceding 'de'-governing word = plural indefinite article (some/-), NOT de + les;",
    "  * auxiliary vs main verb (it è/ha/sono + past participle, fr a/est + participle, ja して見る/てみる = 'try doing', ja ている): gloss the auxiliary as a tense/aspect marker, not 'to be/to have/to see'",
    "    (it 'Marco è partito' tapped 'è' -> English '(past-tense auxiliary of essere: has/went)', NEVER 'is' even for an English learner; Chinese '(完成时助动词)', never 是);",
    "    ja て見る/てみる: gloss as 'try doing' in the native language (German '(etwas) versuchen', Arabic 'يجرّب'), never 'see/look';",
    "  * comparatives (it 'più ... del/della' = than the; fr 'bien mieux/bien plus' = much better/much more; ja より = than);",
    "  * existential it 'ci' in c'è/ci sono/ci sarà = 'there is/are', not 'there (place)';",
    "  * pieces of a compound (ru то in что-то/кто-то/где-то = indefinite 'some-'; ru 'вот почему' = 'that's why', German 'deshalb', never 'hier/da/here');",
    "  * fixed phrases (en 'tired of' = fed up with, weary of; de 'denken an' = think of/about); ja また = 'also/moreover' when it adds a further item, 'again' only for repetition.",
    "- Content-word homographs: give ONLY the sense used here (fr 'le son de la cloche' = noun 'sound'), no note about the other reading; put other senses in alternatives.",
    "- Grammar notes are optional. Add one ONLY if it is correct for THIS sentence; otherwise omit it. Typical traps:",
    "  * Turkish -ı/-i/-u/-ü after a bare noun is usually the ACCUSATIVE (definite object), not a possessive ('dükkânı kapattı' = the shop, object);",
    "    possessive + accusative is -(s)ını ('dükkânını'); in 'babaannemin tatlısı' the -sı is 3rd person possessive agreeing with the genitive.",
    "  * Spanish lo/la/los/las = direct object, le/les = indirect object.",
    "  * Reflexive possessives (ru свой, it/es suo/su) refer to the SUBJECT of the clause; if the subject is female (e.g. a woman's name), say 'her own', not 'his'.",
    "  * Subject vs object: de 'es existiert' -> es is the subject.",
    "- PROPER NOUNS: if the word is used as a personal name, place name or title of a person/place in this sentence (capitalised mid-sentence, subject of 'said', addressed, etc.),",
    "  do NOT translate it. Gloss = the name itself + '(' + the native word for 'proper name' + ')', e.g. Turkish book 'Deniz dedi ki' -> Italian 'Deniz (nome proprio)'; pos 'noun';",
    "  you may give the literal meaning in alternatives ('mare').",
    "- Arabic clitic chains (و، ف، ب، ل، ك، ال، attached pronouns): give the meaning the preposition has with ITS governing verb/noun,",
    "  e.g. after حلم/يحلم, ب = 'of/about' (dream of), not 'with'; after فكر, ب = 'about'. Never gloss a single letter that is just part of a word as a particle.",
    "  If the token is only a fragment (one letter like ا, or a prefix), find the full word in the sentence that contains it and gloss THAT word (e.g. ا inside سأكتب -> 'I will write').",
    "- Japanese/Chinese: text has no spaces, so the tapped token may be a single kana, part of a word, or a whole clause.",
    "  * If it is a single kana inside a larger word or name, gloss the WHOLE word/name it belongs to (and say it is a name if it is one).",
    "    A kana in quotes followed by の字さん/さん/ちゃん (「ぬ」の字さん) is a NICKNAME ('Mr/Ms \"Nu\"'), not a particle.",
    "  * Never transliterate a Japanese word into the native language (煙管 kiseru is a tobacco pipe: Turkish 'pipo', not 'kise').",
    "  * If it is longer than one word, translate the WHOLE chunk concisely and faithfully (all content words, correct numbers: 十二三 = twelve or thirteen), max ~12 words; never return only a fragment of it.",
    "  * Read compounds correctly: 情けなさ = wretchedness/pitifulness (not 'mercilessness'), 真鍮の煙管 = brass pipe, 気がする/感じがする = feel/have a feeling.",
    "- Verbs: give the meaning of the infinitive in the native language, not a full conjugated sentence.",
    '- "lemma": the dictionary form of the tapped word in ' + source + ".",
    '- "pos": one of noun, verb, adjective, adverb, preposition, determiner, pronoun, conjunction, interjection, contraction, particle, numeral, other.',
    `- "alternatives": up to 3 OTHER common ${native} meanings of this form (other senses), or [] if none.`,
    '- "context_dependent": true if the same written form can have a different meaning or part of speech',
    "  in other sentences (e.g. fr 'son' = his/her OR sound; de 'sie' = she/they), false if it always means the same.",
    "",
    "Examples (format only; different sentences from the learner's):",
    `- es book, Turkish learner: 'Las vi ayer en el mercado' tapped 'Las' -> {"gloss":"onları (dişil, doğrudan nesne)","lemma":"ellas","pos":"pronoun","alternatives":[],"context_dependent":true}`,
    `- de book, English learner: 'Sie wartet an der Tür.' tapped 'der' -> {"gloss":"the (fem. dative)","lemma":"der","pos":"determiner","alternatives":["who/which (relative)"],"context_dependent":true}`,
    `- it book, Turkish learner: 'Luca ha mangiato tutto.' tapped 'ha' -> {"gloss":"(geçmiş zaman yardımcı fiili)","lemma":"avere","pos":"verb","alternatives":["sahip olmak"],"context_dependent":true}`,
    `- ru book, German learner: 'Кто-то постучал в дверь.' tapped 'то' -> {"gloss":"-(irgend)jemand (Teil von кто-то)","lemma":"кто-то","pos":"pronoun","alternatives":["das"],"context_dependent":true}`,
    `- tr book, English learner: 'Ayşe kapıyı açtı.' tapped 'Ayşe' -> {"gloss":"Ayşe (proper name)","lemma":"ayşe","pos":"noun","alternatives":[],"context_dependent":true}`,
    `- ja book, Turkish learner: '明日もう一度行ってみる。' tapped 'みる' -> {"gloss":"(-meyi) denemek (yardımcı fiil)","lemma":"みる","pos":"verb","alternatives":["görmek"],"context_dependent":true}`,
    "",
    `The "gloss" MUST be written in ${native}${input.strict ? " ONLY. Your previous answer was not in " + native + "; answer again, every word in " + native + " script (names excepted)" : ""}.`,
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

const SCRIPT_TESTS: Record<string, RegExp> = {
  ja: /[぀-ヿ一-鿿]/u,
  zh: /[一-鿿]/u,
  ar: /[؀-ۿ]/u,
  ru: /[Ѐ-ӿ]/u,
  uk: /[Ѐ-ӿ]/u,
};
const FOREIGN_FOR_LATIN = /[Ѐ-ӿ؀-ۿ぀-ヿ一-鿿]/u;
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/u;

/**
 * Karşılık ana dilin yazı sisteminde mi? ja/zh/ar/ru/uk için o yazıdan en az
 * bir karakter olmalı; Latin alfabeli diller için en az bir Latin harf olmalı
 * ve Kiril/Arap/CJK karakterlerinin tamamı parantez dışında kalmamalı
 * (özel isim ya da "(à + le)" gibi açıklamalar parantez içinde serbest).
 */
export function glossMatchesNativeScript(gloss: string, nativeLanguage: string): boolean {
  const test = SCRIPT_TESTS[nativeLanguage];
  if (test) return test.test(gloss);
  const outside = gloss.replace(/\([^)]*\)/g, " ");
  if (!LATIN_LETTER.test(outside)) {
    // Yalnızca parantez dışında yabancı yazı varsa (Latin harfi hiç yok) reddet.
    return !FOREIGN_FOR_LATIN.test(outside) && LATIN_LETTER.test(gloss);
  }
  return true;
}
