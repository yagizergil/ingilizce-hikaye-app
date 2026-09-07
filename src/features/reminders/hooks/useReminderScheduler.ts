import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useTranslation } from "react-i18next";

import { replaceScheduledReminders, cancelAllReminders } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

import { buildReminderPlan } from "@/features/reminders/reminderPlan";
import { useReminderDataQuery } from "@/features/reminders/api/useReminderDataQuery";
import { useRemindersStore } from "@/features/reminders/hooks/useRemindersStore";

import type { TFunction } from "i18next";
import type { ReminderData } from "@/features/reminders/api/useReminderDataQuery";

interface SchedulerSnapshot {
  enabled: boolean;
  data: ReminderData | undefined;
  t: TFunction;
}

/**
 * Hatırlatmaları kullanıcının güncel durumuna göre yeniden planlar.
 *
 * NEREDE ÇAĞRILIYOR: `ReminderScheduler` bileşeni içinde, o da kök
 * layout'ta `QueryClientProvider`'ın ALTINDA render ediliyor. Doğrudan
 * `RootLayout` içinde çağrılamaz — provider'ı render eden bileşenin
 * kendisi henüz o provider'ın kapsamında değildir ve hook
 * "No QueryClient set" ile düşer.
 *
 * NE ZAMAN ÇALIŞIR: uygulama arka plana alındığında. Neden o an —
 * kullanıcı uygulamayı kapatırken durum kesinleşmiş olur (bugün okudu mu,
 * kaç kart kaldı) ve planlanan bildirimler o kesin duruma dayanır.
 * Açılışta planlamak, kullanıcının o oturumda yapacaklarını hesaba
 * katmayan bayat bir plan üretirdi.
 *
 * NEDEN HER SEFERİNDE SIFIRDAN: bkz. `replaceScheduledReminders` — cihazda
 * kalan bayat bir bildirim ("bitirdiğin kitaba devam et") hatırlatmaların
 * tamamına olan güveni bitirir.
 *
 * NEDEN REF: AppState aboneliği bir kez kurulup uygulama boyunca ayakta
 * kalmalı. Veriler bağımlılık dizisine konsaydı her sorgu tazelemesinde
 * abonelik sökülüp yeniden kurulurdu. Ref yalnızca efekt içinde yazılıyor —
 * render sırasında ref yazmak React'in eşzamanlı modunda güvenli değil.
 */
export function useReminderScheduler(): void {
  const { t } = useTranslation();
  const enabled = useRemindersStore((state) => state.enabled);
  const { data } = useReminderDataQuery(enabled);

  const snapshot = useRef<SchedulerSnapshot>({ enabled, data, t });

  useEffect(() => {
    snapshot.current = { enabled, data, t };
  }, [enabled, data, t]);

  const reschedule = useCallback(async (): Promise<void> => {
    const current = snapshot.current;
    if (!current.enabled || !current.data) return;

    const plan = buildReminderPlan(
      {
        dueCount: current.data.dueCount,
        unfinishedBookTitle: current.data.unfinishedBookTitle,
        streakDays: current.data.streakDays,
        readToday: current.data.readToday,
      },
      new Date(),
    );

    const scheduled = await replaceScheduledReminders(
      plan.map((item) => ({
        id: item.id,
        title: current.t(item.titleKey, item.params),
        body: current.t(item.bodyKey, item.params),
        fireAt: item.fireAt,
      })),
    );

    trackEvent("reminders_scheduled", {
      planned: plan.length,
      scheduled,
      ids: plan.map((item) => item.id).join(","),
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;
      void reschedule();
    });

    return () => subscription.remove();
  }, [reschedule]);

  // Kullanıcı ayarı kapattığı anda planlanmış her şey silinsin — bir
  // sonraki arka plana geçişi beklemek, kapatmadan sonra bildirim
  // gelmesi demek olurdu.
  useEffect(() => {
    if (!enabled) void cancelAllReminders();
  }, [enabled]);
}
