import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SvgXml } from "react-native-svg";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { goalIconXml } from "@/features/onboarding/goalIconXml";
import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingOptionCard } from "@/features/onboarding/components/OnboardingOptionCard";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

/**
 * Günlük hedef (referans: `bookvo-10-gunluk-hedef.jpeg`).
 *
 * Referanstaki beş seçenek ve "Önerilen" rozeti aynen korundu.
 * İllüstrasyonlar `assets/*.svg` (bkz. `goalIconXml`) ve bir ARTIŞ
 * anlatıyorlar: filiz -> takvim -> şimşek -> roket -> kupa. Rozet zemini
 * nötr, çünkü görseller kendi renklerini taşıyor -- renkli bir görseli
 * renkli bir dairenin üstüne koymak ikisini de bulanıklaştırırdı. Seçim `profiles.daily_goal_minutes`'a yazılıyor --
 * bu alan zaten vardı ve hatırlatma bildirimleri (ADR-010) ile ana
 * ekrandaki seri göstergesi onu okuyor. Yani bu ekran boşa dönen bir
 * anket değil, var olan bir ayarı dolduruyor.
 */
const OPTIONS: { minutes: number; recommended?: boolean }[] = [
  { minutes: 5 },
  { minutes: 10 },
  { minutes: 15, recommended: true },
  { minutes: 20 },
  { minutes: 30 },
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
            badge={
              <SvgXml xml={goalIconXml[`m${option.minutes}`] as string} width={26} height={26} />
            }
            badgeColor={theme.bg.primary}
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
          <Text style={[monoType.rowText, styles.noteText, { color: theme.text.secondary }]}>
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
