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
  /** Kelimeyi defterden çıkarır. Verilmezse yer imi ikonu HİÇ
   * gösterilmiyor -- tıklanamayan bir düğme çizmek, bu satırın daha önce
   * yaptığı hatanın ta kendisiydi. */
  onRemove?: (word: VocabularyWord) => void;
  /** Bu satırın kaldırma isteği sürüyor mu. */
  removing?: boolean;
}

/**
 * FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): satır artık kartlı/
 * çerçeveli/sol-şeritli değil -- referanstaki gibi düz bir satır: sol
 * tarafta seslendirme düğmesi, ortada kelime (kalın) + karşılığı (gri,
 * altında), sağda kaydet/kaldır ikon düğmesi. CEFR/POS/kaynak-kitap
 * etiketleri ve SRS "tekrar tarihi" rozeti varsayılan görünümden kalktı
 * (referansta hiçbiri yok) -- veri KAYBOLMADI, yalnızca bu liste satırından
 * kalktı.
 *
 * DENETİM BULGUSU (2026-09-19): sağdaki yer imi ikonu bir `Pressable`
 * DEĞİL, düz bir `View`'dı ve satıra dokunmak da hiçbir şey yapmıyordu --
 * yani uygulamanın HİÇBİR YERİNDE bir kelimeyi defterden çıkarmanın yolu
 * yoktu. Bu yalnızca bir eksiklik değil, ücretsiz katmanda bir çıkmazdı:
 * kelime sınırına dayanan kullanıcı paywall şeridini görüyor ama yer
 * açamıyordu -- ya öde ya vazgeç. İkon artık gerçekten çalışıyor.
 *
 * ÖNCE ONAY SORULUYOR (bkz. ekrandaki `handleRemoveWord`): kaldırma geri
 * alınamıyor -- kelimeyle birlikte onun SRS tekrar kartı ve ilerlemesi de
 * siliniyor. Uygulamanın bildirim bileşeninde eylem düğmesi yok, yani
 * "geri al" sunulamıyordu; geri alınamayan bir kaybı sessizce yapmaktansa
 * tek bir onay penceresi göstermek doğru taraf.
 *
 * SESLENDİRME: bu satırda önceden hiç yoktu -- referansın sol ikonu
 * tam olarak bu, `WordSheet`'teki `handlePronounce` ile aynı basit
 * `expo-speech` çağrısı (aynı özel ses seçimini burada tekrar okumaya
 * gerek yok, defter satırı ayarlar ekranındaki sesi değil sistem
 * varsayılanını kullanıyor -- düşük riskli, geri alınabilir bir basitlik
 * tercihi).
 */
export function VocabularyWordRow({
  word,
  onPress,
  onRemove,
  removing = false,
}: VocabularyWordRowProps) {
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

      {onRemove ? (
        <Pressable
          onPress={() => onRemove(word)}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={t("vocabulary.word.removeAccessibilityLabel", { lemma: word.lemma })}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.bg.surface },
            pressed || removing ? { opacity: motion.pressed.opacity } : null,
          ]}
        >
          <Ionicons name="bookmark" size={18} color={theme.accent} />
        </Pressable>
      ) : null}
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
