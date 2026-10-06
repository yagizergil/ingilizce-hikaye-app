/**
 * Splash'ın zaman çizelgesi ve yerleşimi.
 *
 * KAYNAK: referans videonun 31-95. kareleri (30 fps) tek tek okundu:
 * boş gökyüzü -> logo harfleri sırayla düşer -> kuş küçük bir noktadan
 * büyür, etrafa bakar, TEK gözünü kırpar -> kuşun yanında turuncu
 * kıvılcımlar -> selamlama baloncukları logonun çevresinde belirir.
 * Süreler o karelerden milisaniyeye çevrildi; Lingo'ya uyarlama: logo
 * işareti olarak kendi papağanımız (göz kırpan göz, referanstaki gibi
 * ekranın SOLUNDAKİ göz), harfler "Lingo".
 *
 * Bu dosya SAF veri: bileşenler buradan okuyor, test buradan doğruluyor.
 */
import { splashColors } from "@/theme/tokens/splash";

/** Milisaniye, bileşenin bağlandığı andan itibaren. */
export const SPLASH_TIMING = {
  backgroundFade: 400,
  wordmarkStart: 350,
  letterStagger: 110,
  parrotStart: 900,
  bubblesStart: 1350,
  bubbleStagger: 120,
  sparklesHold: 1000,
  sparklesFade: 350,
} as const;

/** Harf renkleri soldan sağa; sayı kelimenin uzunluğuna eşit olmalı. */
export const WORDMARK_LETTER_COLORS = [
  // Logodaki harf renkleri (assets/brand/lingo-wordmark.png): L turuncu,
  // i mavi, n yeşil, g lacivert, o Lumi kırmızısı.
  splashColors.letterOrange,
  splashColors.letterBlue,
  splashColors.letterGreen,
  splashColors.letterNavy,
  splashColors.letterRed,
] as const;

/**
 * Selamlama balonları. Bunlar çevrilecek arayüz metni DEĞİL: her biri ilgili
 * dilin KENDİ selamı (uygulamanın 10 dili). Yerleşim `splashLayout.ts`'te.
 *
 * Üstteki altı balon kuşun üstündeki boşluğa DAĞINIK durur: her biri bir
 * kenara (`side`) kendi iç boşluğuyla (`inset`) ve küçük bir dikey sapmayla
 * (`dy`) yaslanır; böylece satır satır dizilmiş görünmez, zikzak çizer.
 * Kuşun iki yanında dörder kısa balon durur. Dizi sırası belirme sırasıdır.
 */
export type SplashBubbleRow = "top1" | "top2" | "top3" | "side1" | "side2";

export interface SplashGreeting {
  text: string;
  lang: string;
  row: SplashBubbleRow;
  side: "left" | "right";
  /** Kenardan ek iç boşluk (pt). */
  inset: number;
  /** Satırın dikey merkezinden sapma (pt), +aşağı. */
  dy: number;
}

export const SPLASH_GREETINGS: readonly SplashGreeting[] = [
  { text: "Hello", lang: "en", row: "top3", side: "left", inset: 14, dy: 3 },
  { text: "Hola", lang: "es", row: "top3", side: "right", inset: 52, dy: -3 },
  { text: "Bonjour", lang: "fr", row: "top2", side: "left", inset: 58, dy: -2 },
  { text: "Merhaba", lang: "tr", row: "top2", side: "right", inset: 0, dy: 2 },
  { text: "Здравствуйте", lang: "ru", row: "top1", side: "left", inset: 0, dy: 0 },
  { text: "こんにちは", lang: "ja", row: "top1", side: "right", inset: 34, dy: 4 },
  { text: "你好", lang: "zh", row: "side1", side: "left", inset: 0, dy: 0 },
  { text: "مرحبا", lang: "ar", row: "side1", side: "right", inset: 0, dy: 0 },
  { text: "Ciao", lang: "it", row: "side2", side: "left", inset: 4, dy: 0 },
  { text: "Hallo", lang: "de", row: "side2", side: "right", inset: 0, dy: 0 },
];
