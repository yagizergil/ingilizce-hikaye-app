import { useEffect } from "react";
import { StyleSheet, type DimensionValue } from "react-native";

import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { motion } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface SkeletonProps {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
}

/** Pulsing placeholder block for loading lists/cards. Subtle opacity pulse
 * only — no shimmer sweep, to stay calm rather than flashy. Defaults to
 * sharp corners (no `borderRadius`): none of the six mockups this round
 * builds use any rounding anywhere (see BookCover.tsx's note), so a
 * skeleton standing in for e.g. a cover should default to the same flat
 * shape rather than reintroducing a radius token nothing else uses. Kept
 * overridable via the prop in case a future non-cover skeleton needs one. */
export function Skeleton({ width, height, borderRadius = 0 }: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: motion.duration.slow }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius, backgroundColor: theme.border.hairline }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
