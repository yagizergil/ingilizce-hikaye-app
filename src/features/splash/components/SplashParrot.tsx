import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { SplashSparkles } from "@/features/splash/components/SplashSparkles";
import type { SplashClip } from "@/features/splash/splashClips";
import { SPLASH_TIMING } from "@/features/splash/splashTimeline";

interface SplashParrotProps {
  clip: SplashClip;
  /** Papağan kutusunun ölçüsü (pt); oran klibin oranı. */
  width: number;
  height: number;
  reduceMotion: boolean;
}

/**
 * Logonun işareti: küçük bir noktadan büyüyen papağan.
 *
 * Sıra: nokta büyür -> Higgsfield klibi oynar -> (klipte tanımlıysa) göz
 * kırpma anında kıvılcımlar -> klip bitince AYNI karenin statik hâli devralır.
 * "Hareketi azalt" açıksa doğrudan son kare gösterilir.
 */
export function SplashParrot({ clip, width, height, reduceMotion }: SplashParrotProps) {
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const [sparkling, setSparkling] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      // Ayar sonradan (async) açılmış olabilir: devam eden animasyonu kes.
      scale.value = 1;
      return;
    }
    scale.value = withDelay(
      SPLASH_TIMING.parrotStart,
      withSpring(1, { damping: 14, stiffness: 130 }),
    );
    const timers = [
      setTimeout(() => setPlaying(true), SPLASH_TIMING.parrotStart),
      setTimeout(() => setFinished(true), SPLASH_TIMING.parrotStart + clip.durationMs),
    ];
    if (clip.sparkle) {
      timers.push(
        setTimeout(() => setSparkling(true), SPLASH_TIMING.parrotStart + clip.sparkle.at),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [clip, reduceMotion, scale]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, scale.value * 3),
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width, height }, popStyle]}>
      {finished || reduceMotion ? (
        <Image source={clip.last} style={styles.fill} contentFit="contain" />
      ) : playing ? (
        <Image source={clip.intro} style={styles.fill} contentFit="contain" />
      ) : null}
      {sparkling && !reduceMotion && clip.sparkle ? (
        <View pointerEvents="none" style={[styles.fill, { width, height }]}>
          <SplashSparkles
            width={width}
            height={height}
            eye={clip.sparkle.eye}
            angles={clip.sparkle.angles}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
