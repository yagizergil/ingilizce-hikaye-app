/**
 * Ücretsiz deneme hatırlatmasının SAF tarih mantığı (1.1.0).
 *
 * Paywall'daki zaman çizelgesi "{{day}}. gün: hatırlatırız" diyor; bu
 * fonksiyonlar o günün ve bildirimin ne zaman gideceğinin TEK kaynağı.
 * Çizelge ile bildirim farklı günleri hesaplarsa söz tutulmamış olur
 * (Guideline 2.3.1).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bitişten kaç gün önce hatırlatılıyor. Ürün kararı (2026-10-12): deneme
 * iki planda da 3 gün (Apple'ın en kısası); 3 gün ve altı denemede 24 saat
 * önce, daha uzunlarda 2 gün önce. Süre HER ZAMAN RevenueCat introPrice'tan
 * geliyor, burada sabit bir "7" yok.
 */
export function trialReminderLeadDays(trialDays: number): number {
  return trialDays <= 3 ? 1 : 2;
}

/** Gece rahatsız etmemek için bildirimin düşebileceği saat aralığı. */
const EARLIEST_HOUR = 9;
const LATEST_HOUR = 21;

/**
 * Denemenin kaçıncı gününde hatırlatıldığı ("5. gün" -- 7 günlük denemede).
 * Deneme hatırlatmaya yer bırakmayacak kadar kısaysa null: çizelge o satırı
 * hiç göstermiyor.
 */
export function trialReminderDay(trialDays: number): number | null {
  const day = trialDays - trialReminderLeadDays(trialDays);
  return day >= 1 ? day : null;
}

/** Bugün başlayan denemenin ücretinin alınacağı tarih. */
export function trialChargeDate(now: Date, trialDays: number): Date {
  return new Date(now.getTime() + trialDays * DAY_MS);
}

/**
 * Bildirimin gideceği an: bitişten 24 saat (<=3 gün deneme) ya da 2 gün önce, gece saatlerine düşüyorsa
 * aynı günün gündüzüne çekilerek. Planlanamayacak kadar yakınsa null.
 */
export function trialReminderFireAt(trialEndsAt: Date, now: Date): Date | null {
  // Deneme süresi bitiş anından türetiliyor (deneme şimdi başladı).
  const trialDays = Math.round((trialEndsAt.getTime() - now.getTime()) / DAY_MS);
  const fireAt = new Date(trialEndsAt.getTime() - trialReminderLeadDays(trialDays) * DAY_MS);
  const hour = fireAt.getHours();
  if (hour < EARLIEST_HOUR) fireAt.setHours(EARLIEST_HOUR, 0, 0, 0);
  else if (hour >= LATEST_HOUR) fireAt.setHours(LATEST_HOUR - 1, 0, 0, 0);

  // Çekilen saat bitişi geçmemeli ve şimdiden en az bir saat sonra olmalı.
  if (fireAt.getTime() >= trialEndsAt.getTime()) return null;
  if (fireAt.getTime() - now.getTime() < 60 * 60 * 1000) return null;
  return fireAt;
}
