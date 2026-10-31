import type { SubscriptionLifecycle } from "@/features/subscription/lifecycle";

/**
 * Abonelik yaşam döngüsü YEREL bildirimlerinin saf planı (ADR-010: push
 * yok):
 *   - `subscriptionEnding`: yenilemesi KAPALI aboneye bitişe 3 gün kala
 *     (C9 cancelled_active hatırlatması),
 *   - `winback`: bitişten 24 saat sonra; yenilemesi kapalı aboneye VE
 *     denemedeki kullanıcıya (IZLENECEK-YOL §3.2 N1: "deneme bitişi + 24
 *     saat yerel bildirim; açılışta durum kontrolü, dönüştüyse iptal").
 * Her açılışta yeniden planlanıyor: deneme ücretliye döndüyse ya da
 * yenileme geri açıldıysa plan boş döner ve çağıran ikisini de iptal eder.
 * İzin İSTENMEZ; yalnızca verilmişse planlanır.
 *
 * Ödeme sorunu için bildirim YOK (C10: Lingo'da uygulama içi banner yeter).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const ENDING_LEAD_DAYS = 3;
export const WINBACK_DELAY_MS = DAY_MS;

const EARLIEST_HOUR = 9;
const LATEST_HOUR = 21;

/** Gece saatine düşen anı aynı günün gündüzüne çeker. */
function clampToDaytime(date: Date): Date {
  const result = new Date(date.getTime());
  const hour = result.getHours();
  if (hour < EARLIEST_HOUR) result.setHours(EARLIEST_HOUR, 0, 0, 0);
  else if (hour >= LATEST_HOUR) result.setHours(LATEST_HOUR - 1, 0, 0, 0);
  return result;
}

export interface LifecycleNotificationPlan {
  endingAt: Date | null;
  winbackAt: Date | null;
}

export function planLifecycleNotifications(
  lifecycle: SubscriptionLifecycle | null,
  now: Date,
): LifecycleNotificationPlan {
  const empty = { endingAt: null, winbackAt: null };
  if (!lifecycle || !lifecycle.expiresAt) return empty;
  const cancelled = lifecycle.status === "cancelled";
  if (!cancelled && lifecycle.status !== "trial") return empty;
  const end = lifecycle.expiresAt.getTime();
  const minAhead = now.getTime() + 60 * 60 * 1000;

  let endingAt: Date | null = null;
  if (cancelled) {
    endingAt = clampToDaytime(new Date(end - ENDING_LEAD_DAYS * DAY_MS));
    if (endingAt.getTime() < minAhead || endingAt.getTime() >= end) endingAt = null;
  }

  let winbackAt: Date | null = clampToDaytime(new Date(end + WINBACK_DELAY_MS));
  if (winbackAt.getTime() <= end || winbackAt.getTime() < minAhead) winbackAt = null;

  return { endingAt, winbackAt };
}
