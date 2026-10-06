import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  categoryTints,
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
} from "@/theme";
import { UiIcon } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";

export const PACK_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface ExploreStripProps {
  onOpenPack: (level: string) => void;
}

/**
 * "Keşfet" -- seviye başına hazır kelime paketleri (1.0.6, premium).
 * Paketler katalogdaki gerçek kitaplardan çıkarılıyor: o seviyenin rafında
 * en çok kitapta geçen kelimeler. Karar ve önizleme sınırı sunucuda.
 *
 * Kartlar kategori ekranıyla aynı pastel tonlarda (sırayla), ikon
 * Higgsfield kart destesi.
 */
export function ExploreStrip({ onOpenPack }: ExploreStripProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[homeType.sectionTitle, { color: palette.ink }]}>
          {t("vocabulary.packs.sectionTitle")}
        </Text>
        <View style={styles.badge}>
          <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
            {t("vocabulary.hub.premiumBadge")}
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PACK_LEVELS.map((level, index) => (
          <Pressable
            key={level}
            onPress={() => onOpenPack(level)}
            accessibilityRole="button"
            accessibilityLabel={t("vocabulary.packs.cardTitle", { level })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: categoryTints[index % categoryTints.length],
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <UiIcon name="cards" size={homeMetrics.rowIcon} />
            <Text style={[detailType.sectionTitle, { color: detailColors.title }]}>
              {t("vocabulary.packs.cardTitle", { level })}
            </Text>
            <Text style={[homeType.cardSub, { color: detailColors.muted }]} numberOfLines={2}>
              {t("vocabulary.packs.cardBody")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 156;

const styles = StyleSheet.create({
  container: {
    gap: homeSpace.md,
    paddingBottom: homeSpace.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
  },
  badge: {
    paddingHorizontal: homeSpace.md,
    height: homeMetrics.continueButton - homeSpace.sm,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    gap: homeSpace.md,
    paddingRight: homeSpace.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: homeMetrics.cardRadius,
    padding: homeSpace.lg,
    gap: homeSpace.xs,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
