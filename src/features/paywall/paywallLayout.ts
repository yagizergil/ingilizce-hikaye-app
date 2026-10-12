import { mascotSize, paywallMetrics, paywallType, spacing } from "@/theme";

/**
 * Paywall'ın ilk ekranı: iki plan kartı + CTA KAYDIRMADAN görünmeli.
 *
 * SORUN (1.1.0 öncesi): kapat satırı (44) + 190 pt maskot + iki satır
 * başlık/alt başlık planları ~610 pt aşağı itiyordu. Sabit alt bölüm
 * (CTA + yasal blok, ~240 pt) düşüldüğünde iPhone SE'de (667) kaydırma
 * alanı ~410, 390x844'te ~560 pt kalıyordu: AYLIK plan ilk ekranda yoktu.
 *
 * ÇÖZÜM: planlar ASLA gizlenmiyor/küçülmüyor; kahraman alanı (maskot,
 * başlık) kalan yüksekliğe göre ölçekleniyor. Kapat düğmesi artık satır
 * yerine köşede yüzüyor. Hesap yalnızca token'lardan -- testi
 * (`__tests__/paywallLayout.test.ts`) aynı fonksiyonu kullanıyor.
 */

/** Sabit alt bölümün tahmini yüksekliği (375 pt genişlikte, en uzun dil
 * metinleriyle): üst/alt dolgu 12+12, CTA 50, "istediğin zaman iptal" 18,
 * yasal blok (dolgu 8 + fiyat 19 + otomatik yenileme 3 satır 57 + bağlantılar
 * 19 + aralıklar 16), bölüm aralıkları 12+12. Üstüne pay. */
export const PAYWALL_FOOTER_ESTIMATE = 240;

/** Deneme rozetli yıllık satır: kenarlık 4 + dikey dolgu 24 + rozet 16 +
 * aralık 8 + gövde 52. */
const ANNUAL_ROW =
  4 + spacing.sm * 2 + paywallMetrics.badgeHeight + spacing.xs + paywallMetrics.planRowHeight;
/** Aylık satır: kenarlık 4 + dolgu 24 + gövde 52. */
const MONTHLY_ROW = 4 + spacing.sm * 2 + paywallMetrics.planRowHeight;
export const PLANS_HEIGHT = ANNUAL_ROW + spacing.sm + MONTHLY_ROW;

const RIBBON_HEIGHT = paywallMetrics.badgeHeight + spacing.sm;
const CLOSE_BUTTON = 44;
/** Bundan küçük maskot okunmuyor; o zaman hiç çizilmiyor (planlar değil). */
const MIN_MASCOT = 56;
/** Kahraman alanı bu kadar maskota yer bırakıyorsa tam boy metin kullanılır. */
const REGULAR_MIN_MASCOT = 96;
const BOTTOM_SLACK = spacing.xs;

/**
 * Deneme zaman çizelgesi kartının tahmini yüksekliği (1.1.0): dolgu 8+8,
 * kenarlık 2, başlık 16 + 4, üç satır x (başlık 21 + gövde 17, bir satırı
 * iki satıra taşabilir) + aralıklar 8+8. Üstüne pay.
 */
export const TIMELINE_ESTIMATE = 190;

export interface PaywallLayoutInput {
  windowHeight: number;
  safeTop: number;
  hasIntroRibbon: boolean;
  /**
   * Planların ALTINDA (CTA'nın hemen üstünde) deneme zaman çizelgesi var mı.
   * Yer varsa kahraman (maskot) ona yer açmak için küçülüyor/kalkıyor;
   * yoksa çizelge kaydırmanın altında kalıyor -- planlar ASLA ona feda
   * edilmiyor.
   */
  hasTimeline?: boolean;
}

export interface PaywallLayout {
  compact: boolean;
  /** Maskotun uzun kenarı; 0 = çizilmiyor. */
  mascotHeight: number;
  gap: number;
  /** İçeriğin üst dolgusu (maskot yoksa kapat düğmesine yer). */
  topPadding: number;
  /** Zaman çizelgesi ilk ekrana sığıyor mu (yerleşim onu hesaba kattı mı). */
  timelineVisible: boolean;
  /** Alt başlık çiziliyor mu (çizelgeye yer açmak için düşürülebilir). */
  showSubtitle: boolean;
}

