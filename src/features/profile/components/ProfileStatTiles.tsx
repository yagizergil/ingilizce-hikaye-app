import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { UiIconName } from "@/components/ui";

interface ProfileStatTilesProps {
  /** null: henüz yüklenmedi ("–" gösterilir). */
  streak: number | null;
  totalMinutes: number | null;
  completedBooks: number | null;
}

interface TileProps {
  icon: UiIconName;
  value: string;
  label: string;
}

function Tile({ icon, value, label }: TileProps) {
  const palette = useHomePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${value}`}
      style={[styles.tile, { backgroundColor: palette.card }]}
    >
      <UiIcon name={icon} size={homeMetrics.statTileIcon} />
      <Text style={[detailType.heroTitle, styles.value, { color: palette.ink }]}>{value}</Text>
      <Text style={[homeType.statLabel, styles.label, { color: palette.muted }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Profil ekranının üç büyük sayısı: seri, toplam okuma süresi, biten kitap. */
export function ProfileStatTiles({ streak, totalMinutes, completedBooks }: ProfileStatTilesProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Tile
        icon="flame"
        value={streak === null ? PLACEHOLDER : String(streak)}
        label={t("profile.streak.currentLabel")}
      />
      <Tile
        icon="clock"
        value={
          totalMinutes === null
            ? PLACEHOLDER
            : t("profile.stats.readingTime.minutesOnly", { minutes: totalMinutes })
        }
        label={t("profile.stats.totalTimeLabel")}
      />
      <Tile
        icon="book"
        value={completedBooks === null ? PLACEHOLDER : String(completedBooks)}
        label={t("profile.stats.completedBooksLabel")}
      />
    </View>
  );
}

/** Yüklenirken gösterilen yer tutucu (çeviri gerektirmeyen tipografik işaret). */
const PLACEHOLDER = "–";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: homeSpace.md,
    marginHorizontal: homeMetrics.gutter,
    marginTop: homeSpace.lg,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: homeSpace.xs,
    paddingVertical: homeSpace.lg,
    paddingHorizontal: homeSpace.sm,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  value: {
    textAlign: "center",
  },
  label: {
    textAlign: "center",
  },
});
