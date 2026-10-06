import { Text } from "react-native";

import { useTtsStore } from "@/features/reader/tts/useTtsStore";
import { useIsWordSaved } from "@/features/reader/hooks/useSavedLemmasStore";
import { useActiveWordStore } from "@/features/reader/hooks/useActiveWordStore";
import { detailColors } from "@/theme";

import type { GestureResponderEvent } from "react-native";

interface ReaderWordProps {
  text: string;
  /** `ttsPlan.wordKey` ile üretilen anahtar; seslendirme bununla eşleşiyor. */
  wordKey: string;
  /** Kaydedilme durumu artık PROP değil -- bkz. `useSavedLemmasStore`'un
   * doc comment'i. Bu kelimenin sözlük kökü, kaydedilmiş mi diye kendi
   * seçicisiyle sormak için. */
  lemma: string;
  savedUnderlineColor: string;
  /** Sesli okuma sırasındaki geçici vurgu rengi. */
  spokenBackground: string;
  /**
   * Olay OLDUĞU GİBİ yukarı veriliyor: çağıran `nativeEvent.pageY`'den
   * sözlük kartının kelimenin altında mı üstünde mi açılacağını hesaplıyor
   * (bkz. `ReaderWordTapPayload.anchorY`).
   */
  onPress: (event: GestureResponderEvent) => void;
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
  lemma,
  savedUnderlineColor,
  spokenBackground,
  onPress,
  onLongPress,
}: ReaderWordProps) {
  const isSpoken = useTtsStore((state) => state.spokenKey === wordKey);
  const isSaved = useIsWordSaved(lemma);
  const isActive = useActiveWordStore((state) => state.key === wordKey);

  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        isSaved
          ? { textDecorationLine: "underline" as const, textDecorationColor: savedUnderlineColor }
          : null,
        isSpoken ? { backgroundColor: spokenBackground } : null,
        isActive
          ? { backgroundColor: detailColors.wordHighlight, color: detailColors.title }
          : null,
      ]}
      suppressHighlighting
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {text}
    </Text>
  );
}
