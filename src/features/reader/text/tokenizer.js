/**
 * tokenizer.js
 *
 * WHY PLAIN COMMONJS, NOT TYPESCRIPT/ESM:
 * See the header comment in `./irregulars.js` for the full rationale — this
 * file is `require()`-d directly by Jest, and `require()`-d directly by
 * native RN code (Metro resolves plain CommonJS `.js` files natively, no
 * bundler-specific loader needed for this ES5/ES2017-safe syntax). It
 * therefore stays ES5/ES2017-safe CommonJS with no `import`/`export`, no
 * TypeScript syntax, and no dependency beyond `./irregulars.js`.
 *
 * This module has ZERO DOM/browser dependency (no `document`, `window`, or
 * RN imports) so it runs identically under plain Node/Jest and native RN
 * via Metro.
 */

var irregulars = require("./irregulars");
var irregularLemmas = irregulars.irregularLemmas;
var abbreviations = irregulars.abbreviations;

// A "word" character for tokenization purposes: any Unicode letter or digit.
// \p{L} requires the "u" flag (supported by Node >=10 and all modern
// WebView JS engines this app targets).
var WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/**
 * Splits `text` into an ordered array of tokens that, concatenated in
 * order, reconstruct `text` exactly. Each token is either:
 *   - { type: 'word', text, start, end } — a run of letters/digits that may
 *     contain internal apostrophes as part of a contraction/possessive
 *     ("don't", "Frankenstein's", "wouldn't've").
 *   - { type: 'other', text, start, end } — everything else (whitespace,
 *     punctuation, em-dashes, etc.), also run-length-collapsed.
 *
 * `start`/`end` are character offsets into the original `text` (end is
 * exclusive), preserved so a consumer can compute `data-char-start` for
 * reading-position tracking in a later phase.
 *
 * Never throws. Empty string returns an empty array.
 */
function tokenize(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  var tokens = [];
  var i = 0;
  var len = text.length;

  while (i < len) {
    var ch = text[i];
    if (WORD_CHAR_RE.test(ch)) {
      var start = i;
      var j = i + 1;
      while (j < len) {
        var c = text[j];
        if (WORD_CHAR_RE.test(c)) {
          j++;
          continue;
        }
        // Allow an apostrophe (straight ' or curly ' / U+2019) to continue
        // the word ONLY if it is immediately followed by another word
        // character — this keeps "don't", "wouldn't've", and
        // "Frankenstein's" as single tokens without swallowing a trailing
        // quote mark that closes dialogue, e.g. `'Stop!'` or `said 'no'.`
        if ((c === "'" || c === "’") && j + 1 < len && WORD_CHAR_RE.test(text[j + 1])) {
          j += 2;
          continue;
        }
        break;
      }
      tokens.push({ type: "word", text: text.slice(start, j), start: start, end: j });
      i = j;
    } else {
      var oStart = i;
      var k = i + 1;
      while (k < len && !WORD_CHAR_RE.test(text[k])) {
        k++;
      }
      tokens.push({ type: "other", text: text.slice(oStart, k), start: oStart, end: k });
      i = k;
    }
  }

  return tokens;
}

// Short list of common base nouns that end in "-er"/"-or" and must NEVER be
// stripped by the comparative/superlative suffix rule below. This is a
// naive but safe exception list rather than a general "is this a plausible
// word" check, because a general check needs a dictionary we don't have on
// device. Documented limitation: any -er noun NOT on this list (e.g. a rare
// or proper noun ending in "-er") can still be incorrectly stripped by the
// heuristic; conversely, this list is not exhaustive.
var ER_NOUN_EXCEPTIONS = {
  father: true, mother: true, brother: true, sister: true, daughter: true,
  water: true, winter: true, summer: true, number: true, matter: true,
  letter: true, paper: true, order: true, dinner: true, corner: true,
  answer: true, member: true, chamber: true, danger: true, manner: true,
  finger: true, hunger: true, anger: true, wonder: true, power: true,
  river: true, silver: true, tiger: true, spider: true, monster: true,
  master: true, sister_in_law: true, mister: true, doctor: true,
  neighbor: true, neighbour: true, character: true, offer: true,
  weather: true, leather: true, feather: true, wander: true, thunder: true,
  after: true, other: true, never: true, ever: true, over: true,
  under: true, whether: true, either: true, neither: true, together: true,
  however: true, rather: true, further: true, proper: true, upper: true,
  lower: true, inner: true, outer: true, former: true, eager: true,
};

