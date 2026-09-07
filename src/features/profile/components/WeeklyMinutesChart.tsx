import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Card } from "@/components/ui";

import type { ProfileDailyMinutes } from "@/features/profile/types";

interface WeeklyMinutesChartProps {
  weekDays: ProfileDailyMinutes[];
  totalMinutesThisWeek: number;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Grafiğin en yüksek çubuğunun piksel yüksekliği. */
const MAX_BAR_HEIGHT = 96;
/** Okunmayan günün de görünür kalması için taban yükseklik. */
const EMPTY_BAR_HEIGHT = 3;

/**
 * Haftalık okuma dakikaları — Pazartesi'den Pazar'a yedi çubuk.
 *
 * NEDEN ÇUBUK, TEK SAYI DEĞİL (2026-09-07): "bu hafta 42 dakika" tek
 * başına kullanıcıya alışkanlığı hakkında hiçbir şey söylemiyor. Yedi
 * çubuk "hafta içi okuyorum, hafta sonu bırakıyorum" gibi bir örüntüyü
 * bir bakışta gösteriyor — Beelinguapp ve LingQ'nun ilerleme ekranlarının
 * da yaptığı bu.
 *
 * Ölçek her zaman haftanın en yüksek gününe göre normalleniyor; sabit bir
 * tavan (ör. 60 dk) az okuyan kullanıcıda yedi ezik çubuk gösterirdi.
 * Bugünün çubuğu accent, diğerleri sakin bir vurgu zemini — hangi günde
 * olduğun okunabilir kalıyor.
 */
export function WeeklyMinutesChart({ weekDays, totalMinutesThisWeek }: WeeklyMinutesChartProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const peak = Math.max(...weekDays.map((day) => day.minutes), 1);
  const todayKey = todayDateKey();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[monoType.statLabel, { color: theme.text.secondary }]}>
          {t("profile.week.title")}
        </Text>
        <Text style={[monoType.statValue, styles.total, { color: theme.text.primary }]}>
          {t("profile.week.totalMinutes", { count: totalMinutesThisWeek })}
        </Text>
      </View>

      {totalMinutesThisWeek === 0 ? (
        // Bu hafta hiç okunmadıysa 96 piksellik boş bir ızgara göstermek
        // grafiğin bozuk olduğu izlenimi veriyor. Bunun yerine tek satır
        // bir açıklama: ekran neden boş olduğunu kendisi söylüyor.
        <Text style={[monoType.meta, { color: theme.text.secondary }]}>
          {t("profile.week.empty")}
        </Text>
      ) : (
        <View style={styles.chart}>
          {weekDays.map((day, index) => {
            const isToday = day.date === todayKey;
            const height =
              day.minutes > 0
                ? Math.max(Math.round((day.minutes / peak) * MAX_BAR_HEIGHT), 6)
                : EMPTY_BAR_HEIGHT;

            return (
              <View
                key={day.date}
                style={styles.column}
                accessibilityRole="text"
                accessibilityLabel={t("profile.week.dayAccessibilityLabel", {
                  day: t(`profile.streak.days.${DAY_KEYS[index]}`),
                  count: day.minutes,
                })}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor:
                          day.minutes === 0
                            ? theme.border.hairline
                            : isToday
                              ? theme.accent
                              : theme.highlight,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    monoType.metaTight,
                    { color: isToday ? theme.text.primary : theme.text.secondary },
                  ]}
                >
                  {t(`profile.streak.days.${DAY_KEYS[index]}`)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

/** Bugünün YYYY-MM-DD anahtarı — useProfileStatsQuery ile aynı biçim. */
function todayDateKey(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  total: {
    fontVariant: ["tabular-nums"],
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  barTrack: {
    // Çubuklar ortak bir tabandan yükselsin: iz her zaman tam yükseklikte,
    // çubuk alta yaslanıyor.
    height: MAX_BAR_HEIGHT,
    justifyContent: "flex-end",
  },
  bar: {
    width: 22,
    borderRadius: radius.sm,
  },
});
