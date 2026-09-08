import { Text } from "react-native";

import { useTtsStore } from "@/features/reader/tts/useTtsStore";

interface ReaderWordProps {
  text: string;
  /** `ttsPlan.wordKey` ile üretilen anahtar; seslendirme bununla eşleşiyor. */
  wordKey: string;
  isSaved: boolean;
  savedUnderlineColor: string;
  /** Sesli okuma sırasındaki geçici vurgu rengi. */
  spokenBackground: string;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * Okuma yüzeyindeki tek bir kelime.
 *
 * NEDEN AYRI BİR BİLEŞEN: sesli okumada vurgu saniyede 2-4 kez değişiyor.
 * Vurgulu kelime `ReaderPage`'in kendi state'inde tutulsaydı her kelimede
 * sayfadaki ~300 `<Text>` düğümünün tamamı yeniden render edilirdi. Burada
 * her kelime kendi adına Zustand seçicisine abone oluyor
 * (`spokenKey === wordKey`), yani kelime başına yalnızca İKİ bileşen render
 * ediliyor: vurgusu kalkan ve vurgusu gelen.
 *
 * NEDEN ACCENT DEĞİL: `useReaderThemeColors` içindeki kural açık — okuma
 * YÜZEYİNDE accent kullanılmaz, kelime vurguları dâhil. Vurgu bu yüzden
 * `readerColors.highlight` (secondaryMuted) ile yapılıyor; bu, WordSheet'in
 * cümle içinde kelimeyi öne çıkarmak için kullandığı rengin aynısı — aynı
 * anlam, aynı görsel dil.
 *
 * KAYDEDİLMİŞ KELİME ALTI ÇİZİLİ KALIYOR: ürün sahibinin "highlight
 * olmayacak sadece altı çizili" kararı KAYDEDİLMİŞ kelimeler için verildi
 * ve değişmedi. Buradaki vurgu farklı bir şey: kalıcı bir işaret değil,
 * sesin o an nerede olduğunu gösteren geçici bir imleç. İkisi aynı anda
 * görünebilir ve çakışmaz.
 */
export function ReaderWord({
  text,
  wordKey,
  isSaved,
  savedUnderlineColor,
  spokenBackground,
  onPress,
  onLongPress,
}: ReaderWordProps) {
  const isSpoken = useTtsStore((state) => state.spokenKey === wordKey);

  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        isSaved
          ? { textDecorationLine: "underline" as const, textDecorationColor: savedUnderlineColor }
          : null,
        isSpoken ? { backgroundColor: spokenBackground } : null,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {text}
    </Text>
  );
}
