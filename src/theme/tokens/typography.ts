/**
 * Design token: typography.
 *
 * FAZ 1 — REFERANS UYGULAMA EŞLEŞTİRMESİ (2026-09-14): tasarımcının verdiği
 * referans uygulama ("dicto") ekran görüntüleri incelendi. Referans, başlık
 * ve UI metinlerinde SERİF (eski Fraunces) ya da MONOSPACE (eski IBM Plex
 * Mono) DEĞİL, yuvarlak hatlı/geometrik bir sans-serif kullanıyor (örn.
 * "Kelimeler", "dicto" logotype, bölüm başlıkları, liste satırları — hepsi
 * aynı yuvarlak sans ailesi, farklı ağırlıklarda). Okuma yüzeyindeki uzun
 * metin (reader gövdesi) ise klasik bir serif — bu tek nokta değişmedi,
 * Literata zaten o rolü karşılıyor.
 *
 * Seçilen font: Nunito (`@expo-google-fonts/nunito`). Gerekçe: referanstaki
 * yuvarlak terminal/gövde karakterine en yakın, geniş ağırlık yelpazesi
 * (200-900) tek ailede mevcut (önceden ayrı Fraunces+IBM Plex Mono iki aile
 * gerektiriyordu, artık tek aile hem başlık hem etiket rolünü karşılıyor),
 * ve tam Latin Extended (ğ, ş, ı, ç, ö, ü) desteği var.
 *
 * Bu faz yalnızca FONT AİLESİ + AĞIRLIK eşleştirmesidir — punto/satır
 * yüksekliği/harf aralığı değerleri bir sonraki fazda (ekran ekran ölçü
 * karşılaştırması) ayrıca gözden geçirilecek; burada değiştirilmedi ki tek
 * bir değişkenin etkisi net görülebilsin.
 *
 * Üç font ailesi:
 *  - Nunito       — başlıklar, bölüm başlıkları, buton/etiket/rozet/nav
 *    metni, sayaçlar. Artık TEK UI ailesi (eskiden Fraunces başlıkta, IBM
 *    Plex Mono etikette diye ikiye bölünmüştü).
 *  - Literata     — story gövde metni + okuma yüzeyi kendi chrome'u
 *    (bölüm alt başlığı, kelime sözlüğü sheet'i, kelime defteri karşılığı).
 *  - (IBM Plex Mono ve Fraunces kaldırıldı — bkz. package.json.)
 */

export const fontFamily = {
  nunitoRegular: "Nunito_400Regular",
  nunitoMedium: "Nunito_500Medium",
  nunitoSemiBold: "Nunito_600SemiBold",
  nunitoBold: "Nunito_700Bold",
  nunitoExtraBold: "Nunito_800ExtraBold",
  literataRegular: "Literata_400Regular",
  literataRegularItalic: "Literata_400Regular_Italic",
} as const;

export interface TypeStyle {
  /** `undefined` means "use the platform system font" (RN's default when
   * fontFamily is omitted) -- used by the reading scale's "sans" choice. */
  fontFamily: string | undefined;
  fontSize: number;
  /** Concrete px line-height (RN wants a number, not a unitless ratio). */
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700" | "800";
  letterSpacing: number;
  fontStyle?: "normal" | "italic";
  textTransform?: "uppercase";
}

/**
 * Nunito ("display") scale — başlıklar, bölüm başlıkları, kitap adları.
 * Punto/satır yüksekliği değerleri Faz 0'dan (Fraunces dönemi) aynen
 * taşındı; bu fazda yalnızca fontFamily/fontWeight referans uygulamanın
 * kalın/yuvarlak görünümüne göre değişti (bkz. dosya başı notu).
 */
