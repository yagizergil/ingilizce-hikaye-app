import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { accentLineThickness } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface ProgressBarProps {
  /** 0–1. Values outside that range are clamped. */
  progress: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thin hairline-colored track with an accent fill — home.html
 * `.continue .bar` / `.bar i` (2px height, fill width = percent complete).
 * reader.html's top progress chrome uses the same shape (reference only,
 * not built this round) and book-detail.html's `%42 Tamamlandı` stat is a
 * `StatCell`, not a bar — this component exists for the home continue-reading
 * row and for reader when it ships.
 */
export function ProgressBar({ progress, accessibilityLabel, style }: ProgressBarProps) {
  const { theme } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: theme.border.hairline }, style]}
    >
      <View style={[styles.fill, { backgroundColor: theme.accent, width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: accentLineThickness,
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});
