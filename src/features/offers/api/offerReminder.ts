import {
  cancelReminder,
  getNotificationPermission,
  OFFER_REMINDER_ID,
  scheduleOneOffReminder,
} from "@/lib/notifications";

import { offerReminderFireAt } from "@/features/offers/offerModel";

import type { TFunction } from "i18next";

/**
 * Teklif bitmeden yerel hatırlatma (ADR-010: push yok, yerel bildirim).
 *
 * İZİN İSTENMEZ: bir indirim için iOS'un tek seferlik izin diyaloğunu
 * harcamak, ADR-010'un "izin yalnızca kullanıcının kendi eylemiyle"
 * kuralına aykırı olurdu. İzin zaten verildiyse planlanır.
 */
export async function scheduleOfferReminder(
  expiresAt: number,
  notifyBeforeHours: number | undefined,
  t: TFunction,
): Promise<boolean> {
  const fireAt = offerReminderFireAt(expiresAt, notifyBeforeHours, Date.now());
  if (!fireAt) return false;
  if ((await getNotificationPermission()) !== "granted") return false;
  return scheduleOneOffReminder({
    id: OFFER_REMINDER_ID,
    title: t("offers.sale.reminderTitle"),
    body: t("offers.sale.reminderBody", { hours: notifyBeforeHours }),
    fireAt,
  });
}

/** Satın alma sonrası: artık hatırlatacak bir teklif yok. */
export async function cancelOfferReminder(): Promise<void> {
  await cancelReminder(OFFER_REMINDER_ID);
}
