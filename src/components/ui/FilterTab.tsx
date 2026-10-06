import { Pressable, StyleSheet, Text } from "react-native";

import { detailColors, detailType, homeColors, motion, radius, spacing } from "@/theme";

interface FilterTabProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * Filtre sekmesi — dolu hap (pill) biçiminde.
 *
 * 2026-09-07 tasarım revizyonu: eskiden yalnızca bir metin ve altında ince
 * bir accent çizgiydi. Kütüphane ve kelime defteri ekranlarının en üstünde
 * duran bu öğe, o hâliyle neredeyse görünmüyordu ve ekranlar "seçilebilir
 * bir şey yokmuş" gibi duruyordu. Artık seçili sekme dolu bir yüzey;
 * seçilebilirlik ilk bakışta okunuyor.
 *
 * Erişilebilirlik: dokunma hedefi hitSlop ile 44px'e tamamlanıyor ve seçim
 * yalnızca renkle değil dolgu/kontrast farkıyla da anlatılıyor.
 */
export function FilterTab({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
}: FilterTabProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.xs, right: spacing.xs }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? detailColors.amber : homeColors.peach,
          opacity: pressed ? motion.pressed.opacity : 1,
        },
      ]}
    >
      <Text
        style={[
          detailType.statLabel,
          { color: selected ? detailColors.amberInk : homeColors.mutedStrong },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 36,
    paddingHorizontal: spacing.ml,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
});
