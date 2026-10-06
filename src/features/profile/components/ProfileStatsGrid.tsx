import { StyleSheet, Text, View } from "react-native";

import { detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { UiIconName } from "@/components/ui";

export interface ProfileStatItem {
  key: string;
  label: string;
  value: string;
}

interface ProfileStatsGridProps {
  items: ProfileStatItem[];
}

/** Bilinen istatistik anahtarlarının ikonu; bilinmeyen anahtar grafik ikonu alır. */
const ICONS: Record<string, UiIconName> = {
  totalTime: "clock",
  savedWords: "bookmark",
  completedBooks: "book",
  activeDays: "calendar",
};

/** "Tüm zamanlar" istatistik ızgarası — ikonlu, iki sütunlu kartlar. */
export function ProfileStatsGrid({ items }: ProfileStatsGridProps) {
  const palette = useHomePalette();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.key}
          accessible
          accessibilityLabel={`${item.label} ${item.value}`}
          style={[styles.cell, { backgroundColor: palette.card }]}
        >
          <UiIcon name={ICONS[item.key] ?? "chart"} size={homeMetrics.rowIcon} />
          <Text style={[detailType.heroTitle, styles.value, { color: palette.ink }]}>
            {item.value}
          </Text>
          <Text style={[homeType.statLabel, { color: palette.muted }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
  },
  cell: {
    padding: homeSpace.lg,
    gap: homeSpace.xs,
    // İki sütun + aradaki boşluk.
    flexBasis: "46%",
    flexGrow: 1,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  value: {
    marginTop: homeSpace.xs,
    fontVariant: ["tabular-nums"],
  },
});
