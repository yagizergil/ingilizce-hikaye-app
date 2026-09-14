import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { levelAccent, onLevelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * "Yolun" ekranı (referans: `bookvo-11-ilerleme-grafigi.jpeg`).
 *
 * REFERANSTAN BİLEREK AYRILAN YER: referans "6 ayda yaklaşık 2.700 yeni
 * kelime -- A1'den B1'e" diye SAYISAL BİR VAAT veriyor. Bizim böyle bir
 * ölçümümüz yok; uydurulmuş bir sayı hem yanıltıcı olur hem de App Store
 * Guideline 2.3.1 kapsamına girer (paywall kuralımızın aynısı: bir şey
 * önce doğru olmalı, sonra yazılmalı).
 *
 * Aynı duyguyu VEREN ama doğru olan şey: kullanıcının seviye merdivenindeki
 * yeri ve bundan sonraki basamaklar. Bu katalogda gerçekten var olan bir
 * yapı, vaat değil yol tarifi.
 *
 * Alt kutucuklar da yalnızca BUGÜN ÇALIŞAN özellikler: stüdyo seslendirmesi
 * (ADR-012), kelime defteri + aralıklı tekrar, AI cümle çevirisi, çevrimdışı
 * okuma. Referanstaki "Shadowing + Oyunlar" ve "Videolar" bizde YOK, o
 * yüzden yazılmadı.
 */
const LADDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const FEATURES: { icon: IoniconName; key: string }[] = [
  { icon: "headset-outline", key: "audio" },
  { icon: "bookmarks-outline", key: "vocabulary" },
  { icon: "sparkles-outline", key: "ai" },
  { icon: "cloud-offline-outline", key: "offline" },
];

interface OnboardingProjectionStepProps {
  progress: number;
  level: CefrLevel | null;
  dailyGoalMinutes: number | null;
  onContinue: () => void;
}

export function OnboardingProjectionStep({
  progress,
  level,
  dailyGoalMinutes,
  onContinue,
}: OnboardingProjectionStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  /** Kullanıcının bulunduğu basamak ve sonraki iki basamak. */
  const path = useMemo(() => {
    const start = level ? LADDER.indexOf(level) : 0;
    const safeStart = start < 0 ? 0 : start;
    return LADDER.slice(safeStart, Math.min(safeStart + 3, LADDER.length));
  }, [level]);

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.path.title")}
      subtitle={
        dailyGoalMinutes
          ? t("onboarding.path.subtitleWithGoal", { count: dailyGoalMinutes })
          : t("onboarding.path.subtitle")
      }
      footer={<OnboardingFooterButton label={t("common.continue")} onPress={onContinue} />}
    >
      <View style={styles.body}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
          ]}
        >
          {path.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepLeft}>
                <View style={[styles.badge, { backgroundColor: levelAccent[step] }]}>
                  <Text style={[monoType.label, { color: onLevelAccent, letterSpacing: 0 }]}>
                    {step}
                  </Text>
                </View>
                {index < path.length - 1 ? (
                  <View style={[styles.connector, { backgroundColor: theme.border.hairline }]} />
                ) : null}
              </View>
              <View style={styles.stepText}>
                <Text style={[type.chapterRowTitle, { color: theme.text.primary }]}>
                  {t(`onboarding.level.options.${step}.title`)}
                </Text>
                <Text style={[monoType.meta, { color: theme.text.secondary }]}>
                  {index === 0
                    ? t("onboarding.path.youAreHere")
                    : t("onboarding.path.next")}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View
              key={feature.key}
              style={[
                styles.feature,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
              ]}
            >
              <Ionicons name={feature.icon} size={20} color={theme.accent} />
              <Text style={[monoType.meta, { color: theme.text.primary }]}>
                {t(`onboarding.path.features.${feature.key}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.cover,
    borderWidth: StyleSheet.hairlineWidth,
  },
  step: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stepLeft: {
    alignItems: "center",
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  stepText: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: spacing.xxs,
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  feature: {
    flexBasis: "48%",
    flexGrow: 1,
    alignItems: "flex-start",
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