export const type = {
  /** Uygulamanın ana ekranındaki logotype/wordmark. Referans uygulamada
   * ("dicto") bu daha ince bir ağırlıktaydı; burada extraBold tutuldu ki
   * ekran başlıklarıyla aynı aileden ama daha büyük/vurgulu bir logotype
   * gibi okunsun -- ince ağırlık tercih edilirse ileride nunitoSemiBold'a
   * indirilebilir, bu bir tasarım tercihi notu. */
  wordmark: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
  display: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.34,
  },
  screenTitle: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  heroTitle: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  continueTitle: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: 0,
  },
  wordLemma: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionHeading: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bookTitleLg: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: 0,
  },
  bookTitleMd: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: 0,
  },
  chapterRowTitle: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0,
  },
} as const;

/**
 * Literata ("reading") scale — story body text and the reading surface's
 * own chrome. Referans uygulamada da reader gövdesi serif -- bu katman
 * DEĞİŞMEDİ. `readingBody` is user-adjustable (font size / line height
 * sliders per profile.html "Okuma Fontu Boyutu"), so it's exposed as a
 * function, not a static token — see `getReadingTypeScale` below.
 */
export const readingType = {
  chapterSubtitle: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
  wordPreview: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
  gloss: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
} as const satisfies Record<string, TypeStyle>;

/**
 * Nunito ("mono" — isim tarihsel, artık monospace değil) scale — her
 * etiket, meta metin, istatistik sayısı, nav öğesi ve rozet. Referans
 * uygulamada bu tür küçük metinler PROPORTIONAL bir sans ile yazılıyor
 * (mono görünüm yok) -- bu yüzden eski IBM Plex Mono tamamen Nunito'ya
 * taşındı. `textTransform`/`letterSpacing` değerleri Faz 0'dan aynen
 * korundu (bu fazın kapsamı yalnızca font ailesi/ağırlığı).
 */
export const monoType = {
  eyebrow: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.54, // .14em @ 11px
    textTransform: "uppercase",
  },
  label: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 1.2, // .12em @ 10px
    textTransform: "uppercase",
  },
  meta: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    letterSpacing: 0.3, // .03em @ 10px
  },
  metaTight: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    letterSpacing: 0,
  },
  locationLabel: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    letterSpacing: 0.5, // .05em @ 10px
    textTransform: "uppercase",
  },
  badge: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  /**
   * Kapak üstündeki seviye rozeti (A1..C2).
   *
   * ÖLÇÜ REFERANSTAN (docs/reference/referance1.jpeg): büyük harf
   * yüksekliği 22 px / 2.4046 = ~9 pt, yani ~13 pt kalın gövde. `badge`
   * (10 pt, harf aralıklı) referanstakinin belirgin şekilde altındaydı;
   * kapağın üstünde okunmuyordu. Harf aralığı 0: iki karakterlik bir
   * etikette aralık, ortalamayı bozmaktan başka bir şey yapmıyor.
   */
  levelBadge: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  /**
   * Kapak üstündeki "okundu" etiketi -- referansta seviye rozetiyle AYNI
   * büyük harf yüksekliğinde (22 px), yani aynı gövde ölçüsü.
   */
  coverTag: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  percent: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  moreLink: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  author: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    letterSpacing: 0.22,
  },
  authorLg: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  statValue: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statValueLg: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statValueXl: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: 0,
  },
  statLabel: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.54, // .06em @ 9px
    textTransform: "uppercase",
  },
  dueLabel: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.45, // .05em @ 9px
    textTransform: "uppercase",
  },
  sourceLabel: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "500",
    letterSpacing: 0,
  },
  tag: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.36, // .04em @ 9px
    textTransform: "uppercase",
  },
  posLabel: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.54,
    textTransform: "uppercase",
  },
  wordGlossMono: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  buttonLabel: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.96, // .08em @ 12px
    textTransform: "uppercase",
  },
  chapterIndex: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  rowText: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 0,
  },
  footerNote: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0,
  },
  summary: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    letterSpacing: 0.22,
  },
} as const satisfies Record<string, TypeStyle>;

/** User-adjustable reader preferences (profile.html "Okuma Fontu Boyutu"
 * row, shown as a percentage). Range is not specified by any mockup —
 * kept from the previous token attempt's values since it's a behavioral
 * range, not a visual constant, and the mockups only show the 100%
 * default state. Flag for product to confirm min/max/step. */
