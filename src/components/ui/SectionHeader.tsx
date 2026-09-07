import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { spacing, monoType, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface SectionHeaderProps {
  title: string;
  /** e.g. home.html "TÜMÜ →" — pre-formatted by the caller (i18n owns the
   * arrow/casing), this component never invents its own fallback label. */
  moreLabel?: string;
  onPressMore?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fraunces section title + optional mono "more" link. Source:
 * home.html `.section-head` (title + "TÜMÜ →"), book-detail.html
 * `.section-head` (title only, "Bölümler"), profile.html `.section-head`
 * (title only, "Hesap"). All three share the same title style
 * (`type.sectionHeading`); only home's has the trailing link, so
 * `moreLabel`/`onPressMore` are optional. Screen-level padding (26px/20px/12px,
 * which differs slightly per mockup) is intentionally left to the caller —
 * this component only lays out its own row.
 */
export function SectionHeader({ title, moreLabel, onPressMore, style }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text style={[type.sectionHeading, { color: theme.text.primary }]}>{title}</Text>
      {moreLabel ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={moreLabel}
          onPress={onPressMore}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Text style={[monoType.moreLink, { color: theme.text.secondary }]}>{moreLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
});
