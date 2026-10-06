import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

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
  const palette = useHomePalette();

  const peak = Math.max(...weekDays.map((day) => day.minutes), 1);
  const todayKey = todayDateKey();

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.header}>
        <UiIcon name="chart" size={homeMetrics.rowIcon} />
        <Text style={[detailType.sectionTitle, styles.title, { color: palette.ink }]}>
          {t("profile.week.title")}
        </Text>
        <Text style={[detailType.sectionTitle, styles.total, { color: detailColors.amberDeep }]}>
          {t("profile.week.totalMinutes", { count: totalMinutesThisWeek })}
        </Text>
      </View>

      {totalMinutesThisWeek === 0 ? (
        // Bu hafta hiç okunmadıysa 96 piksellik boş bir ızgara göstermek
        // grafiğin bozuk olduğu izlenimi veriyor. Bunun yerine tek satır
        // bir açıklama: ekran neden boş olduğunu kendisi söylüyor.
        <Text style={[homeType.cardSub, { color: palette.muted }]}>{t("profile.week.empty")}</Text>
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
                            ? homeColors.peach
                            : isToday
                              ? detailColors.amber
                              : detailColors.wordHighlight,
                      },
                    ]}
                  />
                </View>
                <Text style={[homeType.cardSub, { color: isToday ? palette.ink : palette.muted }]}>
                  {t(`profile.streak.days.${DAY_KEYS[index]}`)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
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
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    gap: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  title: {
    flex: 1,
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
    gap: homeSpace.xs,
  },
  barTrack: {
    // Çubuklar ortak bir tabandan yükselsin: iz her zaman tam yükseklikte,
    // çubuk alta yaslanıyor.
    height: MAX_BAR_HEIGHT,
    justifyContent: "flex-end",
  },
  bar: {
    width: homeSpace.xl,
    borderRadius: homeSpace.sm,
  },
});
