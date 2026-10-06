/**
 * Lingo splash sahnesinin (geliştirici önizlemesi, `features/splash`)
 * renk ve ölçüleri.
 *
 * Neden `src/theme/tokens` altında: ESLint'in hex/ölçü sabiti kuralı
 * yalnızca bu klasöre izin veriyor (bkz. .eslintrc.js). Neden tema
 * moduna bağlı DEĞİL: bu bir marka sahnesi -- gün doğumu gökyüzü ve çayır
 * çizimi açık/sepya/koyu temaya göre değişmiyor, üstündeki renkler de
 * değişmemeli.
 *
 * PALET: sıcak ve canlı (gün doğumu şeftalisi, kehribar, mercan). Soğuk
 * mavi-yeşil ilk sürüm "sıkıcı" bulundu (ürün sahibi, 2026-10-04).
 */
export const splashColors = {
  /** Arka plan görseli yüklenene kadar görünen gökyüzü tonu. */
  skyFallback: "#79CEF5",
  /** Logo harf renkleri (2026-10-06, gökyüzü maviye döndü). */
  letterOrange: "#FD8A1E",
  letterBlue: "#1EA4EA",
  letterGreen: "#44B653",
  letterNavy: "#27346B",
  letterRed: "#E62338",
  letterCoral: "#E5483B",
  letterAmber: "#F29E1F",
  letterPlum: "#4A2C5E",
  /** Logo yazısının arkasındaki yumuşak ışık (okunurluğu artırıyor). */
  letterGlow: "rgba(255, 247, 232, 0.95)",
  sparkle: "#FFB300",
  /** Papağanın arkasındaki gün ışığı hâlesi; kırmızı kuş şeftali göğün
   * üzerinde ayrışsın diye. */
  halo: "#FFF4DC",
  /** Selamlama balonu (sohbet balonu): beyaz zemin, açık mavi yazı. */
  bubbleFill: "rgba(255, 255, 255, 0.94)",
  bubbleText: "#3F7FBF",
  bubbleShadow: "rgba(120, 70, 30, 0.16)",
  controlFill: "rgba(255, 255, 255, 0.86)",
  controlIcon: "#4A2C2A",
} as const;

export const splashType = {
  /** "Lingo" logo yazısı (Nunito ExtraBold ile birlikte kullanılıyor). */
  wordmark: { fontSize: 84, lineHeight: 96, letterSpacing: -1 },
  /** Selamlama balonu metni (Nunito SemiBold ile birlikte). */
  bubble: { fontSize: 14 },
} as const;

export const splashMetrics = {
  bubblePaddingH: 14,
  bubbleRadius: 15,
  /** Sohbet balonunun kuyruğu: kenar uzunluğu (döndürülmüş kare). */
  bubbleTail: 9,
  controlSize: 40,
} as const;
