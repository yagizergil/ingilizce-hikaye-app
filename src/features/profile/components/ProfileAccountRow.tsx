import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import type { ComponentProps } from "react";

import { motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface ProfileAccountRowProps {
  label: string;
  /**
   * Satırın solundaki renkli ikon karesi (referanstaki gibi). Verilmezse
   * satır ikon taşımıyor ve daha alçak oluyor -- referansta da öyle:
   * ikonlu satır 50 pt, ikonsuz satır 43 pt.
   */
  icon?: ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
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
export function ProfileAccountRow({
  label,
  value,
  icon,
  iconColor,
  onPress,
  destructive = false,
  accessibilityLabel,
}: ProfileAccountRowProps) {
  const { theme } = useTheme();
  const labelColor = destructive ? theme.danger : theme.text.primary;

  // 2026-09-07 tasarım revizyonu: dokunulabilir satırlar bilgi satırlarıyla
  // birebir aynı görünüyordu — "Abonelik" satırı paywall'u açıyor ama bunun
  // hiçbir işareti yoktu. Dokunulabilir satırlara bir chevron geliyor.
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: iconColor ?? theme.accent }]}>
          <Ionicons name={icon} size={17} color={theme.text.onAccent} />
        </View>
      ) : null}
      <Text style={[type.bookTitleMd, styles.label, { color: labelColor }]}>{label}</Text>
      <View style={styles.right}>
        {value !== undefined ? (
          <Text style={[type.bookTitleMd, { color: theme.text.secondary }]}>{value}</Text>
        ) : null}
        {onPress && !destructive ? (
          <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
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
          icon ? styles.rowWithIcon : null,
          { opacity: pressed ? motion.pressed.opacity : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? `${label} ${value ?? ""}`} style={[styles.row, icon ? styles.rowWithIcon : null]}>
      {content}
    </View>
  );
}

/**
 * ÖLÇÜLER REFERANSTAN (docs/reference/referance2.jpeg, 1pt = 2.4046px):
 *   ikonlu satır yüksekliği 121 px -> 50 pt
 *   ikonsuz satır yüksekliği 102 px -> 43 pt
 *   ikon karesi 67x67 px -> 28x28 pt, sol kenardan 38 px -> 16 pt
 *   satır metni ~17 pt kalın, değer aynı ölçüde ama ikincil renkte
 */
const ROW_HEIGHT = 43;
const ROW_HEIGHT_WITH_ICON = 50;
const ICON_TILE = 28;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: ROW_HEIGHT,
  },
  rowWithIcon: {
    minHeight: ROW_HEIGHT_WITH_ICON,
  },
  label: {
    flex: 1,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  touchable: {
    minHeight: ROW_HEIGHT,
  },
});
