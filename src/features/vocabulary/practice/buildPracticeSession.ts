import type { VocabularyWord } from "@/features/vocabulary/types";

/**
 * "Akıllı Tekrar" oturumunu kuran SAF fonksiyon (1.0.6).
 *
 * Rakip analizi (2026-09-24): sektörde para kazandıran şey düz kart değil,
 * karışık alıştırma türleri (Quizlet Learn, Memrise Pro, Babbel Review).
 * Bizim farkımız boşluk doldurmanın kullanıcının OKUDUĞU hikâye cümlesinden
 * kurulması -- rakiplerin çoğu hazır örnek cümle kullanıyor.
 *
 * Rastgelelik dışarıdan veriliyor (`random`) ki oturum testte belirlenebilir
 * olsun.
 */

export type PracticeExerciseKind = "meaning" | "reverse" | "cloze" | "typing" | "listening";

interface BaseExercise {
  kind: PracticeExerciseKind;
  /** Hangi kelime soruluyor -- sonuç özetinde gösteriliyor. */
  wordId: string;
  lemma: string;
  gloss: string;
}

export interface ChoiceExercise extends BaseExercise {
  kind: "meaning" | "reverse" | "cloze" | "listening";
  /** Soruda gösterilen metin (kelime, anlam ya da boşluklu cümle). Dinleme
   * sorusunda gösterilmiyor, seslendiriliyor. */
  prompt: string;
  /** Doğru cevap dahil karışık seçenekler. */
  options: string[];
  answer: string;
}

export interface TypingExercise extends BaseExercise {
  kind: "typing";
  /** Anlam gösteriliyor, kullanıcı kelimeyi yazıyor. */
  prompt: string;
  /** İpucu: kelimenin ilk harfi. */
  hint: string;
  answer: string;
}

export type PracticeExercise = ChoiceExercise | TypingExercise;

export const PRACTICE_SESSION_SIZE = 10;
/** Çoktan seçmeli bir soru için gereken en az kelime (1 doğru + 3 çeldirici). */
export const MIN_PRACTICE_WORDS = 4;
export const CLOZE_BLANK = "_____";

type Random = () => number;

function shuffle<T>(items: T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * Büyük/küçük harfi olan bir harf mi. Çince/Japonca karakterlerin harf
 * büyüklüğü yok; o dillerde kelimeler arasında boşluk olmadığı için sınır
 * yalnızca harf büyüklüğü olan harflerin yanında aranıyor. `\p{L}` düzenli
 * ifadesi kullanılmadı: Hermes'in Unicode özellik kaçışı desteği güvenilir değil.
 */
function isCasedLetter(char: string | undefined): boolean {
  return char !== undefined && char.toLowerCase() !== char.toUpperCase();
}

/**
 * Cümlede kelimenin görüldüğü biçimi tam kelime olarak boşlukla değiştiriyor.
 * Kelime cümlede bulunamazsa null (o kelime için boşluk doldurma kurulmaz).
 */
export function blankOut(sentence: string, surface: string): string | null {
  const needle = surface.trim().toLowerCase();
  if (!needle) return null;
  const haystack = sentence.toLowerCase();
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return null;
    const before = sentence[at - 1];
    const after = sentence[at + needle.length];
    if (!isCasedLetter(before) && !isCasedLetter(after)) {
      return sentence.slice(0, at) + CLOZE_BLANK + sentence.slice(at + needle.length);
    }
    from = at + 1;
  }
  return null;
}

type Gloss = { word: VocabularyWord; gloss: string };

/** Tekrar vadesi gelmiş olanlar önce, sonra henüz öğrenilmemişler, en son bilinenler. */
function priority(word: VocabularyWord, now: number): number {
  if (word.dueAt !== null && new Date(word.dueAt).getTime() <= now) return 0;
  if (word.state === "known") return 2;
  return 1;
}

function distractors(pool: string[], answer: string, random: Random): string[] {
  const unique = Array.from(new Set(pool.filter((item) => item !== answer)));
  return shuffle(unique, random).slice(0, MIN_PRACTICE_WORDS - 1);
}

export function buildPracticeSession(
  words: VocabularyWord[],
  now: number,
  random: Random = Math.random,
  size: number = PRACTICE_SESSION_SIZE,
): PracticeExercise[] {
  const glossed: Gloss[] = words
    .filter((word): word is VocabularyWord & { gloss: string } => Boolean(word.gloss?.trim()))
    .map((word) => ({ word, gloss: word.gloss.trim() }));

  // Aynı anlam iki kelimede varsa seçenekler belirsizleşir; lemma başına tekil.
  const byLemma = new Map<string, Gloss>();
  for (const item of glossed) if (!byLemma.has(item.word.lemma)) byLemma.set(item.word.lemma, item);
  const candidates = Array.from(byLemma.values());
  if (candidates.length < MIN_PRACTICE_WORDS) return [];

  const ordered = shuffle(candidates, random).sort(
    (a, b) => priority(a.word, now) - priority(b.word, now),
  );
  const chosen = ordered.slice(0, size);

  const allGlosses = candidates.map((item) => item.gloss);
  const allLemmas = candidates.map((item) => item.word.lemma);

  return chosen.map(({ word, gloss }, index): PracticeExercise => {
    const base = { wordId: word.id, lemma: word.lemma, gloss };
    const clozePrompt = word.contextText
      ? blankOut(word.contextText, word.surface || word.lemma)
      : null;
    const surfaceAnswer = (word.surface || word.lemma).toLowerCase();

    // Okunan cümlesi olan kelime her zaman boşluk doldurma alıyor (ürünün
    // farkı bu); diğerleri anlam -> ters -> yazma arasında dönüşüyor.
    const rotation: PracticeExerciseKind[] = ["meaning", "listening", "reverse", "typing"];
    const kind: PracticeExerciseKind = clozePrompt
      ? "cloze"
      : (rotation[index % rotation.length] as PracticeExerciseKind);

    if (kind === "cloze" && clozePrompt) {
      const surfaces = candidates.map((item) =>
        (item.word.surface || item.word.lemma).toLowerCase(),
      );
      return {
        ...base,
        kind,
        prompt: clozePrompt,
        answer: surfaceAnswer,
        options: shuffle([surfaceAnswer, ...distractors(surfaces, surfaceAnswer, random)], random),
      };
    }
    if (kind === "listening") {
      return {
        ...base,
        kind,
        // Okurken duyulan biçim seslendiriliyor.
        prompt: word.surface || word.lemma,
        answer: gloss,
        options: shuffle([gloss, ...distractors(allGlosses, gloss, random)], random),
      };
    }
    if (kind === "reverse") {
      return {
        ...base,
        kind,
        prompt: gloss,
        answer: word.lemma,
        options: shuffle([word.lemma, ...distractors(allLemmas, word.lemma, random)], random),
      };
    }
    if (kind === "typing") {
      return {
        ...base,
        kind,
        prompt: gloss,
        hint: word.lemma.slice(0, 1),
        answer: word.lemma,
      };
    }
    return {
      ...base,
      kind: "meaning",
      prompt: word.lemma,
      answer: gloss,
      options: shuffle([gloss, ...distractors(allGlosses, gloss, random)], random),
    };
  });
}

/** Yazılan cevabı karşılaştırır: büyük/küçük harf ve baştaki/sondaki boşluk önemsiz. */
export function isTypedAnswerCorrect(typed: string, answer: string, language: string): boolean {
  const normalize = (text: string) => text.trim().toLocaleLowerCase(language);
  return normalize(typed) === normalize(answer);
}
