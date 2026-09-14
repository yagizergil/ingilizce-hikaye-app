import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingOptionCard } from "@/features/onboarding/components/OnboardingOptionCard";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Günlük hedef (referans: `bookvo-10-gunluk-hedef.jpeg`).
 *
 * Referanstaki beş seçenek ve "Önerilen" rozeti aynen korundu; ikonlar
 * bizim ikon setimizden. Seçim `profiles.daily_goal_minutes`'a yazılıyor --
 * bu alan zaten vardı ve hatırlatma bildirimleri (ADR-010) ile ana
 * ekrandaki seri göstergesi onu okuyor. Yani bu ekran boşa dönen bir
 * anket değil, var olan bir ayarı dolduruyor.
 */
const OPTIONS: { minutes: number; icon: IoniconName; recommended?: boolean }[] = [
  { minutes: 5, icon: "leaf-outline" },
  { minutes: 10, icon: "calendar-outline" },
  { minutes: 15, icon: "flash-outline", recommended: true },
  { minutes: 20, icon: "rocket-outline" },
  { minutes: 30, icon: "trophy-outline" },
];

interface OnboardingDailyGoalStepProps {
  progress: number;
  selected: number | null;
  onSelect: (minutes: number) => void;
  onContinue: () => void;
  submitting?: boolean;
}

export function OnboardingDailyGoalStep({
  progress,
  selected,
  onSelect,
  onContinue,
  submitting = false,
}: OnboardingDailyGoalStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.goal.title")}
      subtitle={t("onboarding.goal.subtitle")}
      footer={
        <OnboardingFooterButton
          label={t("common.continue")}
          onPress={onContinue}
          disabled={selected === null}
          loading={submitting}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {OPTIONS.map((option) => (
          <OnboardingOptionCard
            key={option.minutes}
            badge={<Ionicons name={option.icon} size={22} color={theme.text.onAccent} />}
            badgeColor={theme.accent}
            title={t("onboarding.goal.minutes", { count: option.minutes })}
            subtitle={t(`onboarding.goal.options.${option.minutes}`)}
            selected={selected === option.minutes}
            onPress={() => onSelect(option.minutes)}
          />
        ))}

        {/* "Önerilen" etiketi referansta 15 dk satırının yanında. Kart
            bileşeninin sağ tarafı seçim halkasına ayrılmış olduğu için
            etiket listenin altında bir açıklama olarak veriliyor. */}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={theme.text.secondary} />
          <Text style={[monoType.meta, styles.noteText, { color: theme.text.secondary }]}>
            {t("onboarding.goal.recommendedNote")}
          </Text>
        </View>
      </ScrollView>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  noteText: {
    flex: 1,
  },
});
