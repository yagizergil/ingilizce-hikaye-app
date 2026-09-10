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
 * VURGU RENGİ: `readerColors.spokenHighlight` — saydam sarı (ürün sahibi
 * kararı, 2026-09-10). Kendi token'ı var; önceden `highlight`
 * (secondaryMuted) kullanılıyordu ama o renk WordSheet'te de kullanılıyor
 * ve birini değiştirmek diğerini sessizce bozardı. Accent kuralı
 * çiğnenmiyor: kural terracotta accent içindir, bu ayrı bir hue ve kalıcı
 * bir işaret değil — sesin nerede olduğunu gösteren geçici bir imleç.
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
