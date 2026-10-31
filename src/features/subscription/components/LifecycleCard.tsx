import { StyleSheet, View } from "react-native";

import { homeColors, homeMetrics, homeSpace } from "@/theme";
import { useHomePalette } from "@/features/home";

import type { ReactNode } from "react";

interface LifecycleCardProps {
  children: ReactNode;
}

/** Abonelik ekranlarındaki beyaz, gölgeli kart (hesap silme ekranıyla aynı dil). */
export function LifecycleCard({ children }: LifecycleCardProps) {
  const palette = useHomePalette();
  return <View style={[styles.card, { backgroundColor: palette.card }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    gap: homeSpace.md,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
});