// Words that end in "-ing" but are not a present-participle/gerund of any
// verb formed by stripping that suffix (they are complete words in their
// own right — prepositions, gerund-only nouns, etc.) — analogous in spirit
// to ER_NOUN_EXCEPTIONS above. A naive, non-exhaustive safe list rather
// than a dictionary; see ADR-008 for why a full dictionary isn't used.
var ING_WORD_EXCEPTIONS = {
  during: true, evening: true, morning: true, ceiling: true,
  spring: true, king: true, thing: true, ring: true, wing: true,
};

// Words that end in "-ed" but are not the past tense of any verb formed by
// stripping that suffix -- they are complete words in their own right,
// mostly ones that happen to end in "eed" (e.g. "indeed" -> stripped to
// "inde", a non-word with no dictionary entry, instead of staying
// "indeed"). Same naive-but-safe exception-list approach as
// ER_NOUN_EXCEPTIONS/ING_WORD_EXCEPTIONS above; see ADR-008.
var ED_WORD_EXCEPTIONS = {
  indeed: true, need: true, speed: true, greed: true, breed: true,
  seed: true, weed: true, feed: true, heed: true, reed: true,
  deed: true, creed: true, steed: true, exceed: true, proceed: true,
  succeed: true, agreed: true, decreed: true,
};

// Consonants that are INHERENTLY doubled in an English base word and are
// therefore never the product of inflectional consonant-doubling.
//
// ÇÖZÜLEN HATA (2026-09-07): "expressed" -> stem "express" -> yanlışlıkla
// "expres" (sözlükte yok) oluyordu; kullanıcı bu yüzden yaygın bir kelimede
// "karşılık bulunamadı" görüyordu. Aynı hata "spelled"/"staffed"/"buzzed"
// gibi bütün bir kelime sınıfını vuruyordu.
//
// İngilizce yazımda çekim eki almadan önce ünsüz ikizlenmesi yalnızca TEK
// heceli, kısa ünlülü köklerde olur (run->running, stop->stopped) ve o
// köklerde ikizlenen ünsüz asla `ss`/`ll`/`ff`/`zz` değildir — bu dört
// ikiz zaten kökün kendi yazımının parçasıdır (express, spell, staff,
// buzz). Porter gövdeleyicisinin de aynı istisnası vardır.
var INHERENT_DOUBLES = { s: true, l: true, f: true, z: true };

/**
 * Undo consonant-doubling and restore a dropped trailing "e" for a stem
 * produced by stripping "-ing" or "-ed"/"-d". Pure heuristic; never throws.
 */
function restoreStem(stem) {
  if (stem.length === 0) {
    return stem;
  }
  // Consonant-doubling undo: "running" -> stem "runn" -> "run",
  // "stopped" -> stem "stopp" -> "stop". Only undo when the last two
  // characters are the same consonant (not vowels, not w/x/y which don't
  // double in English orthography, and not the inherent doubles above).
  var lastTwo = stem.slice(-2);
  if (
    lastTwo.length === 2 &&
    lastTwo[0] === lastTwo[1] &&
    !/[aeiouwxy]/.test(lastTwo[0]) &&
    !INHERENT_DOUBLES[lastTwo[0]]
  ) {
    return stem.slice(0, -1);
  }
  return stem;
}

var VOWEL_RE = /[aeiou]/;

/**
 * Lowercases `surface`, resolves it via the irregular table first, then
 * falls back to a suffix-rule cascade for regular inflections. Always
 * returns a non-empty, lowercased string; never throws.
 *
 * Known limitations (documented per ADR-008 — on-device lemmatization is
 * intentionally imperfect, with the sheet's "no match found" fallback
 * covering the gap):
 *   - The plural -s/-es rule has no dictionary, so it can mis-lemmatize
 *     nouns that end in "s" naturally in their base form in edge cases
 *     (mitigated for the common "-ss"/"-us"/"-is" endings below, but not
 *     exhaustive).
 *   - The -ing/-ed "e-restoration" step (e.g. "making" -> "make") uses a
 *     generic heuristic (append "e" when the bare stem ends in a single
 *     consonant preceded by a single vowel) and can be wrong for stems
 *     that are genuinely complete without a final "e".
 *   - The -er/-est comparative rule uses a fixed exception list
 *     (ER_NOUN_EXCEPTIONS) for common base nouns like "father"/"mother"
 *     rather than a real dictionary, so an -er noun not on that list can
 *     still be incorrectly treated as a comparative.
 *   - No part-of-speech awareness at all — e.g. "saw" as a noun (tool) vs.
 *     "saw" as the irregular past tense of "see" are indistinguishable;
 *     the irregular table wins and returns "see".
 */
