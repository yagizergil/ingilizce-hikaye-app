import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";

import { detailType, homeColors, homeMetrics, homeSpace, homeType, motion } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useHomePalette } from "@/features/home/useHomePalette";
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
  const palette = useHomePalette();
  // Deste kelimeleri öğrenilen dilde; eskiden her zaman "en-US" okunuyordu.
  const ttsLocale = useTargetTtsLocale();

  return (
    <View style={[styles.row, { backgroundColor: palette.card }]}>
      <Pressable
        onPress={() => Speech.speak(card.surface, { language: ttsLocale })}
        accessibilityRole="button"
        accessibilityLabel={t("reader.wordSheet.pronounce")}
        hitSlop={homeSpace.sm}
      >
        <View style={styles.speaker}>
          <Ionicons name="volume-medium" size={20} color={homeColors.muted} />
        </View>
      </Pressable>

      <Pressable style={styles.textBlock} onPress={() => onEdit(card)} accessibilityRole="button">
        <Text style={[detailType.sectionTitle, { color: palette.ink }]} numberOfLines={1}>
          {card.surface}
        </Text>
        <Text
          style={[homeType.cardSub, styles.meaning, { color: palette.muted }]}
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
        hitSlop={homeSpace.sm}
        style={({ pressed }) => [
          styles.deleteButton,
          { backgroundColor: homeColors.peach },
          pressed ? { opacity: motion.pressed.opacity } : null,
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const ICON_BUTTON = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    minHeight: homeMetrics.rowIcon + homeSpace.xl,
    paddingVertical: homeSpace.md,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  speaker: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    borderRadius: ICON_BUTTON / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
  },
  meaning: {
    marginTop: homeSpace.xs,
  },
  deleteButton: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    borderRadius: ICON_BUTTON / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
