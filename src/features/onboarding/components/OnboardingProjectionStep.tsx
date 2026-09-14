import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { monoType, radius, spacing } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * "Nereye gidiyorsun" ekranı (referans:
 * `docs/reference/bookvo-11-ilerleme-grafigi.jpeg`).
 *
 * DÜZEN REFERANSIN AYNISI: yükselen bir eğri, eğri üzerinde üç düğüm, her
 * düğümün üstünde kesikli bir çizgiyle bağlanan seviye baloncuğu, altında
 * zaman etiketi ("Şimdi / 3. ay / 6. ay"); altta 2x2 özellik kutucukları;
 * en altta pill düğme.
 *
 * TEK İÇERİK FARKI VE NEDENİ: referansın alt başlığı "6 ayda yaklaşık
 * 2.700 yeni kelime" diye SAYISAL BİR VAAT veriyor. Bizim böyle bir
 * ölçümümüz yok ve uydurulmuş bir sayı, paywall'da uyguladığımız kuralın
 * (bir fayda önce doğru olmalı, sonra yazılmalı -- Guideline 2.3.1)
 * ihlali olurdu. Yerine ARİTMETİK olarak doğru bir ifade kullanılıyor:
 * kullanıcının kendi seçtiği günlük süre x 6 ay = toplam okuma saati.
 * Bu bir vaat değil, kendi hedefinin toplamı.
 *
 * Kutucuklar da yalnızca bugün çalışan özellikler; referanstaki
 * "Shadowing + Oyunlar" ve "Videolar" bizde YOK, o yüzden yazılmadı.
 */
const LADDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const FEATURES: { icon: IoniconName; key: string; tint: string }[] = [
  { icon: "flame-outline", key: "daily", tint: levelAccent.A1 },
  { icon: "headset-outline", key: "audio", tint: levelAccent.A2 },
  { icon: "sparkles-outline", key: "ai", tint: levelAccent.B1 },
  { icon: "repeat-outline", key: "review", tint: levelAccent.C1 },
];

/** Grafik kartının iç ölçüleri (referansta kart ~230pt yüksekliğinde). */
const CHART_HEIGHT = 230;
const CHART_VIEWBOX_WIDTH = 320;
const CHART_VIEWBOX_HEIGHT = 160;

/**
 * Eğrinin düğüm noktaları (viewBox koordinatı). Referansta eğri soldan
 * sağa yükseliyor ve düğümler eşit aralıklı DEĞİL -- son düğüm sağ üstte,
 * ilk düğüm sol altta.
 */
const NODES = [
  { x: 40, y: 128 },
  { x: 160, y: 84 },
  { x: 272, y: 40 },
] as const;

/** Düğümlerden geçen yumuşak eğri. */
const CURVE = `M 8 144 C 24 140, 30 132, ${NODES[0].x} ${NODES[0].y} S 120 96, ${NODES[1].x} ${NODES[1].y} S 236 48, ${NODES[2].x} ${NODES[2].y} S 306 26, 316 22`;

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
    const slice = LADDER.slice(safeStart, safeStart + 3);
    // Merdivenin sonundaysa geriye doğru tamamlanıyor ki grafik hep üç
    // düğümlü kalsın.
    while (slice.length < 3 && slice.length > 0) {
      slice.unshift(LADDER[Math.max(0, LADDER.indexOf(slice[0] as CefrLevel) - 1)] as CefrLevel);
    }
    return slice;
  }, [level]);

  /** 6 ayda toplam okuma saati -- aritmetik, vaat değil. */
  const totalHours = dailyGoalMinutes ? Math.round((dailyGoalMinutes * 180) / 60) : null;

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.path.title")}
      subtitle={
        totalHours
          ? t("onboarding.path.subtitleWithGoal", {
              hours: totalHours,
              from: path[0],
              to: path[path.length - 1],
            })
          : t("onboarding.path.subtitle")
      }
      footer={<OnboardingFooterButton label={t("common.continue")} onPress={onContinue} />}
    >
      <View style={styles.body}>
        <View style={[styles.chartCard, { backgroundColor: theme.bg.surface }]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="curve" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={levelAccent.A1} />
                <Stop offset="1" stopColor={theme.accent} />
              </LinearGradient>
            </Defs>
            <Path d={CURVE} stroke="url(#curve)" strokeWidth={5} fill="none" strokeLinecap="round" />
          </Svg>

          {NODES.map((node, index) => {
            const left: `${number}%` = `${(node.x / CHART_VIEWBOX_WIDTH) * 100}%`;
            const top: `${number}%` = `${(node.y / CHART_VIEWBOX_HEIGHT) * 100}%`;
            const step = path[index];
            return (
              <View key={step ?? index} style={[styles.nodeGroup, { left, top }]}>
                {/* Baloncuk -- düğümün ÜSTÜNDE, kesikli çizgiyle bağlı. */}
                <View
                  style={[
                    styles.bubble,
                    { backgroundColor: theme.bg.primary, borderColor: levelAccent[step as CefrLevel] },
                  ]}
                >
                  <Text style={[monoType.label, { color: levelAccent[step as CefrLevel], letterSpacing: 0 }]}>
                    {step}
                  </Text>
                </View>
                <View style={[styles.dashed, { borderColor: theme.border.hairline }]} />
                <View style={[styles.node, { borderColor: theme.accent, backgroundColor: theme.bg.primary }]} />
                <Text style={[monoType.meta, styles.nodeLabel, { color: theme.text.secondary }]}>
                  {t(`onboarding.path.milestones.${index}`)}
                </Text>
              </View>
            );
          })}
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
              <View style={[styles.featureBadge, { backgroundColor: `${feature.tint}22` }]}>
                <Ionicons name={feature.icon} size={20} color={feature.tint} />
              </View>
              <View style={styles.featureText}>
                <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                  {feature.key === "daily" && dailyGoalMinutes
                    ? t("onboarding.goal.minutes", { count: dailyGoalMinutes })
                    : t(`onboarding.path.features.${feature.key}.title`)}
                </Text>
                <Text style={[monoType.meta, { color: theme.text.secondary }]}>
                  {t(`onboarding.path.features.${feature.key}.body`)}
                </Text>
              </View>
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
  chartCard: {
    height: CHART_HEIGHT,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  /** Düğüm grubu, eğrinin üzerindeki noktaya göre konumlanıyor. */
  nodeGroup: {
    position: "absolute",
    alignItems: "center",
    // Grup, düğüm noktası merkezde kalacak şekilde kaydırılıyor.
    marginLeft: -30,
    marginTop: -64,
    width: 60,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  dashed: {
    width: 1,
    height: 12,
    borderLeftWidth: 1,
    borderStyle: "dashed",
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 4,
  },
  nodeLabel: {
    paddingTop: spacing.xxs,
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  feature: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
