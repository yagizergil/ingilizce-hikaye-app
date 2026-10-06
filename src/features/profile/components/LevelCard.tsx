import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import { levelFromXp, rankForLevel, totalXp } from "@/features/profile/xp";

import type { UiIconName } from "@/components/ui";
import type { XpBreakdown } from "@/features/profile/xp";

interface LevelCardProps {
  xp: XpBreakdown;
}

const SOURCES: { key: Exclude<keyof XpBreakdown, "today">; icon: UiIconName }[] = [
  { key: "reading", icon: "clock" },
  { key: "words", icon: "bookmark" },
  { key: "reviews", icon: "cards" },
  { key: "quiz", icon: "bulb" },
  { key: "books", icon: "trophy" },
  { key: "goals", icon: "flame" },
];

/**
 * Okur seviyesi kartı (istatistik ekranının en üstü): büyük seviye rozeti,
 * unvan, seviye içi ilerleme çubuğu, bugün kazanılan XP ve kaynaklara göre
 * döküm. Kural ve eğri `profile/xp.ts`, XP sunucuda (migration 053).
 */
export function LevelCard({ xp }: LevelCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const total = totalXp(xp);
  const progress = levelFromXp(total);
  const rank = rankForLevel(progress.level);

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={[detailType.heroTitle, styles.badgeText]}>{progress.level}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={[homeType.statLabel, { color: palette.muted }]}>
            {t("profile.level.levelLabel", { level: progress.level })}
          </Text>
          <Text style={[detailType.sheetTitle, { color: palette.ink }]}>
            {t(`profile.level.ranks.${rank}`)}
          </Text>
        </View>
        {xp.today > 0 ? (
          <View style={styles.todayPill}>
            <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
              {t("profile.level.today", { xp: xp.today })}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: progress.needed, now: progress.intoLevel }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${progress.fraction * 100}%` }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("profile.level.progress", { current: progress.intoLevel, needed: progress.needed })}
        </Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("profile.level.toNext", {
            xp: progress.needed - progress.intoLevel,
            level: progress.level + 1,
          })}
        </Text>
      </View>

      <View style={styles.sources}>
        {SOURCES.map((source) => (
          <View key={source.key} style={styles.sourceRow}>
            <UiIcon name={source.icon} size={homeMetrics.rowIcon} />
            <Text style={[detailType.statLabel, styles.sourceLabel, { color: palette.ink }]}>
              {t(`profile.level.sources.${source.key}`)}
            </Text>
            <Text style={[detailType.statLabel, styles.sourceValue, { color: palette.ink }]}>
              {t("profile.level.xp", { xp: xp[source.key] })}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.hint}>
        <Text style={[homeType.cardSub, { color: detailColors.amberInk }]}>
          {t("profile.level.howTo")}
        </Text>
      </View>
    </View>
  );
}

const BADGE = 64;
const TRACK = 12;

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
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: detailColors.amberInk,
    fontVariant: ["tabular-nums"],
  },
  titleBlock: {
    flex: 1,
    gap: homeSpace.xs,
  },
  todayPill: {
    paddingHorizontal: homeSpace.md,
    paddingVertical: homeSpace.xs,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
  },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  fill: {
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: detailColors.amber,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sources: {
    gap: homeSpace.sm,
    paddingTop: homeSpace.xs,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  sourceLabel: {
    flex: 1,
  },
  sourceValue: {
    fontVariant: ["tabular-nums"],
  },
  hint: {
    padding: homeSpace.md,
    borderRadius: homeSpace.md,
    backgroundColor: homeColors.peach,
  },
});
