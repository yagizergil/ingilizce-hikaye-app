/**
 * Ana sayfa "ikinci şans" teklif kartının SAF kuralı (1.1.0).
 *
 * VERİ: onboarding paywall'ını kapatanlar nadiren dönüyor ve 40 okur
 * onboarding dışında hiç paywall görmedi. Kart okuyucunun DIŞINDA (Ürün
 * İlkesi #1), kapatılabilir ve sık değil:
 *   - yalnızca ücretsiz VE denemeye uygun kullanıcı (deneme vaadi gerçek),
 *   - yalnızca kullanıcı İLK BÖLÜMÜNÜ bitirdikten sonra (değeri yaşadı;
 *     rakip analizi 2026-10-12) -- uygulama açılışında değil,
 *   - son gösterimden/kapatmadan en az 72 saat sonra.
 */

export const HOME_OFFER_COOLDOWN_MS = 72 * 60 * 60 * 1000;

export interface HomeOfferInput {
  now: number;
  /** İlk bölümün bitirildiği an; null = henüz bitirmedi. */
  firstChapterFinishedAt: number | null;
  /** Son gösterim ya da kapatma anı. */
  lastShownAt: number | null;
  isPremium: boolean;
  /** Uygun denemenin gün sayısı; yoksa null. */
  trialDays: number | null;
}

export function shouldShowHomeOffer(input: HomeOfferInput): boolean {
  if (input.isPremium || input.trialDays === null) return false;
  if (input.firstChapterFinishedAt === null) return false;
  if (input.lastShownAt !== null && input.now - input.lastShownAt < HOME_OFFER_COOLDOWN_MS) {
    return false;
  }
  return true;
}
