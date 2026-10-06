/**
 * "Eğlenceli macera" tanıtım ekranının (onboarding, 1. sayfa) renk ve ölçüleri.
 *
 * Neden `src/theme/tokens` altında: ESLint'in hex/ölçü sabiti kuralı yalnızca
 * bu klasöre izin veriyor (bkz. .eslintrc.js). Neden tema moduna bağlı DEĞİL:
 * bu bir marka sahnesi -- orman illüstrasyonu ve alt yeşil zemin açık/sepya/
 * koyu temaya göre değişmiyor.
 *
 * `bg`, illüstrasyonun alt kısmındaki düz yeşille BİREBİR aynı olmalı:
 * görselin altı bu renge yumuşakça karışıyor (bkz. `scene-base.jpg`).
 */
export const onboardingIntroColors = {
  // 2026-10-06: yeni tanıtım görsellerinin alt kenarı (#154036 civarı).
  bg: "#154036",
  title: "#F6B93B",
  subtitle: "#ECF6F0",
  dotActive: "#FFFFFF",
  dotIdle: "rgba(255, 255, 255, 0.35)",
  buttonFill: "#FFFFFF",
  buttonText: "#1E2824",
  controlFill: "rgba(255, 255, 255, 0.86)",
  controlIcon: "#1E2824",
} as const;

export const onboardingIntroType = {
  title: { fontSize: 30, lineHeight: 38 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  button: { fontSize: 15, letterSpacing: 0.8 },
  /** Kitaptan çıkan kelime balonu. */
  word: { fontSize: 15 },
} as const;

export const onboardingIntroMetrics = {
  buttonHeight: 56,
  dot: 7,
  dotGap: 7,
  controlSize: 40,
  /** Sahne alanının ekran yüksekliğine oranı. */
  sceneRatio: 0.6,
} as const;

/** Açılış (logo) ve "Merhaba, ben Lumi" ekranları: açık gökyüzü. */
export const onboardingSkyColors = {
  sky: "#D6EEFB",
  bubble: "#FFFFFF",
  bubbleText: "#3A93CF",
  title: "#1E2824",
  body: "#4A5550",
  cta: "#F5B531",
  ctaText: "#3B2A06",
} as const;

export const onboardingSkyType = {
  title: { fontSize: 28, lineHeight: 34 },
  body: { fontSize: 16, lineHeight: 23 },
  button: { fontSize: 16 },
  bubble: { fontSize: 14 },
} as const;
