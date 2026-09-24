import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UpperText } from "@/components/ui/UpperText";

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
  const knownRatio = total > 0 ? known / total : 0;

  const practiceSubtitle = quota?.isPremium
    ? t("vocabulary.hub.practiceUnlimited")
    : (quota?.remaining ?? 0) > 0
      ? t("vocabulary.hub.practiceFreeLeft")
      : t("vocabulary.hub.practiceFreeUsed");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.progress,
          { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
        ]}
      >
        <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
          {t("vocabulary.hub.progressTitle")}
        </UpperText>
        <View style={styles.stats}>
          <Stat value={learning} label={t("vocabulary.hub.learning")} color={theme.accent} />
          <Stat value={known} label={t("vocabulary.hub.known")} color={theme.success} />
          <Stat value={total} label={t("vocabulary.hub.total")} color={theme.text.primary} />
        </View>
        <View style={[styles.bar, { backgroundColor: theme.border.hairline }]}>
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
          icon="repeat"
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
          icon="school"
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
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[type.bookTitleLg, styles.statValue, { color }]}>{value}</Text>
      <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>{label}</Text>
    </View>
  );
}

interface TileProps {
  icon: "repeat" | "school";
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

function Tile({ icon, title, subtitle, badge, onPress, disabled, highlight }: TileProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: highlight ? theme.accentMuted : theme.bg.surface,
          borderColor: highlight ? theme.accent : theme.border.hairline,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.tileHead}>
        <Ionicons name={icon} size={22} color={highlight ? theme.accent : theme.text.primary} />
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={[monoType.metaTight, { color: theme.text.onAccent }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[type.chapterRowTitle, { color: theme.text.primary }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[monoType.metaTight, { color: theme.text.secondary }]} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  progress: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
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
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  tiles: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  tileHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});
