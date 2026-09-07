import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

interface HairlineProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * The single divider primitive for the whole app. Every mockup (home,
 * library, book-detail, vocabulary, profile, tab-bar) uses nothing but
 * `border: 1px solid var(--hairline)` for section/row separation — no
 * cards, no boxes. `StyleSheet.hairlineWidth` is the correct RN
 * translation of a CSS "1px" divider (see layout.ts `hairlineWidthNote`).
 * This is the only place that width is ever set; nothing else in the
 * component set should reach for a numeric divider thickness directly
 * (badge/progress-bar borders use their own documented layout tokens).
 */
export function Hairline({ style }: HairlineProps) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, { backgroundColor: theme.border.hairline }, style]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
});