function lemmatize(surface) {
  if (typeof surface !== "string" || surface.length === 0) {
    return "";
  }

  var lower = surface.toLowerCase();

  if (Object.prototype.hasOwnProperty.call(irregularLemmas, lower)) {
    return irregularLemmas[lower];
  }

  // -ies -> y ("flies" -> "fly", "distinguishes"... no, that's -es; this
  // rule only fires on "consonant + ies").
  if (lower.length > 3 && lower.slice(-3) === "ies" && !VOWEL_RE.test(lower[lower.length - 4])) {
    return lower.slice(0, -3) + "y";
  }

  // -ing
  if (lower.length > 4 && lower.slice(-3) === "ing" && !ING_WORD_EXCEPTIONS[lower]) {
    var ingStem = lower.slice(0, -3);
    var doubled = restoreStem(ingStem);
    if (doubled !== ingStem) {
      return doubled;
    }
    // e-restoration: bare stem ends in a single consonant preceded by a
    // single vowel and is otherwise short enough that the "e" was likely
    // dropped, e.g. "making" -> stem "mak" -> "make".
    if (
      ingStem.length >= 2 &&
      !VOWEL_RE.test(ingStem[ingStem.length - 1]) &&
      VOWEL_RE.test(ingStem[ingStem.length - 2]) &&
      (ingStem.length < 3 || !VOWEL_RE.test(ingStem[ingStem.length - 3]))
    ) {
      return ingStem + "e";
    }
    return ingStem;
  }

  // -ed
  if (lower.length > 3 && lower.slice(-2) === "ed" && !ED_WORD_EXCEPTIONS[lower]) {
    var edStem = lower.slice(0, -2);
    var doubledEd = restoreStem(edStem);
    if (doubledEd !== edStem) {
      return doubledEd;
    }
    if (edStem.length > 0 && edStem.slice(-1) === "i") {
      return edStem.slice(0, -1) + "y";
    }
    // Guard: a stem of 5+ letters ending in "-er" (e.g. "discover",
    // "enter", "answer" as -ed stems) is, in the overwhelming majority of
    // cases, already a complete base word — appending "e" produces a
    // non-word ("discovere"). Short "-er"-ending stems (e.g. "car" ->
    // "care") are unaffected by this guard and still get restored below.
    var edStemEndsEr = edStem.length >= 2 && edStem.slice(-2) === "er";
    if (edStemEndsEr && edStem.length >= 5) {
      return edStem;
    }
    if (
      edStem.length >= 2 &&
      !VOWEL_RE.test(edStem[edStem.length - 1]) &&
      VOWEL_RE.test(edStem[edStem.length - 2]) &&
      (edStem.length < 3 || !VOWEL_RE.test(edStem[edStem.length - 3]))
    ) {
      return edStem + "e";
    }
    return edStem;
  }

  // Comparative -er / superlative -est for regular adjectives, guarded
  // against common base nouns that happen to end in -er. Deliberately does
  // NOT run the consonant-doubling undo used for -ing/-ed: doing so cannot
  // distinguish a genuinely doubled short-vowel stem ("bigger" -> "big")
  // from a plain word that merely ends in a doubled consonant before "-er"
  // ("smaller" -> stem "small", which is already correct and must not be
  // shortened to "smal"). Known limitation: comparatives with real
  // consonant doubling (e.g. "bigger", "hotter") are returned as "bigg"/
  // "hott" rather than "big"/"hot" — an accepted imperfection per ADR-008.
  if (lower.length > 4 && lower.slice(-2) === "er" && !ER_NOUN_EXCEPTIONS[lower]) {
    var erStem = lower.slice(0, -2);
    if (erStem.length >= 3) {
      return erStem;
    }
  }
  if (lower.length > 5 && lower.slice(-3) === "est") {
    var estStem = lower.slice(0, -3);
    if (estStem.length >= 3 && !ER_NOUN_EXCEPTIONS[estStem + "er"]) {
      return estStem;
    }
  }

  // Plural -es after sibilant/affricate endings ("boxes" -> "box",
  // "churches" -> "church", "wishes" -> "wish") before the generic -s rule.
  if (lower.length > 3 && lower.slice(-2) === "es") {
    var esBase = lower.slice(0, -2);
    var esTail2 = esBase.slice(-2);
    var esTail1 = esBase.slice(-1);
    if (
      esTail1 === "s" ||
      esTail1 === "x" ||
      esTail1 === "z" ||
      esTail2 === "ch" ||
      esTail2 === "sh"
    ) {
      return esBase;
    }
  }

  // Generic plural -s. Heuristic guard: don't strip common noun endings
  // that are frequently NOT plurals in base form (-ss, -us, -is, -ics).
  if (lower.length > 3 && lower.slice(-1) === "s" && lower.slice(-2) !== "ss") {
    var tail2 = lower.slice(-2);
    if (tail2 !== "us" && tail2 !== "is" && lower.slice(-3) !== "ics") {
      return lower.slice(0, -1);
    }
  }

  return lower;
}

