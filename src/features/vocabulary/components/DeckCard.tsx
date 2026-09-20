import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { deckColorHex, monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { CustomDeck } from "@/features/vocabulary/types";

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
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
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
        <Ionicons name="albums" size={18} color={theme.text.onAccent} />
      </View>

      <View style={styles.textBlock}>
        <Text style={[type.bookTitleMd, { color: theme.text.primary }]} numberOfLines={1}>
          {deck.name}
        </Text>
        <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
          {t("vocabulary.decks.card.wordCount", { count: deck.cardCount })}
        </Text>
      </View>

      {deck.dueCount > 0 ? (
        <View style={[styles.dueBadge, { backgroundColor: theme.accent }]}>
          <Text style={[monoType.label, { color: theme.text.onAccent }]}>
            {t("vocabulary.decks.card.dueBadge", { count: deck.dueCount })}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  dueBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
});
