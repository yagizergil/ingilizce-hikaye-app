import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailColors, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";

export interface WeekStripDay {
  /** YYYY-MM-DD (yerel gün). */
  date: string;
  minutes: number;
}

interface WeekStripProps {
  days: WeekStripDay[];
  /** Bugünün YYYY-MM-DD karşılığı: halka ile işaretlenir. */
  today: string;
}

/**
 * "Bu hafta" şeridi: Pazartesi-Pazar yedi daire. Okunan gün amber dolgu +
 * tik, bugün turuncu halka, gelecek/boş gün soluk. Gün harfi cihaz dilinden
 * (`Intl`), sabit bir Türkçe dizi yok.
 */
export function WeekStrip({ days, today }: WeekStripProps) {
  const { t, i18n } = useTranslation();
  const palette = useHomePalette();
  const readCount = days.filter((day) => day.minutes > 0).length;

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.head}>
        <Text style={[homeType.cardSection, { color: palette.ink }]}>{t("home.week.title")}</Text>
        <Text style={[homeType.statLabel, { color: palette.muted }]}>
          {t("home.week.count", { count: readCount })}
        </Text>
      </View>
      <View style={styles.row}>
        {days.map((day) => {
          const read = day.minutes > 0;
          const isToday = day.date === today;
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
                count: day.minutes,
              })}
            >
              <View
                style={[
                  styles.circle,
                  read ? styles.circleRead : null,
                  isToday ? styles.circleToday : null,
                ]}
              >
                {read ? (
                  <Ionicons name="checkmark" size={homeSpace.xl} color={detailColors.amberInk} />
                ) : null}
              </View>
              <Text
                style={[homeType.statLabel, { color: isToday ? homeColors.orange : palette.muted }]}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

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
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: homeSpace.xs,
  },
  circle: {
    width: homeMetrics.weekCircle,
    height: homeMetrics.weekCircle,
    borderRadius: homeMetrics.weekCircle / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: homeMetrics.weekRing,
    borderColor: "transparent",
  },
  circleRead: {
    backgroundColor: detailColors.amber,
  },
  circleToday: {
    borderColor: homeColors.orange,
  },
});
