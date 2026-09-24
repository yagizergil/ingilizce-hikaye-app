import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UpperText } from "@/components/ui/UpperText";

import type { TypeStyle } from "@/theme/tokens/typography";

export type StatCellSize = "sm" | "md" | "lg";

interface StatCellProps {
  value: string;
  label: string;
  size?: StatCellSize;
  /**
   * Dolu blok olarak çiz. 2026-09-07 tasarım revizyonu: eskiden bu bayrak
   * yalnızca ince bir kenarlık çiziyordu ve istatistikler ekranda kayboluyordu.
   * Artık yumuşak vurgu zeminli bir blok — sayılar ekranın ritmini kuruyor.
   */
  bordered?: boolean;
  /** Blok içindeki sayının rengi (varsayılan: metin rengi). */
  valueColor?: string;
  /** Sayı ve etiket yan yana hücrelerde farklı genişlikte; "center" ikisini
   * aynı eksene oturtuyor. */
  align?: "start" | "center";
  style?: StyleProp<ViewStyle>;
}

const VALUE_STYLE: Record<StatCellSize, TypeStyle> = {
  sm: monoType.statValue,
  md: monoType.statValueLg,
  lg: monoType.statValueXl,
};

export function StatCell({
  value,
  label,
  size = "sm",
  bordered = false,
  valueColor,
  align = "start",
  style,
}: StatCellProps) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
      style={[
        bordered && styles.block,
        bordered && { backgroundColor: theme.highlight },
        align === "center" && styles.centered,
        style,
      ]}
    >
      <Text style={[VALUE_STYLE[size], styles.value, { color: valueColor ?? theme.text.primary }]}>
        {value}
      </Text>
      <UpperText style={[monoType.statLabel, styles.label, { color: theme.text.secondary }]}>
        {label}
      </UpperText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
  centered: {
    alignItems: "center",
  },
  value: {
    // Sayılar sütun hâlinde hizalanıyor; orantılı rakam genişliği zıplamayı
    // önlüyor.
    fontVariant: ["tabular-nums"],
  },
  label: {
    marginTop: spacing.xxs,
  },
});
