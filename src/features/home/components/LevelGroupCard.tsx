import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { levelAccent, monoType, onLevelAccent, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LEVEL_GROUP_LEVELS } from "@/features/library/types";

import type { LevelGroup } from "@/features/library/types";

interface LevelGroupCardProps {
  levelGroup: LevelGroup;
  count: number;
  onPress: (levelGroup: LevelGroup) => void;
  /** Hides the bottom divider on the last row of the stack (see
   * app/(tabs)/index.tsx, which renders these inside one merged card). */
  isLast?: boolean;
}

const TITLE_KEY: Record<LevelGroup, string> = {
  beginner: "home.levelGroups.beginner",
  intermediate: "home.levelGroups.intermediate",
  advanced: "home.levelGroups.advanced",
};

const CEFR_RANGE_KEY: Record<LevelGroup, string> = {
  beginner: "home.levelGroups.beginnerRange",
  intermediate: "home.levelGroups.intermediateRange",
  advanced: "home.levelGroups.advancedRange",
};

/**
 * One row of the "Seviyelere Göre Kitaplar" list -- one of a fixed 3-row
 * stack merged into a single card by its parent (app/(tabs)/index.tsx).
 * Unlike every other home section, this ALWAYS renders regardless of
 * `count`, including 0 -- it's a permanent navigation element into the
 * library's level filter, not a content shelf that hides when empty.
 *
 * REVISED (post-launch, product-owner design pass -- matching a reference
 * app's colorful level list): rebuilt from a standalone bordered card into
 * a plain row (colored square + label/range + count + chevron) that lives
 * inside one shared rounded surface, per `levelAccent`'s doc comment in
 * colors.ts -- a deliberate, scoped departure from the single-accent rule
 * for level identity specifically.
 */
export function LevelGroupCard({ levelGroup, count, onPress, isLast }: LevelGroupCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // LEVEL_GROUP_LEVELS[group] is a fixed, non-empty tuple (see
  // library/types.ts) -- [0] is always defined despite the indexed-access
  // type widening to `| undefined` under noUncheckedIndexedAccess.
  const badgeLevel = LEVEL_GROUP_LEVELS[levelGroup][0]!;

  return (
    <Pressable
      style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.hairline }]}
      onPress={() => onPress(levelGroup)}
      accessibilityRole="button"
      accessibilityLabel={t("home.levelGroups.accessibilityLabel", {
        title: t(TITLE_KEY[levelGroup]),
        count,
      })}
    >
      <View style={[styles.badge, { backgroundColor: levelAccent[badgeLevel] }]}>
        <Text style={[monoType.badge, { color: onLevelAccent }]}>{badgeLevel}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[type.sectionHeading, { color: theme.text.primary }]}>{t(TITLE_KEY[levelGroup])}</Text>
        <Text style={[monoType.meta, styles.range, { color: theme.text.secondary }]}>
          {t(CEFR_RANGE_KEY[levelGroup])}
        </Text>
      </View>
      <Text style={[monoType.statValueLg, { color: theme.text.primary }]}>{count}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    width: spacing.xxxxl,
    height: spacing.xxxxl,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  range: {
    marginTop: spacing.xxs,
  },
  chevron: {
    marginLeft: spacing.xxs,
  },
});
