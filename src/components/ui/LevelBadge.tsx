import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { levelAccent, monoType, onLevelAccent } from "@/theme";
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
      <Text style={[monoType.levelBadge, { color: known ? onLevelAccent : theme.text.primary }]}>{level}</Text>
    </View>
  );
}

/**
 * ÖLÇÜLER REFERANSTAN (docs/reference/referance1.jpeg, 945 px genişlik,
 * 1pt = 2.4046px):
 *   rozet 70x71 px -> 30x30 pt kare
 *   köşe yarıçapı ~19 px -> 8 pt
 *   etiket büyük harf yüksekliği 22 px -> ~13 pt gövde, kalın
 *
 * Eskiden rozet metne göre büyüyen küçük bir etiketti (10 pt yazı,
 * 2x6 pt iç boşluk) ve kapağın üstünde kaybolyordu. Referansta rozet SABİT
 * KARE ve iri -- kapağa bakan kişi seviyeyi okumadan önce rengiyle
 * tanıyor. Sabit kare aynı zamanda bütün kapaklarda aynı yerde aynı
 * boyutta durmasını garantiliyor.
 */
const BADGE_SIZE = 30;

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  fallbackBadge: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