/**
 * Splits `text` into sentences on `.`/`!`/`?` followed by whitespace and an
 * uppercase letter (or end of string), using the abbreviation guard list to
 * avoid false splits after "Mr.", "Dr.", etc. Also avoids splitting
 * immediately after a closing quote that follows terminal punctuation
 * inside dialogue (e.g. `"Stop!" she cried.` stays one sentence) by not
 * treating a `.`/`!`/`?` as a boundary when it is immediately followed by a
 * closing quote character that is itself followed by a lowercase word —
 * i.e. we defer the boundary decision to the punctuation AFTER the quote.
 *
 * Known limitation: this is a simple regex-based splitter, not a full
 * parser. Nested/irregular quoting, ellipses, and abbreviations not in the
 * guard list can still produce incorrect boundaries; this is expected and
 * accepted per the task's stated scope (a full solution is out of scope).
 *
 * Never throws. Empty string returns an empty array.
 */
function splitSentences(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  var abbrevSet = {};
  for (var a = 0; a < abbreviations.length; a++) {
    abbrevSet[abbreviations[a]] = true;
  }

  var sentences = [];
  var start = 0;
  var len = text.length;
  var CLOSERS = "\"'”’)";

  for (var i = 0; i < len; i++) {
    var ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") {
      continue;
    }

    // Absorb a run of terminal punctuation ("?!", "...", etc.) and any
    // immediately-following closing quote/paren characters as part of the
    // same boundary candidate.
    var punctEnd = i + 1;
    while (punctEnd < len && (text[punctEnd] === "." || text[punctEnd] === "!" || text[punctEnd] === "?")) {
      punctEnd++;
    }
    while (punctEnd < len && CLOSERS.indexOf(text[punctEnd]) !== -1) {
      punctEnd++;
    }

    // Check abbreviation guard: look at the word token ending at `i+1`
    // (inclusive of the period).
    if (ch === ".") {
      var wordStart = i;
      while (wordStart > 0 && /[A-Za-z]/.test(text[wordStart - 1])) {
        wordStart--;
      }
      var candidate = text.slice(wordStart, i + 1);
      if (abbrevSet[candidate]) {
        continue;
      }
      // Single capital letter + period, e.g. an initial "J." — treat as
      // non-boundary (common in period prose names like "Mr. J. Smith").
      if (i - wordStart === 1 && /[A-Z]/.test(text[wordStart])) {
        continue;
      }
    }

    // Find the next non-whitespace character after the absorbed punctuation.
    var k = punctEnd;
    while (k < len && /\s/.test(text[k])) {
      k++;
    }

    var isBoundary;
    if (k >= len) {
      isBoundary = true; // end of text
    } else if (punctEnd === i + 1 && k === i + 1) {
      // No whitespace at all after the punctuation (e.g. "cried.She") —
      // treat as non-boundary; ambiguous, degrade to not splitting.
      isBoundary = false;
    } else {
      isBoundary = /[A-Z“"']/.test(text[k]);
    }

    if (isBoundary) {
      var sentenceText = text.slice(start, punctEnd);
      sentences.push({ text: sentenceText, start: start, end: punctEnd });
      start = k;
      i = punctEnd - 1; // resume scanning after absorbed punctuation
    }
  }

  if (start < len) {
    var rest = text.slice(start);
    if (/\S/.test(rest)) {
      sentences.push({ text: rest, start: start, end: len });
    }
  }

  return sentences;
}

