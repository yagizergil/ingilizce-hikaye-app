/**
 * "Eğlenceli macera" tanıtım sahnesi: KATMANLI, koddan animasyonlu.
 *
 * Kaynak: onaylanan karakter görseli (Higgsfield, nano_banana_2_lite); 1076 px
 * genişliğindeki kare katmanlara ayrıldı. Hareket video değil, uygulama içinde
 * Reanimated ile üretiliyor (60 fps, yumuşak geçişli): ilk deneme olan yapay
 * zekâ videosu referanstaki gibi yumuşak/akıcı değildi ve papağan yanlış
 * hareket ediyordu (ürün sahibi, 2026-10-04).
 *
 * Katmanlar (hepsi aynı koordinat sisteminde, `SCENE_SIZE` piksel):
 * - `SCENE_BASE`: papağansız temiz zemin (kadın karakter, orman, kitap).
 * - `SCENE_LEAVES`: dört köşedeki yaprak kümeleri, zeminin AYNI içeriği,
 *   yumuşak kenarlı; köşeye bağlı hafifçe sallanırlar.
 * - `SCENE_PARROT*`: papağan sprite'ı ve sağ gözü yarım/tam kapalı hâlleri.
 * - `ADVENTURE_STILL`: hareketsiz kare (yer tutucu, "hareketi azalt").
 * Alt satırlar `onboardingIntroColors.bg` rengine birebir karışıyor.
 */
export const SCENE_SIZE = { width: 1076, height: 1346 } as const;

export const SCENE_BASE = require("../../../assets/onboarding/scene-base.jpg") as number;
export const ADVENTURE_STILL = require("../../../assets/onboarding/adventure-still.jpg") as number;

export const SCENE_PARROT = require("../../../assets/onboarding/scene-parrot.png") as number;
export const SCENE_PARROT_HALF =
  require("../../../assets/onboarding/scene-parrot-half.png") as number;
export const SCENE_PARROT_CLOSED =
  require("../../../assets/onboarding/scene-parrot-closed.png") as number;
/** Papağan sprite'ının sahnedeki kutusu: x0, y0, x1, y1 (piksel). */
export const PARROT_RECT = { x0: 618, y0: 512, x1: 819, y1: 749 } as const;

export type LeafKey = "tl" | "tr" | "bl" | "br";

export interface LeafLayer {
  key: LeafKey;
  source: number;
  rect: { x0: number; y0: number; x1: number; y1: number };
  /** Sallanma ekseni: yaprağın ekran köşesine bağlandığı nokta. */
  origin: string;
  /** Salınım genliği (derece), süre (ms), başlangıç gecikmesi (ms). */
  amplitude: number;
  duration: number;
  delay: number;
}

export const SCENE_LEAVES: readonly LeafLayer[] = [
  {
    key: "tl",
    source: require("../../../assets/onboarding/scene-leaf-tl.png") as number,
    rect: { x0: 0, y0: 0, x1: 470, y1: 330 },
    origin: "0% 0%",
    amplitude: 1.1,
    duration: 5200,
    delay: 0,
  },
  {
    key: "tr",
    source: require("../../../assets/onboarding/scene-leaf-tr.png") as number,
    rect: { x0: 600, y0: 0, x1: 1076, y1: 340 },
    origin: "100% 0%",
    amplitude: 1.1,
    duration: 6100,
    delay: 900,
  },
  {
    key: "bl",
    source: require("../../../assets/onboarding/scene-leaf-bl.png") as number,
    rect: { x0: 0, y0: 800, x1: 290, y1: 1280 },
    origin: "0% 100%",
    amplitude: 1,
    duration: 4700,
    delay: 400,
  },
  {
    key: "br",
    source: require("../../../assets/onboarding/scene-leaf-br.png") as number,
    rect: { x0: 780, y0: 800, x1: 1076, y1: 1280 },
    origin: "100% 100%",
    amplitude: 1,
    duration: 5600,
    delay: 1300,
  },
];

/** Sahne görselinin yükseklik / genişlik oranı. */
export const ADVENTURE_ASPECT = SCENE_SIZE.height / SCENE_SIZE.width;
