import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { motion, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

export type CardTone = "surface" | "highlight" | "deep" | "accent";

interface CardProps {
  children: ReactNode;
  /**
   * Kartın zemin rengi.
   * - `surface`: nötr yükseltilmiş yüzey (varsayılan)
   * - `highlight`: yumuşak sıcak vurgu — "burası önemli" der, bağırmadan
   * - `deep`: derin lacivert blok — ekranın çapası
   * - `accent`: terracotta — yalnızca tek bir birincil eylem bloğu için
   */
  tone?: CardTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Kenarlık çizilsin mi (yalnızca `surface` tonunda anlamlı). */
  bordered?: boolean;
}

/**
 * Dolgulu blok — yeni tasarım dilinin taşıyıcı öğesi.
 *
 * 2026-09-07 tasarım revizyonu: uygulamada hiç dolu yüzey yoktu, her ayrım
 * bir hairline'dı ve ekranlar düz bir liste yığını gibi okunuyordu
 * (geri bildirim: "bayık, iç boğan"). Derinlik BİLEREK gölgeyle değil
 * renkle kuruluyor — mockup sisteminin düzlüğü korunuyor ve gölge
 * eklemek kâğıt metaforuyla çelişirdi.
 * Bkz. docs/plans/2026-09-07-tasarim-yonu.md.
 */
export function Card({
  children,
  tone = "surface",
  onPress,
  accessibilityLabel,
  style,
  bordered = true,
}: CardProps) {
  const { theme } = useTheme();

  const background: Record<CardTone, string> = {
    surface: theme.bg.surface,
    highlight: theme.highlight,
    deep: theme.deep,
    accent: theme.accent,
  };

  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: background[tone] },
    tone === "surface" && bordered
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border.hairline }
      : null,
    style,
  ];

  if (!onPress) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        base,
        pressed ? { opacity: motion.pressed.opacity } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.ml,
  },
});