export const readerFontScale = {
  min: 0.85,
  max: 1.6,
  step: 0.1,
  default: 1,
} as const;

export const readerLineHeightScale = {
  min: 1.2,
  max: 2,
  step: 0.1,
  default: 1.7, // reader.html `.reading` — line-height:1.7 is the mockup default, not 1.5
} as const;

/** reader.html `.reading` — font-size:18px, line-height:1.7 (=30.6px),
 * color var(--ink) [reader's own #241F19 -> `theme.text.reading`],
 * font-family Literata. This is the base the font-size slider scales. */
const READING_BASE_FONT_SIZE = 18;

/**
 * Reading-surface type scale, driven by the user's font-size/line-height
 * preferences (settings sliders use readerFontScale/readerLineHeightScale
 * as their min/max/step). `scale` is a multiplier on the base reading font
 * size (18px, from reader.html `.reading`); `lineHeightScale` is a direct
 * line-height-to-font-size ratio (mockup default 1.7). This function is the
 * single place that turns those two stored multipliers into concrete pixel
 * values.
 */
export function getReadingTypeScale(
  scale: number = readerFontScale.default,
  lineHeightScale: number = readerLineHeightScale.default,
  fontFamilyChoice: "serif" | "sans" = "serif",
): { paragraph: TypeStyle } {
  const fontSize = Math.round(READING_BASE_FONT_SIZE * scale);
  const lineHeight = Math.round(fontSize * lineHeightScale);

  // "serif" keeps the mockup-sourced Literata reading font. "sans" falls
  // back to RN's platform system font (fontFamily: undefined) rather than
  // bundling a new font family -- "basitlik önce gelir" (CLAUDE.md): no new
  // dependency until the current one is proven insufficient.
  const resolvedFontFamily = fontFamilyChoice === "serif" ? fontFamily.literataRegular : undefined;

  return {
    paragraph: {
      fontFamily: resolvedFontFamily,
      fontSize,
      lineHeight,
      fontWeight: "400",
      letterSpacing: 0,
    },
  };
}

/**
 * Paywall'a özel tipografi -- ÖLÇÜLDÜ (docs/reference/paywall1.jpeg ve
 * paywall2.jpeg, 945 px genişlik, 1pt = 2.4046px).
 *
 * NEDEN AYRI BİR ÖLÇEK: paywall referansı uygulamanın geri kalanından
 * belirgin şekilde daha iri tipografi kullanıyor (başlık 28 pt, CTA 20 pt);
 * bu ölçüleri paylaşılan `type` ölçeğine karıştırmak, paywall'ı düzeltirken
 * kütüphaneyi bozmak demekti. Ölçüler burada, tek yerde.
 *
 * Kaynak ölçümler (piksel -> pt):
 *   başlık "dicto Premium" gövde yüksekliği 51 px -> ~28 pt
 *   alt başlık satırı 40 px -> ~18 pt
 *   plan başlığı ("Yıllık") ~48 px -> 20 pt
 *   plan fiyatı 20 pt, plan alt notu 15 pt
 *   rozet metni ("3 gün ücretsiz") 37 px -> 13 pt
 *   bölüm etiketi ("ABONELİK AVANTAJLARI") 13 pt, büyük harf
 *   fayda başlığı 25 px -> 17 pt, fayda gövdesi 15 pt
 *   CTA metni 38 px -> 20 pt kalın
 *   yasal satır 13 pt
 */
export const paywallType = {
  title: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: 0,
  },
  sectionLabel: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  planTitle: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: 0,
  },
  planPrice: {
    fontFamily: fontFamily.nunitoSemiBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: 0,
  },
  planNote: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0,
  },
  planBadge: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 0,
  },
  benefitTitle: {
    fontFamily: fontFamily.nunitoBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0,
  },
  benefitBody: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    letterSpacing: 0,
  },
  cta: {
    fontFamily: fontFamily.nunitoExtraBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 0,
  },
  legal: {
    fontFamily: fontFamily.nunitoMedium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
} as const satisfies Record<string, TypeStyle>;
