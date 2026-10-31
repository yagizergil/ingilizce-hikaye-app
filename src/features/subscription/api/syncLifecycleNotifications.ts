import { trackEvent } from "@/lib/analytics";
import {
  cancelReminder,
  getNotificationPermission,
  scheduleOneOffReminder,
  SUBSCRIPTION_ENDING_ID,
  WINBACK_REMINDER_ID,
} from "@/lib/notifications";

import { formatDay } from "@/features/subscription/api/storeLinks";
import { planLifecycleNotifications } from "@/features/subscription/lifecycleNotifications";

import type { TFunction } from "i18next";
import type { SubscriptionLifecycle } from "@/features/subscription/lifecycle";

/**
 * Yaşam döngüsü bildirimlerini güncel duruma göre yeniden kurar (her
 * açılışta). İzin YOKSA hiçbir şey planlanmaz ve izin İSTENMEZ (ADR-010:
 * izin yalnızca kullanıcının kendi eylemiyle). Planın boş olduğu
 * bildirimler iptal edilir -- deneme ücretliye döndüyse winback gitmez.
 */
export async function syncLifecycleNotifications(
  lifecycle: SubscriptionLifecycle,
  t: TFunction,
  language: string,
): Promise<void> {
  const plan = planLifecycleNotifications(lifecycle, new Date());
  const permission = await getNotificationPermission();

  if (plan.endingAt && permission === "granted" && lifecycle.expiresAt) {
    const scheduled = await scheduleOneOffReminder({
      id: SUBSCRIPTION_ENDING_ID,
      title: t("subscription.ending.notifTitle"),
      body: t("subscription.ending.notifBody", { date: formatDay(lifecycle.expiresAt, language) }),
      fireAt: plan.endingAt,
    });
    if (scheduled) trackEvent("subscription_ending_reminder_scheduled");
  } else {
    await cancelReminder(SUBSCRIPTION_ENDING_ID);
  }

  if (plan.winbackAt && permission === "granted") {
    const scheduled = await scheduleOneOffReminder({
      id: WINBACK_REMINDER_ID,
      title: t("subscription.winback.notifTitle"),
      body: t("subscription.winback.notifBody"),
      fireAt: plan.winbackAt,
    });
    if (scheduled) trackEvent("winback_reminder_scheduled", { status: lifecycle.status });
  } else {
    await cancelReminder(WINBACK_REMINDER_ID);
  }
}
