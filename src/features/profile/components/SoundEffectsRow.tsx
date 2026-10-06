import { StyleSheet, Switch, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailType, homeSpace, homeType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
import { playSfx, useSfxStore } from "@/lib/sfx";

/** Profil > "Ses efektleri": quiz/tekrar/kutlama seslerini açıp kapatır. */
export function SoundEffectsRow() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = useHomePalette();
  const enabled = useSfxStore((state) => state.enabled);
  const setEnabled = useSfxStore((state) => state.setEnabled);

  return (
    <View style={styles.row}>
      <UiIcon name="headphones" size={40} />
      <View style={styles.labels}>
        <Text style={[detailType.statLabel, { color: palette.ink }]}>{t("profile.sfx.label")}</Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>{t("profile.sfx.hint")}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(next) => {
          setEnabled(next);
          // Açınca nasıl duyulduğunu hemen duysun.
          if (next) playSfx("correct");
        }}
        accessibilityLabel={t("profile.sfx.label")}
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
    gap: homeSpace.md,
    paddingVertical: homeSpace.sm,
    minHeight: 60,
  },
  labels: {
    flex: 1,
    gap: homeSpace.xs,
  },
});
