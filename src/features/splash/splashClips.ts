/**
 * Papağan animasyonu: Higgsfield `grok_video_v15_lite` (görselden videoya)
 * çıktısı; ürün sahibi dört adaydan A'yı seçti (2026-10-04).
 *
 * Ham klip: beyaz arka plan şeffaflaştırıldı ve küçültüldü. Tek düzenleme
 * ibik onarımı: kuş zıplarken videonun üst kenarından çıkıp ibiği kesiyordu
 * (13-22. kareler; o pikseller kaynakta yok), ibiğin görünen kısmının eğimi
 * uzatılıp ucu tamamlandı ve tuval üstten uzatıldı.
 *
 * Göz kırpan göz ekranın SOLUNDAKİ gözdür (referanstaki gibi).
 *
 * `sparkle`: göz kırpma anı (klip başından ms), göz konumu (kutuya oranla) ve
 * ışın açıları (derece, -90 yukarı).
 */
export interface SplashClip {
  intro: number;
  last: number;
  /** Yükseklik / genişlik. */
  aspect: number;
  durationMs: number;
  sparkle?: {
    at: number;
    eye: { x: number; y: number };
    angles: readonly number[];
  };
}

export const SPLASH_CLIP: SplashClip = {
  intro: require("../../../assets/splash/clips/a-intro.webp") as number,
  last: require("../../../assets/splash/clips/a-last.png") as number,
  aspect: 433 / 360,
  durationMs: 4042,
  sparkle: { at: 3200, eye: { x: 0.33, y: 0.44 }, angles: [-156, -128, -100] },
};
