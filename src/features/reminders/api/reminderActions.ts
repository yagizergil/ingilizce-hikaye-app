import { Alert } from "react-native";

import { trackEvent } from "@/lib/analytics";
import {
  DAILY_READING_ID,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleOneOffReminder,
  TRIAL_REMINDER_ID,
} from "@/lib/notifications";

import { useRemindersStore } from "@/features/reminders/hooks/useRemindersStore";
import { trialReminderFireAt } from "@/features/reminders/trialReminder";

import type { TFunction } from "i18next";

/**
 * İzin bu dosyadaki iki akışta da KULLANICININ SEÇTİĞİ ANDA isteniyor
 * (ADR-010'un niyeti): deneme başlattığı an ("bitmeden hatırlatalım mı?")
 * ve onboarding sonunda günlük okuma saatini kendisi açtığı an. Açılışta
 * otomatik izin isteği hâlâ YOK.
 */

/** İzin alınabilir mi -- reddedilmişse paywall hatırlatma vaat etmiyor. */
export async function canOfferReminders(): Promise<boolean> {
  return (await getNotificationPermission()) !== "denied";
}

async function ensurePermission(): Promise<boolean> {
  const current = await getNotificationPermission();
  if (current === "granted") return true;
  if (current === "denied") return false;
  return requestNotificationPermission();
}

/** Deneme bitişinden 2 gün önceye yerel bildirim planlar. */
async function scheduleTrialReminder(trialEndsAt: Date, t: TFunction): Promise<boolean> {
  const fireAt = trialReminderFireAt(trialEndsAt, new Date());
  if (!fireAt) return false;
  const date = trialEndsAt.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  return scheduleOneOffReminder({
    id: TRIAL_REMINDER_ID,
    title: t("reminders.trial.title"),
    body: t("reminders.trial.body", { date }),
    fireAt,
  });
}

/**
 * Deneme başladıktan sonra, bağlam içinde sorar. Kullanıcı cevap verene
 * kadar bekler (paywall ondan sonra kapanıyor). Kapat düğmesini
 * geciktirmez: bu satın almanın SONRASI.
 */
export function offerTrialReminder(trialEndsAt: Date, t: TFunction): Promise<void> {
  return new Promise((resolve) => {
    const finish = async (accepted: boolean) => {
      if (!accepted) {
        trackEvent("trial_reminder_prompt", { result: "declined" });
        resolve();
        return;
      }
      const granted = await ensurePermission();
      const scheduled = granted ? await scheduleTrialReminder(trialEndsAt, t) : false;
      trackEvent("trial_reminder_prompt", { result: granted ? "granted" : "denied" });
      if (scheduled) trackEvent("trial_reminder_scheduled", { ends_at: trialEndsAt.toISOString() });
      if (!granted) {
        Alert.alert(t("reminders.trial.deniedTitle"), t("reminders.trial.deniedBody"));
      }
      resolve();
    };

    Alert.alert(
      t("reminders.trial.askTitle"),
      t("reminders.trial.askBody"),
      [
        { text: t("reminders.trial.askNo"), style: "cancel", onPress: () => void finish(false) },
        { text: t("reminders.trial.askYes"), onPress: () => void finish(true) },
      ],
      { cancelable: true, onDismiss: () => void finish(false) },
    );
  });
}

/** Günlük okuma hatırlatmasını açar (kullanıcının seçtiği saatte). */
export async function enableDailyReadingReminder(
  time: { hour: number; minute: number },
  t: TFunction,
): Promise<boolean> {
  const granted = await ensurePermission();
  trackEvent("reminder_optin", { result: granted ? "granted" : "denied", hour: time.hour });
  if (!granted) return false;

  const scheduled = await scheduleDailyReminder({
    id: DAILY_READING_ID,
    title: t("reminders.daily.title"),
    body: t("reminders.daily.body"),
    ...time,
  });
  if (scheduled) {
    const store = useRemindersStore.getState();
    store.setDailyTime(time);
    store.setEnabled(true);
  }
  return scheduled;
}
