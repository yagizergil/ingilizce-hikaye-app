import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Card } from "@/components/ui";

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
 * Okuma serisi kartı — büyük seri sayısı, haftanın yedi günü için
 * dolu/boş işaretler ve en uzun seri.
 *
 * NEDEN (2026-09-07): profil ekranındaki istatistikler hem çalışmıyordu
 * (yazan taraf hiç yoktu, bkz. migration 026) hem de yalnızca dört ölü
 * sayıdan ibaretti. Seri, bu kategorideki her rakibin (Duolingo başta)
 * elde tutma mekaniğinin merkezinde — çünkü tek bir sayıyla "bugün de
 * oku" diyor. Burada da öyle konumlandı: kart, bugün okunmamışsa
 * kullanıcıyı hatırlatan bir satır gösteriyor.
 *
 * Bu bir paywall promosyonu DEĞİL ve okuma ekranında da değil — ürün
 * ilkesi #1 korunuyor.
 */
export function StreakCard({ currentStreak, longestStreak, readToday, weekDays }: StreakCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.streakBlock}>
          <View style={styles.streakValueRow}>
            <Ionicons name="flame" size={26} color={currentStreak > 0 ? theme.accent : theme.text.tertiary} />
            <Text style={[monoType.statValueXl, styles.streakValue, { color: theme.text.primary }]}>
              {currentStreak}
            </Text>
          </View>
          <Text style={[monoType.statLabel, { color: theme.text.secondary }]}>
            {t("profile.streak.currentLabel")}
          </Text>
        </View>

        <View style={styles.longestBlock}>
          <Text style={[monoType.statValue, styles.longestValue, { color: theme.text.primary }]}>
            {longestStreak}
          </Text>
          <Text style={[monoType.statLabel, { color: theme.text.secondary }]}>
            {t("profile.streak.longestLabel")}
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
              <View
                style={[
                  styles.dayDot,
                  active
                    ? { backgroundColor: theme.accent }
                    : { borderColor: theme.border.hairline, borderWidth: 1 },
                ]}
              >
                {active ? <Ionicons name="checkmark" size={13} color={theme.text.onAccent} /> : null}
              </View>
              <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>
                {t(`profile.streak.days.${DAY_KEYS[index]}`)}
              </Text>
            </View>
          );
        })}
      </View>

      {!readToday ? (
        <Text style={[monoType.meta, styles.hint, { color: theme.text.secondary }]}>
          {currentStreak > 0
            ? t("profile.streak.keepGoing", { count: currentStreak })
            : t("profile.streak.startToday")}
        </Text>
      ) : null}
    </Card>
  );
}

const DOT_SIZE = 30;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  streakBlock: {
    gap: spacing.xxs,
  },
  streakValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  streakValue: {
    fontVariant: ["tabular-nums"],
  },
  longestBlock: {
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  longestValue: {
    fontVariant: ["tabular-nums"],
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  dayDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    // Kart içinde ayrı bir blok gibi dursun.
    borderRadius: radius.sm,
  },
});
