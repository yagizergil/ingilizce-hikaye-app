import { Platform } from "react-native";

import * as Notifications from "expo-notifications";

import { trackError } from "@/lib/analytics";

/**
 * Yerel bildirim altyapısı.
 *
 * NEDEN YALNIZCA YEREL (LOCAL) BİLDİRİM: hatırlatmaların ihtiyaç duyduğu
 * her şey cihazda zaten var — vadesi gelen kart sayısı, yarım kalan kitap,
 * seri. Uzak (push) bildirim için APNs sertifikası, bir bildirim sunucusu
 * ve kullanıcı cihaz jetonlarının saklanması gerekirdi; hiçbiri bu üç
 * hatırlatmaya değer değil. "Basitlik önce gelir" (CLAUDE.md).
 *
 * Yan fayda: yerel bildirimler Expo Go'da da çalışıyor, yani hatırlatma
 * akışını test etmek için derleme beklemek gerekmiyor.
 *
 * NEDEN SARMALAYICI: `expo-notifications` API'si platforma göre dallanıyor
 * (Android kanalı, iOS izin şekli) ve izin isteme anı ürün kararı içeriyor.
 * Bunların bileşenlere sızmaması için tek kapı burası.
 */

/** Uygulamanın kullandığı tek Android bildirim kanalı. */
const ANDROID_CHANNEL_ID = "reminders";

/**
 * Uygulama ön plandayken bildirim GÖSTERİLMEZ.
 *
 * Kullanıcı zaten uygulamanın içindeyken "12 kelimen tekrar bekliyor"
 * banner'ı göstermek, ona zaten baktığı şeyi haber vermek olur.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface ScheduledReminder {
  /** Aynı hatırlatmanın iki kez planlanmasını engelleyen sabit kimlik. */
  id: string;
  title: string;
  body: string;
  /** Bildirimin gösterileceği an. Geçmişte kalan bir tarih planlanmaz. */
  fireAt: Date;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Hatırlatmalar",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0, 250],
  });
}

/** Kullanıcı bildirimlere daha önce izin verdi mi (yeni istek YAPMAZ). */
export async function getNotificationPermission(): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch (error) {
    trackError("notifications.getPermission", error);
    return "denied";
  }
}

/**
 * İzin ister.
 *
 * ÜRÜN KARARI — İZİN AÇILIŞTA İSTENMEZ: iOS izin diyaloğu kullanıcı başına
 * BİR KEZ gösterilebilir; reddedilirse tek yol Ayarlar'dır. Uygulamayı ilk
 * açan, henüz neden bildirim isteyeceğini bilmeyen kullanıcıya sormak o tek
 * şansı harcamaktır. Bu yüzden izin yalnızca kullanıcı hatırlatmaları
 * açıkça açtığında isteniyor (Profil > Hatırlatmalar).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureAndroidChannel();
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return status === "granted";
  } catch (error) {
    trackError("notifications.requestPermission", error);
    return false;
  }
}

/**
 * Planlanmış TÜM hatırlatmaları siler ve verilen listeyi yeniden planlar.
 *
 * NEDEN HEP SIFIRDAN: hatırlatmaların içeriği kullanıcının durumuna bağlı
 * ("12 kelime", "The Gift of the Magi"). Var olanları tek tek güncellemeye
 * çalışmak, cihazda bayat bir bildirimin kalması riskini doğurur — kullanıcı
 * çoktan bitirdiği bir kitabı hatırlatan bir bildirim, hatırlatmaların
 * tamamına olan güveni bitirir.
 */
export async function replaceScheduledReminders(reminders: ScheduledReminder[]): Promise<number> {
  try {
    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    let scheduled = 0;

    for (const reminder of reminders) {
      const seconds = Math.round((reminder.fireAt.getTime() - now) / 1000);
      // Geçmişte kalan ya da neredeyse şimdi olan bir tarihi planlamak,
      // bildirimi anında patlatır.
      if (seconds < 60) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: reminder.body,
          // Sessiz bildirim: hatırlatmalar acil değil, kullanıcıyı
          // sesle bölmeleri için bir sebep yok.
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
      scheduled += 1;
    }

    return scheduled;
  } catch (error) {
    trackError("notifications.schedule", error, { count: reminders.length });
    return 0;
  }
}

/** Kullanıcı hatırlatmaları kapattığında her şeyi temizler. */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    trackError("notifications.cancelAll", error);
  }
}