/** En fazla kaç aday üretilir. Her aday sözlükte bir arama demek. */
var MAX_CANDIDATES = 6;

function pushCandidate(list, value) {
  if (
    typeof value === "string" &&
    value.length > 1 &&
    list.indexOf(value) === -1 &&
    list.length < MAX_CANDIDATES
  ) {
    list.push(value);
  }
}

/**
 * Bir yüzey biçimi için sözlükte denenecek adayları öncelik sırasıyla verir.
 *
 * NEDEN TEK BİR KÖK YETMİYOR (2026-09-07): kural tabanlı gövdeleme
 * (ADR-008) tek bir doğru cevap üretmek zorunda kaldığında her kuralın
 * yanlış olduğu durumlar geri dönüşsüz oluyor. Ölçüm: yayındaki 23.551
 * lemma'nın sıfırı sözlükte eksik — yani kullanıcının gördüğü "karşılık
 * bulunamadı" bir sözlük boşluğu DEĞİL, gövdeleyicinin ürettiği yanlış kök.
 * Örnekler: "hotter" -> "hott", "happier" -> "happi", "believed" ->
 * "believ", "agreed" hiç kısalmıyor.
 *
 * Her kuralı tek tek doğru yapmaya çalışmak yerine, gövdeleyici birkaç
 * makul aday üretiyor ve KARARI SÖZLÜK VERİYOR: bir aday `lemma_canonical`
 * içinde varsa doğrudur. Bu, tek bir kuralı sıkılaştırmanın yaratacağı
 * yeni hataları da önlüyor — örneğin "-er" ikizini açmak "hotter" -> "hot"
 * düzeltirken "butter" -> "but" bozardı; aday olarak eklendiğinde ise
 * "butter" sözlükte bulunduğu için "but" hiç denenmiyor.
 *
 * Adaylar öncelik sırasında: kural sonucu, yüzey biçimi, sonra türevler.
 * Sonuç her zaman en az bir eleman içerir.
 */
function lemmaCandidates(surface) {
  if (typeof surface !== "string" || surface.length === 0) {
    return [];
  }

  var lower = surface.toLowerCase();
  var primary = lemmatize(surface);
  var candidates = [];

  // SIRALAMA ÖNEMLİ. İlk tutan aday kazanıyor, o yüzden hangisinin önce
  // denendiği doğrudan kullanıcının gördüğü çeviri demek. Sıra, kökü
  // üreten KURALIN GÜVENİLİRLİĞİNE göre belirleniyor.
  //
  // YÜKSEK GÜVEN (kök önce): düzensiz tablo ve -ed/-ing/-s/-ies kuralları.
  // "saw" yüzeyi sözlükte "testere" olarak da var ama düzensiz tablo onun
  // "see" olduğunu biliyor; "watched" için de "watch" doğru cevap,
  // sözlükteki "izlenen" sıfat kaydı değil.
  //
  // DÜŞÜK GÜVEN (yüzey önce): iki durum ölçülerek belirlendi.
  //  1. Karşılaştırma -er/-est kuralı. Bu kural bir sözlüğe değil,
  //     istisna listesine dayanıyor ve -er ile biten sıradan isimleri
  //     kırpıyor: "butter" -> "butt" ("kıç"), "letter" -> "lett".
  //  2. Üçten kısa bir kök. Böyle bir kök neredeyse her zaman aşırı
  //     kırpmadır: "dying" -> "dy" ("boya").
  // Her ikisinde de metinde birebir geçen ve sözlükte birebir bulunan
  // yüzey biçimi, üretilen kökten daha güvenilir.
  var isIrregular = Object.prototype.hasOwnProperty.call(irregularLemmas, lower);
  var usedComparativeRule =
    !isIrregular &&
    primary !== lower &&
    (lower.slice(-2) === "er" || lower.slice(-3) === "est");
  var lowConfidence = !isIrregular && (usedComparativeRule || primary.length < 3);

  if (lowConfidence) {
    pushCandidate(candidates, lower);
    pushCandidate(candidates, primary);
  } else {
    pushCandidate(candidates, primary);
    pushCandidate(candidates, lower);
  }

  // Düşürülmüş sondaki "e": "believ" -> "believe", "notic" -> "notice".
  pushCandidate(candidates, primary + "e");

  // Açılmamış ünsüz ikizi: "hott" -> "hot", "bigg" -> "big". Yalnızca
  // ADAY; birincil sonuç olsaydı "butter" -> "but" olurdu.
  var lastTwo = primary.slice(-2);
  if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1] && !/[aeiouwxy]/.test(lastTwo[0])) {
    pushCandidate(candidates, primary.slice(0, -1));
  }

  // "-i" ile biten gövde aslında "-y": "happi" -> "happy", "carri" -> "carry".
  if (primary.slice(-1) === "i") {
    pushCandidate(candidates, primary.slice(0, -1) + "y");
  }

  // Yüzey biçiminin kendi çekimlerini soy: kural hiç tetiklenmediyse
  // ("agreed" gibi istisna listesindeki kelimeler) tek şans bu.
  if (lower.length > 3 && lower.slice(-2) === "ed") {
    pushCandidate(candidates, lower.slice(0, -1)); // agreed -> agree
    pushCandidate(candidates, lower.slice(0, -2)); // walked -> walk
  }
  if (lower.length > 3 && lower.slice(-1) === "s") {
    pushCandidate(candidates, lower.slice(0, -1));
  }

  return candidates;
}

