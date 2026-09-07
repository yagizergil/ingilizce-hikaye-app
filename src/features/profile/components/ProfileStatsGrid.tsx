import { StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import { StatCell } from "@/components/ui";

export interface ProfileStatItem {
  key: string;
  label: string;
  value: string;
}

interface ProfileStatsGridProps {
  items: ProfileStatItem[];
}

/**
 * "Tüm zamanlar" istatistik ızgarası — iki sütunlu dolu bloklar.
 *
 * REVIZE (2026-09-07): dört sabit prop çifti (daysActiveLabel,
 * daysActiveValue, ...) yerine bir liste alıyor. Profil ekranı yeniden
 * tasarlanırken haftalık sayılar kendi kartlarına (StreakCard,
 * WeeklyMinutesChart) taşındı ve bu ızgara tüm zamanların toplamlarını
 * gösteriyor; sabit prop listesi her değişiklikte bileşenin imzasını
 * değiştirmeyi gerektiriyordu.
 */
export function ProfileStatsGrid({ items }: ProfileStatsGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <StatCell key={item.key} value={item.value} label={item.label} size="lg" bordered style={styles.cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cell: {
    // İki sütun + aradaki boşluk.
    flexBasis: "47%",
    flexGrow: 1,
  },
});
