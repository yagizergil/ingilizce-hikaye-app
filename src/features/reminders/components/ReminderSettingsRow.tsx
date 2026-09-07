import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Switch, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

import { useRemindersStore } from "@/features/reminders/hooks/useRemindersStore";

/**
 * Profil > Hesap listesindeki "Hatırlatmalar" satırı.
 *
 * NEDEN İZİN BURADA İSTENİYOR: iOS bildirim izni diyaloğu kullanıcı başına
 * bir kez gösterilebilir; reddedilirse geri dönüşü yalnızca Ayarlar'dır.
 * Bu yüzden izin, kullanıcı hatırlatmaları AÇIKÇA açtığı anda isteniyor —
 * o an ne için izin verdiğini bilen tek an.
 *
 * İZİN DAHA ÖNCE REDDEDİLDİYSE: anahtarı sessizce geri kapatmak yerine
 * kullanıcıya ne olduğu söyleniyor ve Ayarlar'a gitme yolu sunuluyor.
 * Sessizce geri kapanan bir anahtar, bozuk bir arayüz gibi görünür.
 */
export function ReminderSettingsRow() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const enabled = useRemindersStore((state) => state.enabled);
  const setEnabled = useRemindersStore((state) => state.setEnabled);
  const [busy, setBusy] = useState(false);

  // Kullanıcı izni sistem Ayarları'ndan kaldırmış olabilir; o durumda
  // uygulama içindeki anahtarın açık görünmesi yalan olur.
  useEffect(() => {
    if (!enabled) return;
    void getNotificationPermission().then((permission) => {
      if (permission !== "granted") setEnabled(false);
    });
  }, [enabled, setEnabled]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!next) {
        trackEvent("reminders_disabled");
        setEnabled(false);
        return;
      }

      setBusy(true);
      const permission = await getNotificationPermission();

      if (permission === "denied") {
        setBusy(false);
        trackEvent("reminders_permission_blocked");
        Alert.alert(t("reminders.permissionBlockedTitle"), t("reminders.permissionBlockedBody"), [
          { text: t("common.dismiss"), style: "cancel" },
          { text: t("reminders.openSettings"), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }

      const granted = await requestNotificationPermission();
      setBusy(false);

      trackEvent(granted ? "reminders_enabled" : "reminders_permission_denied");
      setEnabled(granted);

      if (!granted) {
        Alert.alert(t("reminders.permissionDeniedTitle"), t("reminders.permissionDeniedBody"));
      }
    },
    [setEnabled, t],
  );

  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={[monoType.rowText, { color: theme.text.primary }]}>
          {t("reminders.settingsLabel")}
        </Text>
        <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>
          {t("reminders.settingsHint")}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(next) => void handleToggle(next)}
        disabled={busy}
        accessibilityLabel={t("reminders.settingsLabel")}
        trackColor={{ true: theme.accent, false: theme.border.hairline }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  labels: {
    flex: 1,
    gap: spacing.xxs,
  },
});
