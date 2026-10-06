import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";

/**
 * Gün meydan okuması KİLOMETRE TAŞLARI. Referanstaki sabit "120 gün" ilk
 * günde "0 / 120" yazıyordu: ulaşılmaz görünen hedef motivasyonu kırar
 * (hedef gradyanı etkisi: hedefe yaklaştıkça çaba artar). Hedef bir sonraki
 * taşa ilerliyor: 7 -> 30 -> 120.
 */
const MILESTONES = [7, 30, 120];

function nextMilestone(daysDone: number): number {
  return MILESTONES.find((milestone) => daysDone < milestone) ?? MILESTONES[MILESTONES.length - 1]!;
}

interface HomeStatsCardProps {
  /** Okunan toplam gün sayısı ("N of 120 Day challenge"). */
  daysDone: number;
  /** Bitirilen kitap sayısı. */
  booksRead: number;
  /** Bugün okunan dakika. */
  minutesToday: number;
  onPressMore: () => void;
}

const ICON_CALENDAR = require("../../../../assets/home/icon-stat-calendar.png") as number;
const ICON_BOOK = require("../../../../assets/home/icon-stat-book.png") as number;
const ICON_CLOCK = require("../../../../assets/home/icon-stat-clock.png") as number;

interface StatProps {
  icon: number;
  value: string;
  label: string;
}

function Stat({ icon, value, label }: StatProps) {
  const palette = useHomePalette();
  return (
    <View style={styles.stat}>
      <Image source={icon} style={styles.statIcon} contentFit="cover" transition={0} />
      <View>
        <Text style={[homeType.statValue, { color: palette.valueInk }]}>{value}</Text>
        <Text
          style={[homeType.statLabel, { color: palette.muted }, styles.statLabelOffset]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * Ana sayfanın beyaz istatistik kartı: üstte haftalık okuma günü, altında
 * "bugün" için bitirilen kitap ve okuma süresi. Sağ üstteki üç nokta
 * ayrıntılı istatistik ekranını açıyor.
 */
export function HomeStatsCard({
  daysDone,
  booksRead,
  minutesToday,
  onPressMore,
}: HomeStatsCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.top}>
        <Image source={ICON_CALENDAR} style={styles.bigIcon} contentFit="cover" transition={0} />
        <View style={styles.topText}>
          <Text style={[homeType.cardTitle, { color: palette.valueInk }]}>
            {t("home.stats.weekValue", { done: daysDone, total: nextMilestone(daysDone) })}
          </Text>
          <Text style={[homeType.cardSub, { color: palette.muted }, styles.subOffset]}>
            {t("home.stats.weekLabel")}
          </Text>
        </View>
        <Pressable
          onPress={onPressMore}
          hitSlop={homeSpace.md}
          accessibilityRole="button"
          accessibilityLabel={t("home.stats.more")}
          style={styles.more}
        >
          <Ionicons name="ellipsis-horizontal" size={homeSpace.xl} color={homeColors.mutedStrong} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={[homeType.cardSection, { color: palette.ink }]}>{t("home.stats.today")}</Text>
      <View style={styles.statRow}>
        <Stat icon={ICON_BOOK} value={String(booksRead)} label={t("home.stats.booksRead")} />
        <Stat
          icon={ICON_CLOCK}
          value={t("home.stats.minutesValue", { count: minutesToday })}
          label={t("home.stats.readingTime")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    // Sahneye binen kart artık birincil eylem kartı (ana sayfa); bu kart
    // onun altında akıyor.
    padding: homeMetrics.cardPadding,
    paddingBottom: homeMetrics.cardPaddingBottom,
    minHeight: homeMetrics.cardMinHeight,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.card,
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  bigIcon: {
    width: homeMetrics.cardIcon,
    height: homeMetrics.cardIcon,
    borderRadius: homeMetrics.cardIcon / 2,
  },
  topText: {
    flex: 1,
    marginTop: -homeSpace.xs,
  },
  subOffset: {
    marginTop: homeSpace.xxs,
  },
  statLabelOffset: {
    marginTop: homeSpace.xs,
  },
  more: {
    padding: homeSpace.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: homeColors.hairline,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: homeSpace.md,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm + 1,
  },
  statIcon: {
    width: homeMetrics.statIcon,
    height: homeMetrics.statIcon,
    borderRadius: homeMetrics.statIcon / 2,
  },
  ink: {
    color: homeColors.ink,
  },
  muted: {
    color: homeColors.muted,
  },
});
