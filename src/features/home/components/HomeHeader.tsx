import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { MascotAnim } from "@/components/ui";
import { HomePills } from "@/features/home/components/HomePills";

const SCENE = require("../../../../assets/home/home-scene.jpg") as number;

interface HomeHeaderProps {
  /** Okur seviyesi (XP). */
  levelNumber: number;
  /** Seviye içi ilerleme (0..1). */
  levelFraction: number;
  streak: number;
  /** Hedef dil kodu (bayrak ve kısa ad için). */
  targetLanguage: string;
  /** Görünen ad; yoksa karşılama metni addan arınmış gösterilir. */
  name: string | null;
  onPressLevel: () => void;
  onPressStreak: () => void;
  onPressLanguage: () => void;
}

/**
 * Ana sayfanın üst sahnesi: gökyüzü + çayır, üç hap (seviye, seri, dil),
 * karşılama metni ve sallanan papağan. İstatistik kartı bu sahnenin
 * altına biniyor (bkz. `homeMetrics.cardOverlap`).
 */
export function HomeHeader({
  levelNumber,
  levelFraction,
  streak,
  targetLanguage,
  name,
  onPressLevel,
  onPressStreak,
  onPressLanguage,
}: HomeHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const greetingLead = name ? t("home.header.welcomeBackLead") : t("home.header.welcome");
  const greetingName = name ?? "";

  return (
    <View style={[styles.scene, { height: homeMetrics.sceneHeight + insets.top }]}>
      <View style={[styles.sky, { height: insets.top + homeSpace.xl }]} />
      <Image
        source={SCENE}
        style={styles.sceneImage}
        contentFit="cover"
        contentPosition="bottom"
        accessibilityIgnoresInvertColors
      />

      <View style={[styles.pills, { top: insets.top + homeMetrics.pillTop }]}>
        <HomePills
          levelNumber={levelNumber}
          levelFraction={levelFraction}
          streak={streak}
          targetLanguage={targetLanguage}
          onPressLevel={onPressLevel}
          onPressStreak={onPressStreak}
          onPressLanguage={onPressLanguage}
        />
      </View>

      <Text
        style={[homeType.greeting, styles.greeting, { top: insets.top + homeMetrics.greetingTop }]}
        accessibilityRole="header"
      >
        {greetingLead}
        {greetingName ? <Text style={homeType.greetingName}> {greetingName}</Text> : null}
      </Text>

      <MascotAnim
        name="home"
        width={homeMetrics.parrotWidth}
        style={[styles.parrot, { marginTop: insets.top }]}
        persist
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: homeColors.sky,
  },
  sky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: homeColors.sky,
  },
  sceneImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: homeMetrics.sceneHeight,
  },
  pills: {
    position: "absolute",
    left: homeMetrics.gutter,
    right: homeMetrics.gutter,
  },
  greeting: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    color: homeColors.greeting,
  },
  parrot: {
    position: "absolute",
    top: homeMetrics.parrotTop,
    alignSelf: "center",
  },
});
