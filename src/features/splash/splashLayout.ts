/**
 * Splash'ın geometrisi: papağan, logo yazısı ve selamlama çiplerinin ekran
 * ölçüsüne göre yerleşimi. SAF fonksiyonlar -- `__tests__/splashLayout` bunları
 * farklı telefon boyutlarında çakışma ve taşma için sınıyor.
 *
 * Çipler kuşa göre sıralı: üstte üç sıra (kuşa yakın olan önde), her sırada
 * iki çip ortalı; kuşun iki yanında dörder kısa çip. Üst sıralar flex satırı
 * (genişliği içerik belirler), yan çipler kenara sabit hizalanır: yazı tipi
 * ve dil değişse de taşma/çakışma olmaz.
 */
import {
  SPLASH_GREETINGS,
  type SplashBubbleRow,
  type SplashGreeting,
} from "@/features/splash/splashTimeline";

/** Varsayılan (en uzun) papağan oranı; testler en kötü durumla çalışır. */
export const DEFAULT_PARROT_ASPECT = 1.25;
export const CHIP_HEIGHT = 34;
export const CHIP_MARGIN = 14;
/** Logo yazısı satır yüksekliği (`splashType.wordmark.lineHeight`). */
export const WORDMARK_HEIGHT = 96;
/** Kuş görselinin kutusunu ne kadar doldurduğu (kanatlar dahil). */
export const PARROT_FILL = 0.9;
/** Bir çip sırasının yüksekliği (çip + dikey boşluk). */
export const CHIP_ROW_PITCH = 48;
const TOP_GAP = 26;
const TOP_ROWS_BLOCK = 3 * CHIP_ROW_PITCH + TOP_GAP;
/** Üst köşelerdeki kapat/tekrar düğmelerinin altı: güvenli alan + 8 + 40, +8. */
const CONTROLS_CLEARANCE = 56;

export interface SplashGeometry {
  width: number;
  height: number;
  parrotWidth: number;
  parrotHeight: number;
  parrotLeft: number;
  parrotTop: number;
  wordmarkTop: number;
  wordmarkWidth: number;
}

/**
 * @param topInset üst güvenli alan (çentik); üst çip sıraları düğmelerin
 * altına sığsın diye kuş gerekirse aşağı iniyor.
 * @param parrotAspect seçili klibin yükseklik/genişlik oranı.
 */
export function splashGeometry(
  width: number,
  height: number,
  topInset = 0,
  parrotAspect = DEFAULT_PARROT_ASPECT,
): SplashGeometry {
  const parrotWidth = Math.min(width * 0.38, 165, height * 0.2);
  const parrotHeight = parrotWidth * parrotAspect;
  const parrotTop = Math.max(height * 0.32, topInset + CONTROLS_CLEARANCE + TOP_ROWS_BLOCK);
  return {
    width,
    height,
    parrotWidth,
    parrotHeight,
    parrotLeft: (width - parrotWidth) / 2,
    parrotTop,
    // Kuşun ayakları yazının üst kenarına biner (bir tünekte duruyormuş gibi).
    wordmarkTop: parrotTop + parrotHeight - 12,
    wordmarkWidth: Math.min(width * 0.72, 280),
  };
}

/**
 * Balon GENİŞLİĞİ TAHMİNİ -- yalnızca testler için; ekranda genişliği içerik
 * belirliyor. Ölçülen gerçek genişliklerin (Nunito Bold 14) ÜSTÜNDE tutuldu.
 */
export function estimateChipWidth(text: string): number {
  let cjk = 0;
  for (const char of text) if ((char.codePointAt(0) ?? 0) > 0x2e80) cjk += 1;
  const other = Array.from(text).length - cjk;
  return 36 + other * 9 + cjk * 17.5;
}

export interface ChipRect {
  greeting: SplashGreeting;
  /** Tahmini sınır kutusu (testler için). */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Balon sıralarının dikey merkezi (dy sapması HARİÇ). */
export function chipRowCenterY(g: SplashGeometry, row: SplashBubbleRow): number {
  const aboveParrot = g.parrotTop - TOP_GAP - CHIP_HEIGHT / 2;
  switch (row) {
    case "top3":
      return aboveParrot;
    case "top2":
      return aboveParrot - CHIP_ROW_PITCH;
    case "top1":
      return aboveParrot - 2 * CHIP_ROW_PITCH;
    case "side1":
      return g.parrotTop + g.parrotHeight * 0.34;
    case "side2":
      return g.parrotTop + g.parrotHeight * 0.7;
  }
}

/** Balonun üst kenarı: sıra merkezi + dikey sapma - yarım yükseklik. */
export function chipTop(g: SplashGeometry, greeting: SplashGreeting): number {
  return chipRowCenterY(g, greeting.row) + greeting.dy - CHIP_HEIGHT / 2;
}

/** Balonun yatay yaslandığı kenardan uzaklığı. */
export function chipEdge(greeting: SplashGreeting): number {
  return CHIP_MARGIN + greeting.inset;
}

export function layoutChips(g: SplashGeometry): ChipRect[] {
  return SPLASH_GREETINGS.map((greeting) => {
    const width = estimateChipWidth(greeting.text);
    const edge = chipEdge(greeting);
    return {
      greeting,
      left: greeting.side === "right" ? g.width - edge - width : edge,
      top: chipTop(g, greeting),
      width,
      height: CHIP_HEIGHT,
    };
  });
}
