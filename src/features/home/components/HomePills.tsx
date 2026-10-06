import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { LanguageFlag } from "@/components/ui";

/** Referanstaki üç harfli dil kodu (ENG). */
const LANGUAGE_CODES: Record<string, string> = {
  en: "ENG",
  tr: "TUR",
  de: "GER",
  fr: "FRA",
  it: "ITA",
  es: "SPA",
  ru: "RUS",
  ar: "ARA",
  zh: "CHI",
  ja: "JPN",
};

interface HomePillsProps {
  /** Okur seviyesi (XP, migration 053; `profile/xp.ts`). */
  levelNumber: number;
  /** Seviye içi ilerleme (0..1): çubuğun doluluğu. */
  levelFraction: number;
  streak: number;
  targetLanguage: string;
  onPressLevel: () => void;
  onPressStreak: () => void;
  onPressLanguage: () => void;
}

/** Ana sayfa ve Ara ekranının üstündeki üç hap: seviye, seri, dil. */
export function HomePills({
  levelNumber,
  levelFraction,
  streak,
  targetLanguage,
  onPressLevel,
  onPressStreak,
  onPressLanguage,
}: HomePillsProps) {
  const { t } = useTranslation();
  const barFill = Math.min(1, Math.max(0, levelFraction));

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.pill, styles.levelPill]}
        onPress={onPressLevel}
        accessibilityRole="button"
        accessibilityLabel={t("home.header.levelAccessibility", {
          level: levelNumber,
          percent: Math.round(barFill * 100),
        })}
      >
        <View style={styles.coin}>
          <Text style={[homeType.coinGlyph, styles.coinInk]}>{levelNumber}</Text>
        </View>
        <View style={styles.levelText}>
          <Text style={[homeType.pillLabel, styles.pillText]} numberOfLines={1}>
            {t("home.header.level", { level: levelNumber })}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${barFill * 100}%` }]} />
          </View>
        </View>
      </Pressable>

      <View style={styles.pillGroup}>
        <Pressable
          style={[styles.pill, styles.streakPill]}
          onPress={onPressStreak}
          accessibilityRole="button"
          accessibilityLabel={t("home.header.streakAccessibility", { count: streak })}
        >
          <View style={styles.coin}>
            <Ionicons name="flame" size={homeSpace.xl - homeSpace.xs} color={homeColors.orange} />
          </View>
          <Text style={[homeType.pillValue, styles.pillText]}>{streak}</Text>
        </Pressable>

        <Pressable
          style={[styles.pill, styles.languagePill]}
          onPress={onPressLanguage}
          accessibilityRole="button"
          accessibilityLabel={t("home.header.languageAccessibility")}
        >
          <LanguageFlag code={targetLanguage} size={homeMetrics.pillCoin} />
          <Text style={[homeType.pillValue, styles.pillText]}>
            {LANGUAGE_CODES[targetLanguage] ?? targetLanguage.toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pillGroup: {
    flexDirection: "row",
    gap: homeMetrics.pillGap,
  },
  pill: {
    height: homeMetrics.pillHeight,
    borderRadius: homeMetrics.pillRadius,
    backgroundColor: homeColors.pillBg,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
    paddingHorizontal: homeSpace.pillInner,
    paddingRight: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  levelPill: {
    width: homeMetrics.levelPillWidth,
  },
  streakPill: {
    width: homeMetrics.streakPillWidth,
  },
  languagePill: {
    width: homeMetrics.languagePillWidth,
  },
  coin: {
    width: homeMetrics.pillCoin,
    height: homeMetrics.pillCoin,
    borderRadius: homeMetrics.pillCoin / 2,
    backgroundColor: homeColors.coin,
    alignItems: "center",
    justifyContent: "center",
  },
  coinInk: {
    color: homeColors.coinInk,
  },
  pillText: {
    color: homeColors.pillText,
  },
  levelText: {
    flex: 1,
    gap: homeSpace.xs,
  },
  bar: {
    width: homeMetrics.levelBarWidth,
    height: homeMetrics.levelBarHeight,
    borderRadius: homeMetrics.levelBarHeight / 2,
    backgroundColor: homeColors.orangeTrack,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: homeColors.orange,
  },
});
