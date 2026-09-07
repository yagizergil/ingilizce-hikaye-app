import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";

interface LevelTestIntroProps {
  onStart: () => void;
  onSkip: () => void;
  busy: boolean;
}

/**
 * Testin ilk ekranı: ne yapacağımızı bir cümlede söyler ve atlama seçeneği
 * sunar.
 *
 * Atlama seçeneği bilerek eşit görünürlükte: zorunlu bir test ilk açılışta
 * terk oranını yükseltiyor. Atlayan kullanıcı varsayılan sıralamayla
 * kütüphaneye düşüyor ve seviyesini sonra profilden ayarlayabiliyor.
 */
export function LevelTestIntro({ onStart, onSkip, busy }: LevelTestIntroProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={[type.display, { color: theme.text.primary }]}>
          {t("onboarding.introTitle")}
        </Text>
        <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
          {t("onboarding.introBody")}
        </Text>
        <Text style={[monoType.label, { color: theme.text.secondary }]}>
          {t("onboarding.introDuration")}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label={t("onboarding.start")} onPress={onStart} fullWidth disabled={busy} />
        <Button
          label={t("onboarding.skip")}
          onPress={onSkip}
          variant="secondary"
          fullWidth
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  copy: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
