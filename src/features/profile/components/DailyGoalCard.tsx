import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon, useToast } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import { useUpdateDailyGoalMutation } from "@/features/profile/api/useGoalProgressQuery";
import { GOAL_OPTIONS } from "@/features/profile/goal";

import type { GoalProgress } from "@/features/profile/goal";

interface DailyGoalCardProps {
  progress: GoalProgress;
}

/**
 * İstatistik > "Günlük hedef": hedefi değiştir (5-30 dk), hedefin tutturulduğu
 * gün sayısı ve seri. Hedef `profiles.daily_goal_minutes`e yazılır; ilerleme
 * ve XP bonusu sunucuda yeniden hesaplanır (migration 054).
 */
export function DailyGoalCard({ progress }: DailyGoalCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const { show } = useToast();
  const update = useUpdateDailyGoalMutation();
  const selected = update.isPending && update.variables ? update.variables : progress.goal;

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.head}>
        <UiIcon name="clock" size={homeMetrics.statTileIcon} />
        <View style={styles.headText}>
          <Text style={[detailType.sheetTitle, { color: palette.ink }]}>
            {t("profile.goal.title")}
          </Text>
          <Text style={[homeType.cardSub, { color: palette.muted }]}>
            {t("profile.goal.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {GOAL_OPTIONS.map((minutes) => {
          const active = minutes === selected;
          return (
            <Pressable
              key={minutes}
              onPress={() => {
                if (active || update.isPending) return;
                update.mutate(minutes, { onError: () => show(t("profile.goal.saveError")) });
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={t("profile.goal.option", { count: minutes })}
              style={[styles.option, active ? styles.optionActive : null]}
            >
              <Text
                style={[
                  detailType.statLabel,
                  { color: active ? detailColors.amberInk : homeColors.mutedStrong },
                ]}
              >
                {t("profile.goal.option", { count: minutes })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("profile.goal.goalDays", { count: progress.goalDays })}
        </Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("profile.goal.streak", { count: progress.streak })}
        </Text>
      </View>
      <View style={styles.hint}>
        <Text style={[homeType.cardSub, { color: detailColors.amberInk }]}>
          {t("profile.goal.hint")}
        </Text>
      </View>
    </View>
  );
}

const OPTION_H = 40;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    gap: homeSpace.md,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  headText: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  options: {
    flexDirection: "row",
    gap: homeSpace.sm,
  },
  option: {
    flex: 1,
    height: OPTION_H,
    borderRadius: OPTION_H / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: {
    backgroundColor: detailColors.amber,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hint: {
    padding: homeSpace.md,
    borderRadius: homeSpace.md,
    backgroundColor: homeColors.peach,
  },
});
