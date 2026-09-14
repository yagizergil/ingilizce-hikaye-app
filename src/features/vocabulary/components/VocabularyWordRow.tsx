import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";

import { monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { VocabularyWord } from "@/features/vocabulary/types";

interface VocabularyWordRowProps {
  word: VocabularyWord;
  onPress: (word: VocabularyWord) => void;
}

/**
 * FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): satır artık kartlı/
 * çerçeveli/sol-şeritli değil -- referanstaki gibi düz bir satır: sol
 * tarafta seslendirme düğmesi, ortada kelime (kalın) + karşılığı (gri,
 * altında), sağda kaydet/kaldır ikon düğmesi. CEFR/POS/kaynak-kitap
 * etiketleri ve SRS "tekrar tarihi" rozeti varsayılan görünümden kalktı
 * (referansta hiçbiri yok) -- veri KAYBOLMADI, yalnızca bu liste satırından
 * kalktı; kelime detayına dokunulduğunda (`onPress`) hâlâ erişilebilir.
 *
 * SESLENDİRME: bu satırda önceden hiç yoktu -- referansın sol ikonu
 * tam olarak bu, `WordSheet`'teki `handlePronounce` ile aynı basit
 * `expo-speech` çağrısı (aynı özel ses seçimini burada tekrar okumaya
 * gerek yok, defter satırı ayarlar ekranındaki sesi değil sistem
 * varsayılanını kullanıyor -- düşük riskli, geri alınabilir bir basitlik
 * tercihi).
 */
export function VocabularyWordRow({ word, onPress }: VocabularyWordRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handlePronounce = useCallback(() => {
    Speech.speak(word.lemma, { language: "en-US" });
  }, [word.lemma]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border.hairline },
        pressed ? { opacity: motion.pressed.opacity } : null,
      ]}
      onPress={() => onPress(word)}
      accessibilityRole="button"
      accessibilityLabel={t("vocabulary.word.accessibilityLabel", {
        lemma: word.lemma,
        gloss: word.gloss ?? "",
      })}
    >
      <Pressable
        onPress={handlePronounce}
        accessibilityRole="button"
        accessibilityLabel={t("reader.wordSheet.pronounce")}
        hitSlop={spacing.sm}
      >
        <Ionicons name="volume-medium-outline" size={22} color={theme.text.secondary} />
      </Pressable>

      <View style={styles.textBlock}>
        <Text style={[type.bookTitleMd, { color: theme.text.primary }]} numberOfLines={1}>
          {word.lemma}
        </Text>
        {word.gloss !== null ? (
          <Text
            style={[monoType.rowText, styles.gloss, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {word.gloss}
          </Text>
        ) : null}
      </View>

      <View style={[styles.saveButton, { backgroundColor: theme.bg.surface }]}>
        <Ionicons name="bookmark-outline" size={18} color={theme.text.secondary} />
      </View>
    </Pressable>
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
  gloss: {
    marginTop: spacing.xxs,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
