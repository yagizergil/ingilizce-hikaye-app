import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { ProfileDailyMinutes } from "@/features/profile/types";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  readToday: boolean;
  weekDays: ProfileDailyMinutes[];
}

/** Pazartesi'den Pazar'a gün kısaltmalarının i18n anahtarları. */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Okuma serisi kartı — alev ikonu ve büyük seri sayısı, en uzun seri hapı,
 * haftanın yedi günü için dolu/boş daireler ve bugün okunmadıysa bir
 * hatırlatma satırı.
 *
 * Bu bir paywall promosyonu DEĞİL ve okuma ekranında da değil — ürün
 * ilkesi #1 korunuyor.
 */
export function StreakCard({ currentStreak, longestStreak, readToday, weekDays }: StreakCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.top}>
        <UiIcon name="flame" size={homeMetrics.statTileIcon} />
        <View style={styles.streakBlock}>
          <Text style={[detailType.heroTitle, styles.number, { color: palette.ink }]}>
            {currentStreak}
          </Text>
          <Text style={[homeType.statLabel, { color: palette.muted }]}>
            {t("profile.streak.currentLabel")}
          </Text>
        </View>
        <View style={styles.longestPill}>
          <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
            {t("profile.streak.longestLabel")} · {longestStreak}
          </Text>
        </View>
      </View>

      <View
        style={styles.week}
        accessibilityRole="text"
        accessibilityLabel={t("profile.streak.weekAccessibilityLabel", {
          count: weekDays.filter((day) => day.minutes > 0).length,
        })}
      >
        {weekDays.map((day, index) => {
          const active = day.minutes > 0;
          return (
            <View key={day.date} style={styles.dayColumn}>
              <View style={[styles.dayDot, active ? styles.dayDotActive : styles.dayDotIdle]}>
                {active ? (
                  <Ionicons name="checkmark" size={14} color={detailColors.amberInk} />
                ) : null}
              </View>
              <Text style={[homeType.cardSub, { color: palette.muted }]}>
                {t(`profile.streak.days.${DAY_KEYS[index]}`)}
              </Text>
            </View>
          );
        })}
      </View>

      {!readToday ? (
        <View style={styles.hint}>
          <Text style={[homeType.cardSub, { color: detailColors.amberInk }]}>
            {currentStreak > 0
              ? t("profile.streak.keepGoing", { count: currentStreak })
              : t("profile.streak.startToday")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const DOT_SIZE = 34;

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
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  streakBlock: {
    flex: 1,
  },
  number: {
    fontVariant: ["tabular-nums"],
  },
  longestPill: {
    paddingHorizontal: homeSpace.md,
    height: homeMetrics.continueButton - homeSpace.xs,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: homeSpace.xs,
  },
  dayDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotActive: {
    backgroundColor: detailColors.amber,
  },
  dayDotIdle: {
    backgroundColor: homeColors.peach,
  },
  hint: {
    padding: homeSpace.md,
    borderRadius: homeSpace.md,
    backgroundColor: homeColors.peach,
  },
});
