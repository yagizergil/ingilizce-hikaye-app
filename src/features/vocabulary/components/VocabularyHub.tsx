import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { UiIconName } from "@/components/ui";
import type { SmartPracticeQuota } from "@/features/vocabulary/api/useSmartPractice";

interface VocabularyHubProps {
  total: number;
  learning: number;
  known: number;
  dueCount: number;
  quota: SmartPracticeQuota | undefined;
  onReview: () => void;
  onPractice: () => void;
}

/**
 * Kelimelerim'in üst bölümü (1.0.6): ilerleme özeti + iki çalışma yolu.
 *
 * Rakip analizi: "öğrenilen kelime sayacı" ve ilerleme her rakipte ÜCRETSİZ
 * -- motivasyon ve dönüşüm için var, satılmıyor. Premium olan Akıllı
 * Tekrar'ın kendisi; kartı ücretsiz kullanıcıya bugünkü denemesini açıkça
 * söylüyor ("bugün 1 ücretsiz deneme"), sürpriz paywall yok.
 */
export function VocabularyHub({
  total,
  learning,
  known,
  dueCount,
  quota,
  onReview,
  onPractice,
}: VocabularyHubProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = useHomePalette();
  const knownRatio = total > 0 ? known / total : 0;

  const practiceSubtitle = quota?.isPremium
    ? t("vocabulary.hub.practiceUnlimited")
    : (quota?.remaining ?? 0) > 0
      ? t("vocabulary.hub.practiceFreeLeft")
      : t("vocabulary.hub.practiceFreeUsed");

  return (
    <View style={styles.container}>
      <View style={[styles.progress, { backgroundColor: palette.card }]}>
        <Text style={[homeType.sectionTitle, { color: palette.ink }]}>
          {t("vocabulary.hub.progressTitle")}
        </Text>
        <View style={styles.stats}>
          <Stat
            value={learning}
            label={t("vocabulary.hub.learning")}
            color={detailColors.amberDeep}
          />
          <Stat value={known} label={t("vocabulary.hub.known")} color={theme.success} />
          <Stat value={total} label={t("vocabulary.hub.total")} color={palette.ink} />
        </View>
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.round(knownRatio * 100)}%`, backgroundColor: theme.success },
            ]}
          />
        </View>
      </View>

      <View style={styles.tiles}>
        <Tile
          icon="cards"
          title={t("vocabulary.hub.reviewTitle")}
          subtitle={
            dueCount > 0
              ? t("vocabulary.hub.reviewDue", { count: dueCount })
              : t("vocabulary.hub.reviewNone")
          }
          onPress={onReview}
          disabled={dueCount === 0}
        />
        <Tile
          icon="bulb"
          title={t("vocabulary.hub.practiceTitle")}
          subtitle={practiceSubtitle}
          badge={t("vocabulary.hub.premiumBadge")}
          onPress={onPractice}
          highlight
        />
      </View>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  const palette = useHomePalette();
  return (
    <View style={styles.stat}>
      <Text style={[detailType.heroTitle, styles.statValue, { color }]}>{value}</Text>
      <Text style={[homeType.cardSub, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

interface TileProps {
  icon: UiIconName;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

function Tile({ icon, title, subtitle, badge, onPress, disabled, highlight }: TileProps) {
  const palette = useHomePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: highlight ? homeColors.peach : palette.card,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.tileHead}>
        <UiIcon name={icon} size={homeMetrics.rowIcon} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={[homeType.cardSub, { color: detailColors.amberInk }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[detailType.sectionTitle, { color: highlight ? detailColors.title : palette.ink }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        style={[homeType.cardSub, { color: highlight ? detailColors.muted : palette.muted }]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

const BAR_HEIGHT = 8;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: homeMetrics.gutter,
    paddingBottom: homeSpace.md,
    gap: homeSpace.md,
  },
  progress: {
    borderRadius: homeMetrics.cardRadius,
    padding: homeSpace.lg,
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  stats: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontVariant: ["tabular-nums"],
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: BAR_HEIGHT / 2,
  },
  tiles: {
    flexDirection: "row",
    gap: homeSpace.md,
  },
  tile: {
    flex: 1,
    borderRadius: homeMetrics.cardRadius,
    padding: homeSpace.lg,
    gap: homeSpace.xs,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  tileHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: homeSpace.xs,
  },
  badge: {
    paddingHorizontal: homeSpace.sm,
    height: homeMetrics.continueButton - homeSpace.md,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
});
