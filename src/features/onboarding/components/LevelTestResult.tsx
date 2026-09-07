import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";

import { CEFR_LEVELS, type CefrLevel } from "@/features/onboarding/levelEstimate";

interface LevelTestResultProps {
  estimatedSize: number;
  selectedLevel: CefrLevel;
  onSelectLevel: (level: CefrLevel) => void;
  onConfirm: () => void;
  busy: boolean;
}

/**
 * Test sonucu ve düzeltme imkânı.
 *
 * Sonuç bir HÜKÜM olarak değil BAŞLANGIÇ NOKTASI olarak sunuluyor: kelime
 * tanıma testleri şişmeye açık (bkz. levelEstimate.ts), o yüzden kullanıcı
 * tek dokunuşla seviyesini değiştirebiliyor. Ölçüm yine de kaydediliyor —
 * kullanıcının düzeltmesi ayrı bir `method` etiketiyle işaretleniyor.
 */
export function LevelTestResult({
  estimatedSize,
  selectedLevel,
  onSelectLevel,
  onConfirm,
  busy,
}: LevelTestResultProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={[monoType.label, { color: theme.text.secondary }]}>
          {t("onboarding.resultEyebrow")}
        </Text>
        <Text style={[type.display, { color: theme.text.primary }]}>{selectedLevel}</Text>
        <Text style={[monoType.rowText, styles.centered, { color: theme.text.secondary }]}>
          {t("onboarding.resultSize", { count: estimatedSize })}
        </Text>
      </View>

      <View style={styles.adjustBlock}>
        <Text style={[monoType.label, styles.centered, { color: theme.text.secondary }]}>
          {t("onboarding.adjustHint")}
        </Text>
        <View style={styles.levels}>
          {CEFR_LEVELS.map((level) => {
            const selected = level === selectedLevel;
            return (
              <Pressable
                key={level}
                style={({ pressed }) => [
                  styles.levelChip,
                  {
                    backgroundColor: selected ? theme.text.primary : theme.bg.surface,
                    borderColor: selected ? theme.text.primary : theme.border.hairline,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => onSelectLevel(level)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={level}
              >
                <Text
                  style={[
                    monoType.label,
                    { color: selected ? theme.text.inverse : theme.text.primary },
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        label={t("onboarding.finish")}
        onPress={onConfirm}
        fullWidth
        loading={busy}
        disabled={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  summary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  centered: {
    textAlign: "center",
  },
  adjustBlock: {
    gap: spacing.sm,
  },
  levels: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  levelChip: {
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
