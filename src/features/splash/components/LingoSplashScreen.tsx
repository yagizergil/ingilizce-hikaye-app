import { useMemo, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { spacing, splashColors, splashMetrics } from "@/theme";
import { useReduceMotion } from "@/hooks/useReduceMotion";

import { SplashGlow } from "@/features/splash/components/SplashGlow";
import { SplashGreetingBubbles } from "@/features/splash/components/SplashGreetingBubbles";
import { SplashParrot } from "@/features/splash/components/SplashParrot";
import { SplashWordmark } from "@/features/splash/components/SplashWordmark";
import { SPLASH_BACKGROUND } from "@/features/splash/splashAssets";
import { SPLASH_CLIP } from "@/features/splash/splashClips";
import { splashGeometry } from "@/features/splash/splashLayout";
import { SPLASH_TIMING } from "@/features/splash/splashTimeline";

interface LingoSplashScreenProps {
  onClose: () => void;
}

/**
 * Lingo açılış (splash) sahnesi -- geliştirici önizlemesi.
 *
 * Referans videonun 31-95. karelerinin Lingo uyarlaması (zaman çizelgesi ve
 * gerekçeler `splashTimeline.ts`'de). Alttaki papağan animasyonu
 * `splashClips.ts`te; sağ üstteki düğme sahneyi baştan oynatıyor: içerik `key` ile söküp yeniden kuruluyor.
 *
 * Bu ekran şimdilik yalnızca Profil > geliştirici satırından açılıyor;
 * gerçek açılışa bağlamak ayrı bir karar (SplashScreen/OTA etkileşimi).
 */
export function LingoSplashScreen({ onClose }: LingoSplashScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [run, setRun] = useState(0);

  const geometry = useMemo(
    () => splashGeometry(width, height, insets.top, SPLASH_CLIP.aspect),
    [width, height, insets.top],
  );
  const { parrotWidth, parrotHeight, parrotLeft, parrotTop, wordmarkTop, wordmarkWidth } = geometry;

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(SPLASH_TIMING.backgroundFade)} style={styles.fill}>
        <Image
          source={SPLASH_BACKGROUND}
          style={styles.fill}
          contentFit="cover"
          contentPosition="bottom"
        />
      </Animated.View>

      <View key={run} style={styles.fill} pointerEvents="box-none">
        <SplashGlow
          centerX={width / 2}
          centerY={parrotTop + parrotHeight * 0.5}
          diameter={parrotWidth * 2.4}
          reduceMotion={reduceMotion}
        />
        <SplashGreetingBubbles geometry={geometry} reduceMotion={reduceMotion} />
        <View style={[styles.parrot, { left: parrotLeft, top: parrotTop }]} pointerEvents="none">
          <SplashParrot
            clip={SPLASH_CLIP}
            width={parrotWidth}
            height={parrotHeight}
            reduceMotion={reduceMotion}
          />
        </View>
        <View
          style={[
            styles.wordmark,
            { top: wordmarkTop, left: (width - wordmarkWidth) / 2, width: wordmarkWidth },
          ]}
          pointerEvents="none"
        >
          <SplashWordmark word={t("app.name")} reduceMotion={reduceMotion} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={onClose}
        hitSlop={8}
        style={[styles.control, { top: insets.top + spacing.sm, left: spacing.lg }]}
      >
        <Ionicons name="close" size={22} color={splashColors.controlIcon} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("splash.replay")}
        onPress={() => setRun((value) => value + 1)}
        hitSlop={8}
        style={[styles.control, { top: insets.top + spacing.sm, right: spacing.lg }]}
      >
        <Ionicons name="refresh" size={20} color={splashColors.controlIcon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: splashColors.skyFallback,
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  parrot: {
    position: "absolute",
  },
  wordmark: {
    position: "absolute",
    alignItems: "center",
  },
  control: {
    position: "absolute",
    width: splashMetrics.controlSize,
    height: splashMetrics.controlSize,
    borderRadius: splashMetrics.controlSize / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: splashColors.controlFill,
  },
});
