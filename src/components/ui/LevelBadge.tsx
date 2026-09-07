import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { badgePadding, levelAccent, monoType, onLevelAccent, radius } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface LevelBadgeProps {
  /** CEFR level string, e.g. "A1".."C2". Typed as `string` here (not the
   * `Level` union) so this shared component doesn't depend on the
   * `library` feature — see src/features/library/components/LevelBadge.tsx
   * for the typed re-export used by that feature. */
  level: string;
}

function isKnownLevel(level: string): level is keyof typeof levelAccent {
  return level in levelAccent;
}

/**
 * REVISED (post-launch, product-owner design pass — matching a reference
 * app's colorful level badges): the previous version was an unfilled
 * 1px-border outline (per the original mockups). Now a filled pill using
 * `levelAccent[level]` (see colors.ts's doc comment — same deliberate,
 * scoped departure from the single-accent rule that `LevelGroupCard`
 * uses), so every CEFR badge across the app (library rows, book detail,
 * shelf cards) carries the same at-a-glance color identity as the home
 * screen's level list. Falls back to the old outline treatment for any
 * level string outside A1–C2 (shouldn't happen in practice, but keeps this
 * component from crashing/rendering unstyled on unexpected data).
 */
export function LevelBadge({ level }: LevelBadgeProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const known = isKnownLevel(level);

  return (
    <View
      style={[
        styles.badge,
        known
          ? { backgroundColor: levelAccent[level] }
          : [styles.fallbackBadge, { borderColor: theme.border.strong }],
      ]}
      accessibilityRole="text"
      accessibilityLabel={t("ui.levelBadge.accessibilityLabel", { level })}
    >
      <Text style={[monoType.badge, { color: known ? onLevelAccent : theme.text.primary }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingVertical: badgePadding.vertical,
    paddingHorizontal: badgePadding.horizontal,
    alignSelf: "flex-start",
  },
  fallbackBadge: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