/**
 * Yüzey biçiminin çekim ekinden kelimenin bu cümlede hangi türde
 * kullanıldığını tahmin eder. Bilinmiyorsa null.
 *
 * NEDEN VAR (2026-09-07): sözlükte 2.345 kelimenin hem isim hem fiil
 * anlamı var ve `lemma_canonical` view'i bunlardan hep İSMİ ana karşılık
 * seçiyordu (bkz. migration 027). Kullanıcı "He watched the door"
 * cümlesinde "watched" kelimesine dokunduğunda "kol saati" görüyordu —
 * çeviri eksik değil, YANLIŞ anlamdı.
 *
 * Yüzey biçimi bu belirsizliği büyük ölçüde çözüyor: "-ed"/"-ing" almış
 * bir kelime fiildir, "-er"/"-est" almış bir kelime sıfattır. Bu ipucu
 * cümleyi anlamayı gerektirmiyor, yalnızca eke bakıyor — cihazda
 * bedava, sunucuya bir istek daha atmadan.
 *
 * Bilinçli olarak KESİN OLMAYAN durumlarda null dönüyor: "-s" hem
 * çoğul isim ("cities") hem üçüncü tekil fiil ("runs") olabilir; yanlış
 * bir ipucu, ipucu olmamasından kötüdür (çağıran taraf null'da view'in
 * kendi sırasına düşüyor).
 */
function inflectionHint(surface) {
  // 3 harf, duzensiz gecmis zamanlarin en kisasi ("saw", "ran", "ate").
  if (typeof surface !== "string" || surface.length < 3) {
    return null;
  }

  var lower = surface.toLowerCase();

  // Düzensiz biçimlerin çoğu fiil geçmiş zamanı; tablo bunu zaten
  // biliyor ve kök farklıysa bu bir çekimdir ("saw" -> "see").
  if (
    Object.prototype.hasOwnProperty.call(irregularLemmas, lower) &&
    irregularLemmas[lower] !== lower
  ) {
    return "verb";
  }

  if (lower.slice(-3) === "ing" && !ING_WORD_EXCEPTIONS[lower]) return "verb";
  if (lower.slice(-2) === "ed" && !ED_WORD_EXCEPTIONS[lower]) return "verb";
  if (lower.slice(-3) === "est" && !ER_NOUN_EXCEPTIONS[lower.slice(0, -3) + "er"]) {
    return "adjective";
  }
  if (lower.slice(-2) === "er" && !ER_NOUN_EXCEPTIONS[lower]) return "adjective";

  // "-s": belirsiz (çoğul isim mi, üçüncü tekil fiil mi) — ipucu yok.
  return null;
}

module.exports = {
  tokenize: tokenize,
  lemmatize: lemmatize,
  lemmaCandidates: lemmaCandidates,
  inflectionHint: inflectionHint,
  splitSentences: splitSentences,
};
