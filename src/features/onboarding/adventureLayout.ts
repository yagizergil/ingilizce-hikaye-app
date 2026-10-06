/**
 * "Eğlenceli macera" sahnesindeki kelime balonlarının yerleşimi.
 *
 * Koordinatlar SAHNE GÖRSELİNİN oranıdır (0-1, görselin sol-üst köşesinden):
 * görsel kutuya genişliğe göre oturtulup ALTTAN hizalanır, kısa ekranda üstten
 * kırpılır; `sceneToBox` bu dönüşümü yapar. Bu dosya SAF: `__tests__/adventureLayout`
 * balonların karakterle ve papağanla çakışmadığını farklı telefon genişliklerinde sınıyor.
 *
 * Ölçüler `lingo-parrot` değil `adventure-scene.webp` karesinden okundu:
 * kadın x 0.31-0.60, papağan x 0.58-0.78; kitap (0.60, 0.56).
 */
export const BOOK = { x: 0.6, y: 0.56 } as const;

/** Karakterin kapladığı alanlar (sahne oranı); kelimeler buraya girmez. */
export const KEEP_CLEAR = [
  { name: "woman", x0: 0.3, x1: 0.61, y0: 0.27, y1: 0.95 },
  { name: "parrot", x0: 0.57, x1: 0.79, y0: 0.35, y1: 0.61 },
] as const;

export interface AdventureWord {
  text: string;
  /** Balonun varacağı yer (sahne oranı, merkez). */
  x: number;
  y: number;
}

/** Kitaptan çıkıp karakterin iki yanına ve üstüne süzülen selamlar. */
export const ADVENTURE_WORDS: readonly AdventureWord[] = [
  { text: "Hello", x: 0.17, y: 0.34 },
  { text: "Hola", x: 0.85, y: 0.24 },
  { text: "Bonjour", x: 0.3, y: 0.14 },
  { text: "你好", x: 0.14, y: 0.59 },
  { text: "こんにちは", x: 0.72, y: 0.13 },
  { text: "Ciao", x: 0.86, y: 0.67 },
];

export const WORD_HEIGHT = 32;

/** Balon genişliği tahmini (testler için; ekranda genişliği içerik belirler). */
export function estimateWordWidth(text: string): number {
  let cjk = 0;
  for (const char of text) if ((char.codePointAt(0) ?? 0) > 0x2e80) cjk += 1;
  const other = Array.from(text).length - cjk;
  return 34 + other * 9 + cjk * 17.5;
}

/** Sahne oranını kutu (px) koordinatına çevirir: görsel genişliğe oturur, alttan hizalı. */
export function sceneToBox(
  xf: number,
  yf: number,
  boxWidth: number,
  boxHeight: number,
  imageAspect: number,
): { x: number; y: number } {
  const imageHeight = boxWidth * imageAspect;
  return { x: xf * boxWidth, y: boxHeight - imageHeight + yf * imageHeight };
}

/**
 * Kelimenin merkezini kutunun içinde tutar: kısa ekranda sahne üstten
 * kırpıldığı için üstteki balonlar kutunun dışına çıkabilir; dikeyde kenara
 * `WORD_HEIGHT / 2 + 6` pt kala sabitlenir.
 */
export function placeWord(
  word: AdventureWord,
  boxWidth: number,
  boxHeight: number,
  imageAspect: number,
): { x: number; y: number } {
  const point = sceneToBox(word.x, word.y, boxWidth, boxHeight, imageAspect);
  const margin = WORD_HEIGHT / 2 + 6;
  return { x: point.x, y: Math.min(Math.max(point.y, margin), boxHeight - margin) };
}
