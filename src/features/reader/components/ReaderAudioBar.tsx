import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { motion, radius, spacing } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

interface ReaderAudioBarProps {
  isSpeaking: boolean;
  isPreparing: boolean;
  onToggle: () => void;
  /** Bir kelime geri (-1) / ileri (+1). */
  onSkipWord: (delta: number) => void;
}

/**
 * Seslendirme kontrol çubuğu (referans: docs/reference/referance4.jpeg).
 *
 * YALNIZCA SESLENDİRMESİ OLAN VE ERİŞİMİ AÇIK KİTAPLARDA görünüyor --
 * çağıran taraf (`ReaderScreen`) `canPlayAudio` false iken bu bileşeni hiç
 * render etmiyor. Kilitli bir çubuk göstermek okuma ekranına premium
 * promosyonu sokmak olurdu (Ürün İlkesi #1, ADR-012).
 *
 * OKLAR SANİYE DEĞİL KELİME ATLIYOR: kullanıcı bir kelimeyi kaçırdığında
 * ya da tekrar duymak istediğinde basıyor. Zaman işaretleri zaten kelime
 * kelime elimizde; sabit bir saniye adımı hızlı konuşulan bir yerde üç
 * kelime atlar, yavaş bir yerde aynı kelimede kalırdı.
 *
 * ÖLÇÜLDÜ (referance4.jpeg, 1pt = 2.4046px):
 *   oynat/duraklat dairesi 128 px -> 54 pt, yatayda TAM ORTADA
 *   dairenin merkezi çubuğun üstünden 108 px -> 45 pt
 *   yan ikonların merkezleri ±57 pt (139 ve 255 pt) -> daireden 57 pt uzak
 *   çubuk yüksekliği (güvenli alan hariç) ~86 pt
 */
const CIRCLE_SIZE = 54;
const SIDE_GAP = 57 - CIRCLE_SIZE / 2;
const BAR_HEIGHT = 86;

export function ReaderAudioBar({
  isSpeaking,
  isPreparing,
  onToggle,
  onSkipWord,
}: ReaderAudioBarProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: readerColors.background,
          borderTopColor: readerColors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => onSkipWord(-1)}
          accessibilityRole="button"
          accessibilityLabel={t("reader.audioBar.previousWord")}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.sideButton,
            { opacity: pressed ? motion.pressed.opacity : 1 },
          ]}
        >
          <Ionicons name="play-back" size={24} color={readerColors.text} />
        </Pressable>

        <Pressable
          onPress={onToggle}
          disabled={isPreparing}
          accessibilityRole="button"
          accessibilityState={{ busy: isPreparing }}
          accessibilityLabel={t(isSpeaking ? "reader.audioBar.pause" : "reader.audioBar.play")}
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: readerColors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {isPreparing ? (
            <ActivityIndicator color={readerColors.background} />
          ) : (
            <Ionicons
              name={isSpeaking ? "pause" : "play"}
              size={26}
              color={readerColors.background}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => onSkipWord(1)}
          accessibilityRole="button"
          accessibilityLabel={t("reader.audioBar.nextWord")}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.sideButton,
            { opacity: pressed ? motion.pressed.opacity : 1 },
          ]}
        >
          <Ionicons name="play-forward" size={24} color={readerColors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIDE_GAP,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
