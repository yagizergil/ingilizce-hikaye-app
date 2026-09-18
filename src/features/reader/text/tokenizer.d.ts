/**
 * Type declarations for the plain-CommonJS `tokenizer.js` sitting next to
 * this file. TS picks this `.d.ts` up automatically for typed imports of
 * `./tokenizer` (allowJs resolves the sibling `.js` for the runtime value,
 * this file for the type) without turning the JS source itself into a
 * TypeScript file — see tokenizer.js's own header comment for why it must
 * stay plain CommonJS (still string-inlined into a WebView `<script>` tag
 * by the soon-to-be-retired WebView reading path).
 */

export interface Token {
  type: "word" | "other";
  text: string;
  start: number;
  end: number;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[];
export function lemmatize(surface: string): string;
/**
 * Sozlukte denenecek koklerin oncelik sirali listesi. Kural tabanli
 * govdeleyici tek bir dogru cevap uretemedigi icin karar sozluge
 * birakiliyor — ayrintili gerekce icin tokenizer.js'teki yorum.
 */
export function lemmaCandidates(surface: string): string[];
/**
 * Yuzey bicimindeki cekim ekinden kelimenin turunu tahmin eder
 * ("watched" -> "verb", "hotter" -> "adjective"). Belirsizse null —
 * gerekce icin tokenizer.js'teki yorum.
 */
export function inflectionHint(surface: string): string | null;
export function splitSentences(text: string): Sentence[];
/**
 * Bir "word" token'ının salt rakamlardan oluşup oluşmadığını (harf
 * içermediğini) söyler -- tıklanabilir/seçilebilir bir kelime olarak
 * SAYILMAMASI gereken token'ları ayıklamak için (bkz. tokenizer.js'teki
 * denetim bulgusu yorumu). "3D" gibi harf içeren karışık token'lar için
 * `false` döner, yalnızca "1945"/"42" gibi tamamen sayısal token'lar için
 * `true`.
 */
export function isNumericToken(text: string): boolean;
