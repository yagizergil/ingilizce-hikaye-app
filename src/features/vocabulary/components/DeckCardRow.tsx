import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";

import { monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useTargetTtsLocale } from "@/features/languagePair";

import type { CustomDeckCard } from "@/features/vocabulary/types";

interface DeckCardRowProps {
  card: CustomDeckCard;
  onEdit: (card: CustomDeckCard) => void;
  onDelete: (card: CustomDeckCard) => void;
}

/**
 * Deste detayındaki tek bir kelime satırı -- `VocabularyWordRow`ın aynı
 * satır iskeletini (sol seslendirme, orta metin bloğu, sağ eylemler)
 * izliyor, ama burada karşılık HER ZAMAN var (kullanıcı kendi yazdı) ve
 * sağda kaydet yerine düzenle/sil ikisi birden var.
 *
 * TELAFFUZ ÜCRETSİZ (ADR-012): özel kelimelerde de aynı `expo-speech`
 * motoru -- kitap kelimelerinden farklı bir kural yok.
 */
export function DeckCardRow({ card, onEdit, onDelete }: DeckCardRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Deste kelimeleri öğrenilen dilde; eskiden her zaman "en-US" okunuyordu.
  const ttsLocale = useTargetTtsLocale();

  return (
    <View style={[styles.row, { borderBottomColor: theme.border.hairline }]}>
      <Pressable
        onPress={() => Speech.speak(card.surface, { language: ttsLocale })}
        accessibilityRole="button"
        accessibilityLabel={t("reader.wordSheet.pronounce")}
        hitSlop={spacing.sm}
      >
        <Ionicons name="volume-medium-outline" size={22} color={theme.text.secondary} />
      </Pressable>

      <Pressable style={styles.textBlock} onPress={() => onEdit(card)} accessibilityRole="button">
        <Text style={[type.bookTitleMd, { color: theme.text.primary }]} numberOfLines={1}>
          {card.surface}
        </Text>
        <Text
          style={[monoType.rowText, styles.meaning, { color: theme.text.secondary }]}
          numberOfLines={1}
        >
          {card.meaning}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onDelete(card)}
        accessibilityRole="button"
        accessibilityLabel={t("vocabulary.decks.card.removeAccessibilityLabel", {
          surface: card.surface,
        })}
        hitSlop={spacing.sm}
        style={({ pressed }) => [
          styles.deleteButton,
          { backgroundColor: theme.bg.surface },
          pressed ? { opacity: motion.pressed.opacity } : null,
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textBlock: {
    flex: 1,
  },
  meaning: {
    marginTop: spacing.xxs,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
