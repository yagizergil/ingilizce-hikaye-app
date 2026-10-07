import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

export interface WeekStripDay {
  /** YYYY-MM-DD (yerel gün). */
  date: string;
  minutes: number;
}

interface WeekStripProps {
  days: WeekStripDay[];
  /** Bugünün YYYY-MM-DD karşılığı. */
  today: string;
  /** Günlük hedef (dk): bu kadar okunan gün dolu amber çizilir. */
  goalMinutes: number;
}

const BAR_MAX = 64;
const BAR_MIN = 6;
const BAR_W = 22;

/**
 * "Bu hafta" (2026-10-07 yeniden tasarım): Pazartesi-Pazar yedi sütun,
 * yükseklik o günün okuma dakikası. Hedef tutturulan gün dolu amber, okunan
 * ama hedefin altında kalan gün açık amber, okunmayan gün yalnızca iz.
 *
 * NEDEN: eski kart yedi aynı daireydi ("dandik", kullanıcı bulgusu) ve
 * okunan günü işaretlediği hâlde meydan okuma (hedef günleri) artmayınca
 * kullanıcı "sayılmadı" sanıyordu. Hedef çizgisi ve iki ton farkı bunu
 * görünür kılıyor.
 */
export function WeekStrip({ days, today, goalMinutes }: WeekStripProps) {
  const { t, i18n } = useTranslation();
  const palette = useHomePalette();
  const total = Math.round(days.reduce((sum, day) => sum + day.minutes, 0));
  const scaleMax = Math.max(goalMinutes * 1.5, ...days.map((day) => day.minutes), 1);
  const goalLine = Math.min(BAR_MAX, (goalMinutes / scaleMax) * BAR_MAX);

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.head}>
        <UiIcon name="flame" size={homeMetrics.rowIcon} />
        <Text style={[homeType.cardSection, styles.title, { color: palette.ink }]}>
          {t("home.week.title")}
        </Text>
        <Text style={[homeType.statLabel, { color: palette.muted }]}>
          {t("home.week.total", { count: total })}
        </Text>
      </View>

      <View style={styles.chart}>
        <View style={[styles.goalLine, { bottom: goalLine }]} />
        {days.map((day) => {
          const isToday = day.date === today;
          const met = day.minutes >= goalMinutes;
          const read = day.minutes > 0;
          const height = read ? Math.max(BAR_MIN, (day.minutes / scaleMax) * BAR_MAX) : BAR_MIN;
          const letter = new Date(`${day.date}T12:00:00`).toLocaleDateString(i18n.language, {
            weekday: "narrow",
          });
          return (
            <View
              key={day.date}
              style={styles.day}
              accessibilityLabel={t("home.week.dayAccessibility", {
                day: new Date(`${day.date}T12:00:00`).toLocaleDateString(i18n.language, {
                  weekday: "long",
                }),
                count: Math.round(day.minutes),
              })}
            >
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    met ? styles.barMet : read ? styles.barRead : styles.barEmpty,
                  ]}
                />
              </View>
              <View style={[styles.letter, isToday ? styles.letterToday : null]}>
                <Text
                  style={[
                    homeType.statLabel,
                    { color: isToday ? detailColors.amberInk : palette.muted },
                  ]}
                >
                  {letter}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.dot, styles.barMet]} />
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("home.week.legendGoal", { count: goalMinutes })}
        </Text>
        <View style={[styles.dot, styles.barRead]} />
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("home.week.legendRead")}
        </Text>
      </View>
    </View>
  );
}

const LETTER = 28;
const DOT = 10;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    marginTop: homeSpace.lg,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
  },
  title: {
    flex: 1,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    // Harf satırının üstünden ölçülür.
    marginBottom: LETTER + homeSpace.xs,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: detailColors.amber,
    opacity: 0.6,
  },
  day: {
    alignItems: "center",
    gap: homeSpace.xs,
  },
  track: {
    height: BAR_MAX,
    justifyContent: "flex-end",
  },
  bar: {
    width: BAR_W,
    borderRadius: BAR_W / 2,
  },
  barMet: {
    backgroundColor: detailColors.amber,
  },
  barRead: {
    backgroundColor: homeColors.peachStrong,
  },
  barEmpty: {
    backgroundColor: homeColors.peach,
  },
  letter: {
    width: LETTER,
    height: LETTER,
    borderRadius: LETTER / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  letterToday: {
    backgroundColor: homeColors.peach,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    marginLeft: homeSpace.xs,
  },
});
