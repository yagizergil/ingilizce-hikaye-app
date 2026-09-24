import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UpperText } from "@/components/ui/UpperText";

export const PACK_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface ExploreStripProps {
  onOpenPack: (level: string) => void;
}

/**
 * "Keşfet" -- seviye başına hazır kelime paketleri (1.0.6, premium).
 * Paketler katalogdaki gerçek kitaplardan çıkarılıyor: o seviyenin rafında
 * en çok kitapta geçen kelimeler. Karar ve önizleme sınırı sunucuda.
 */
export function ExploreStrip({ onOpenPack }: ExploreStripProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
          {t("vocabulary.packs.sectionTitle")}
        </UpperText>
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={[monoType.metaTight, { color: theme.text.onAccent }]}>
            {t("vocabulary.hub.premiumBadge")}
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PACK_LEVELS.map((level) => (
          <Pressable
            key={level}
            onPress={() => onOpenPack(level)}
            accessibilityRole="button"
            accessibilityLabel={t("vocabulary.packs.cardTitle", { level })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.hairline,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="albums-outline" size={20} color={theme.accent} />
            <Text style={[type.chapterRowTitle, { color: theme.text.primary }]}>
              {t("vocabulary.packs.cardTitle", { level })}
            </Text>
            <Text style={[monoType.metaTight, { color: theme.text.secondary }]} numberOfLines={2}>
              {t("vocabulary.packs.cardBody")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  row: {
    gap: spacing.sm,
  },
  card: {
    width: 148,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xxs,
  },
});
