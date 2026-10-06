import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  deckColorHex,
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  motion,
} from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";

import type { CustomDeck } from "@/features/vocabulary/types";
import { directionalIcon } from "@/lib/rtl";

interface DeckCardProps {
  deck: CustomDeck;
  onPress: (deck: CustomDeck) => void;
}

/**
 * "Destelerim" sekmesindeki tek bir deste kartı.
 *
 * Sol tarafta kullanıcının seçtiği renk rozeti (kimlik, bkz. `deckColors.ts`),
 * ortada isim + kelime sayısı, sağda -- yalnızca bugün vadesi gelen kart
 * varsa -- turuncu bir "N hazır" rozeti. Rozet olmayan deste sessiz kalıyor;
 * her deste için "0 hazır" yazmak gürültü olurdu.
 */
export function DeckCard({ deck, onPress }: DeckCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card },
        pressed ? { opacity: motion.pressed.opacity } : null,
      ]}
      onPress={() => onPress(deck)}
      accessibilityRole="button"
      accessibilityLabel={t("vocabulary.decks.card.accessibilityLabel", {
        name: deck.name,
        count: deck.cardCount,
      })}
    >
      <View style={[styles.swatch, { backgroundColor: deckColorHex(deck.colorKey) }]}>
        <Ionicons name="albums" size={20} color={detailColors.circle} />
      </View>

      <View style={styles.textBlock}>
        <Text style={[detailType.sectionTitle, { color: palette.ink }]} numberOfLines={1}>
          {deck.name}
        </Text>
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("vocabulary.decks.card.wordCount", { count: deck.cardCount })}
        </Text>
      </View>

      {deck.dueCount > 0 ? (
        <View style={styles.dueBadge}>
          <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
            {t("vocabulary.decks.card.dueBadge", { count: deck.dueCount })}
          </Text>
        </View>
      ) : (
        <Ionicons
          name={directionalIcon("chevron-forward", "chevron-back")}
          size={18}
          color={homeColors.muted}
        />
      )}
    </Pressable>
  );
}

const SWATCH = 48;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: homeSpace.xs,
  },
  dueBadge: {
    paddingHorizontal: homeSpace.md,
    height: homeMetrics.continueButton - homeSpace.sm,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
});
