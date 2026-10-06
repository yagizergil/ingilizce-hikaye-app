import { useEffect } from "react";
import { StyleSheet } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { splashColors } from "@/theme";

import { SPLASH_TIMING } from "@/features/splash/splashTimeline";

interface SplashGlowProps {
  /** Hâlenin merkezi ve çapı (pt). */
  centerX: number;
  centerY: number;
  diameter: number;
  reduceMotion: boolean;
}

/**
 * Papağanın arkasındaki yumuşak gün ışığı. Kırmızı kuş şeftali gökyüzünde
 * kaybolmasın diye; kuşla birlikte yavaşça belirir.
 */
export function SplashGlow({ centerX, centerY, diameter, reduceMotion }: SplashGlowProps) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    opacity.value = reduceMotion
      ? 1
      : withDelay(SPLASH_TIMING.parrotStart - 150, withTiming(1, { duration: 700 }));
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { left: centerX - diameter / 2, top: centerY - diameter / 2 }, style]}
    >
      <Svg width={diameter} height={diameter}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={splashColors.halo} stopOpacity={0.95} />
            <Stop offset="55%" stopColor={splashColors.halo} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={splashColors.halo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={diameter / 2} cy={diameter / 2} r={diameter / 2} fill="url(#halo)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
  },
});
