import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { monoType, motion, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface ProfileAccountRowProps {
  label: string;
  /** Info rows (profile.html `.row .k` / `.row .v`) show a value; action
   * rows (sign-out, delete-account) omit it and rely on `onPress`. */
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
}

/**
 * profile.html `.row` — mono key/value pair with a hairline bottom border
 * (the hairline itself is rendered by the caller between rows, matching
 * `Hairline`'s role as the app's single divider primitive). Also doubles
 * as a tappable action row (sign-out / delete-account) when `onPress` is
 * given — not present in the mockup, see ProfileScreen.tsx deviation note.
 */
export function ProfileAccountRow({ label, value, onPress, destructive = false, accessibilityLabel }: ProfileAccountRowProps) {
  const { theme } = useTheme();
  const labelColor = destructive ? theme.danger : theme.text.primary;

  // 2026-09-07 tasarım revizyonu: dokunulabilir satırlar bilgi satırlarıyla
  // birebir aynı görünüyordu — "Abonelik" satırı paywall'u açıyor ama bunun
  // hiçbir işareti yoktu. Dokunulabilir satırlara bir chevron geliyor.
  const content = (
    <>
      <Text style={[monoType.rowText, { color: labelColor }]}>{label}</Text>
      <View style={styles.right}>
        {value !== undefined ? (
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>{value}</Text>
        ) : null}
        {onPress && !destructive ? (
          <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          styles.touchable,
          { opacity: pressed ? motion.pressed.opacity : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? `${label} ${value ?? ""}`} style={styles.row}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  touchable: {
    minHeight: 44,
  },
});