function textHeight(compact: boolean, subtitle: boolean): number {
  // Başlık ve alt başlık için iki satır varsayılıyor (uzun diller).
  const title = compact ? paywallType.titleCompact.lineHeight : paywallType.title.lineHeight;
  const sub = compact ? paywallType.subtitleCompact.lineHeight : paywallType.subtitle.lineHeight;
  return title * 2 + (subtitle ? sub * 2 : 0);
}

/** Kahraman + planlar için gereken, maskot hariç yükseklik. */
function fixedHeight(
  compact: boolean,
  gap: number,
  topPadding: number,
  ribbon: boolean,
  subtitle = true,
): number {
  return (
    topPadding +
    (ribbon ? RIBBON_HEIGHT + gap : 0) +
    textHeight(compact, subtitle) +
    (subtitle ? gap : 0) + // başlık -> alt başlık
    gap + // alt başlık -> planlar
    PLANS_HEIGHT +
    BOTTOM_SLACK
  );
}

function layoutFor(
  input: PaywallLayoutInput,
  extra: number,
  subtitle = true,
): PaywallLayout | null {
  const viewport = input.windowHeight - input.safeTop - PAYWALL_FOOTER_ESTIMATE - extra;
  const timelineVisible = extra > 0;

  const regularGap = spacing.md;
  const regularRoom =
    viewport -
    fixedHeight(false, regularGap, spacing.xs, input.hasIntroRibbon, subtitle) -
    regularGap;
  if (regularRoom >= REGULAR_MIN_MASCOT) {
    return {
      compact: false,
      mascotHeight: Math.min(mascotSize.hero, regularRoom),
      gap: regularGap,
      topPadding: spacing.xs,
      timelineVisible,
      showSubtitle: subtitle,
    };
  }

  const compactGap = spacing.sm;
  const compactRoom =
    viewport -
    fixedHeight(true, compactGap, spacing.xs, input.hasIntroRibbon, subtitle) -
    compactGap;
  if (compactRoom >= MIN_MASCOT) {
    return {
      compact: true,
      mascotHeight: Math.min(mascotSize.hero, compactRoom),
      gap: compactGap,
      topPadding: spacing.xs,
      timelineVisible,
      showSubtitle: subtitle,
    };
  }

  const bare =
    viewport - fixedHeight(true, compactGap, CLOSE_BUTTON, input.hasIntroRibbon, subtitle);
  if (extra > 0 && bare < 0) return null;
  return {
    compact: true,
    mascotHeight: 0,
    gap: compactGap,
    topPadding: CLOSE_BUTTON,
    timelineVisible,
    showSubtitle: subtitle,
  };
}

export function computePaywallLayout(input: PaywallLayoutInput): PaywallLayout {
  if (input.hasTimeline) {
    // Önce çizelgeyi de ilk ekrana sığdırmayı dene (kahramanı küçülterek).
    const withTimeline = layoutFor(input, TIMELINE_ESTIMATE + spacing.sm);
    if (withTimeline) return withTimeline;
    // Sonra alt başlığı düşürerek (kişisel başlık yine görünüyor).
    const withoutSubtitle = layoutFor(input, TIMELINE_ESTIMATE + spacing.sm, false);
    if (withoutSubtitle) return withoutSubtitle;
  }
  return layoutFor(input, 0) as PaywallLayout;
}

/**
 * Plan kartlarının alt kenarının pencere üstünden uzaklığı (tahmin) ve
 * kaydırma alanının alt kenarı. Test bunların sırasını doğruluyor.
 */
export function estimatePlansBottom(input: PaywallLayoutInput, layout: PaywallLayout): number {
  const mascot = layout.mascotHeight > 0 ? layout.mascotHeight + layout.gap : 0;
  return (
    input.safeTop +
    mascot +
    fixedHeight(
      layout.compact,
      layout.gap,
      layout.topPadding,
      input.hasIntroRibbon,
      layout.showSubtitle,
    ) -
    BOTTOM_SLACK
  );
}

/** Zaman çizelgesinin alt kenarı (planların altında). */
export function estimateTimelineBottom(input: PaywallLayoutInput, layout: PaywallLayout): number {
  return estimatePlansBottom(input, layout) + layout.gap + TIMELINE_ESTIMATE;
}

export function scrollViewportBottom(input: PaywallLayoutInput): number {
  return input.windowHeight - PAYWALL_FOOTER_ESTIMATE;
}
