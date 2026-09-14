import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { monoType, radius, spacing } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * "Yolun" ekranı (referans: `docs/reference/bookvo-11-ilerleme-grafigi.jpeg`).
 *
 * DÜZEN: yükselen eğri, üzerinde üç düğüm, her düğümün üstünde seviye
 * baloncuğu; grafiğin ALTINDA ayrı bir satırda zaman etiketleri; en altta
 * 2x2 özellik kutucukları.
 *
 * ETİKETLER NEDEN DÜĞÜMÜN ALTINDA DEĞİL, AYRI BİR SATIRDA: ilk sürümde
 * her etiket kendi düğümünün altına, yani eğrinin yüksekliğine göre
 * değişen bir y'ye konuyordu. Düğümler farklı yüksekliklerde olduğu için
 * etiketler eğriye ve birbirine biniyordu. Etiketler artık sabit bir
 * taban çizgisinde, üç eşit sütunda duruyor -- referanstaki gibi bir x
 * ekseni. Baloncuklar da aynı üç sütunun MERKEZİNE hizalı, yani hiçbir
 * genişlikte üst üste binemiyorlar.
 *
 * TEK İÇERİK FARKI: referansın alt başlığı "6 ayda ~2.700 kelime" diye
 * sayısal bir VAAT veriyor; bizde böyle bir ölçüm yok ve uydurulmuş bir
 * sayı yanıltıcı olurdu (Guideline 2.3.1). Yerine aritmetik olarak doğru
 * olan yazılıyor: kullanıcının kendi günlük hedefi x 6 ay.
 *
 * Kutucuklar yalnızca bugün çalışan özellikler; referanstaki "Shadowing +
 * Oyunlar" ve "Videolar" bizde YOK, o yüzden yazılmadı.
 */
const LADDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const FEATURES: { icon: IoniconName; key: string; tint: string }[] = [
  { icon: "flame-outline", key: "daily", tint: levelAccent.A1 },
  { icon: "headset-outline", key: "audio", tint: levelAccent.A2 },
  { icon: "sparkles-outline", key: "ai", tint: levelAccent.B1 },
  { icon: "repeat-outline", key: "review", tint: levelAccent.C1 },
];

/** Çizim alanının ölçüleri (pt). Kart = çizim + etiket satırı + iç boşluk. */
const PLOT_HEIGHT = 168;
const BUBBLE_SIZE = 44;
const DOT_SIZE = 14;
/** Baloncuğun altı ile düğüm noktası arasındaki boşluk. */
const BUBBLE_GAP = 8;

const VB_WIDTH = 300;
const VB_HEIGHT = 170;

/**
 * Düğümler üç eşit sütunun MERKEZİNDE (1/6, 3/6, 5/6) -- etiket satırıyla
 * birebir aynı hizada. Yükseklikler referanstaki gibi soldan sağa artıyor.
 */
const NODES = [
  { x: 50, y: 126 },
  { x: 150, y: 80 },
  { x: 250, y: 34 },
] as const;

const CURVE = [
  `M 6 152`,
  `C 24 148, 34 134, ${NODES[0].x} ${NODES[0].y}`,
  `S 112 92, ${NODES[1].x} ${NODES[1].y}`,
  `S 218 42, ${NODES[2].x} ${NODES[2].y}`,
  `S 286 20, 294 16`,
].join(" ");

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
  const path = useMemo<CefrLevel[]>(() => {
    const found = level ? LADDER.indexOf(level) : 0;
    // Merdivenin sonundaysa geriye kaydırılıyor ki grafik hep üç düğümlü
    // kalsın (C1 seçen kullanıcıda B2/C1/C2 görünür).
    const start = Math.min(Math.max(found, 0), LADDER.length - 3);
    return LADDER.slice(start, start + 3);
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
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
          ]}
        >
          <View style={styles.plot}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <LinearGradient id="curve" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0" stopColor={levelAccent.A1} />
                  <Stop offset="1" stopColor={theme.accent} />
                </LinearGradient>
              </Defs>

              <Path
                d={CURVE}
                stroke="url(#curve)"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
              />

              {/* Düğüm noktaları eğrinin ÜSTÜNE çiziliyor: aynı koordinat
                  sisteminde oldukları için hiçbir ekran genişliğinde
                  çizgiden kaymıyorlar. */}
              {NODES.map((node, index) => (
                <Circle
                  key={path[index] ?? index}
                  cx={node.x}
                  cy={node.y}
                  r={DOT_SIZE / 2}
                  fill={theme.bg.surface}
                  stroke={levelAccent[path[index] as CefrLevel]}
                  strokeWidth={4}
                />
              ))}
            </Svg>

            {/* Seviye baloncukları -- düğümün tam üstünde, sütun merkezinde. */}
            {NODES.map((node, index) => {
              const step = path[index] as CefrLevel;
              const left: `${number}%` = `${(node.x / VB_WIDTH) * 100}%`;
              const top: `${number}%` = `${(node.y / VB_HEIGHT) * 100}%`;
              return (
                <View key={step} style={[styles.bubbleSlot, { left, top }]}>
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: theme.bg.primary, borderColor: levelAccent[step] },
                    ]}
                  >
                    <Text style={[monoType.label, { color: levelAccent[step], letterSpacing: 0 }]}>
                      {step}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Zaman ekseni: üç eşit sütun, düğümlerle aynı merkezlerde. */}
          <View style={[styles.axis, { borderTopColor: theme.border.hairline }]}>
            {NODES.map((_, index) => (
              <Text
                key={index}
                style={[monoType.meta, styles.axisLabel, { color: theme.text.secondary }]}
                numberOfLines={1}
              >
                {t(`onboarding.path.milestones.${index}`)}
              </Text>
            ))}
          </View>
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
                <Ionicons name={feature.icon} size={18} color={feature.tint} />
              </View>
              <View style={styles.featureText}>
                <Text
                  style={[monoType.label, { color: theme.text.primary }]}
                  numberOfLines={1}
                >
                  {feature.key === "daily" && dailyGoalMinutes
                    ? t("onboarding.goal.minutes", { count: dailyGoalMinutes })
                    : t(`onboarding.path.features.${feature.key}.title`)}
                </Text>
                <Text
                  style={[monoType.meta, { color: theme.text.secondary }]}
                  numberOfLines={2}
                >
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
    gap: spacing.sm,
  },
  chartCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    overflow: "hidden",
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  /**
   * Baloncuk yuvası: genişliği baloncuk kadar ve yarısı kadar sola
   * kaydırılmış, böylece düğüm noktasında ORTALANIYOR. Dikeyde de
   * baloncuğun ALTI düğüme değecek şekilde yukarı çekiliyor.
   */
  bubbleSlot: {
    position: "absolute",
    width: BUBBLE_SIZE,
    marginLeft: -BUBBLE_SIZE / 2,
    marginTop: -(BUBBLE_SIZE + BUBBLE_GAP + DOT_SIZE / 2),
    alignItems: "center",
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  axis: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  axisLabel: {
    flex: 1,
    textAlign: "center",
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  feature: {
    flexBasis: "48%",
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
