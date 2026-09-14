import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { radius } from "@/theme";
import { getLanguage } from "@/lib/languages";
import { useTheme } from "@/theme/useTheme";

interface LanguageFlagProps {
  /** Dil kodu (`LANGUAGES` içindeki `code`). */
  code: string;
  size?: number;
}

/**
 * Dil seçici satırlarındaki yuvarlak bayrak.
 *
 * NEDEN EMOJİ DEĞİL: emoji bayraklar her platformda başka bir elin
 * çizimi -- iOS'ta dikdörtgen, gölgeli, arayüzün geri kalanıyla aynı
 * görsel dile ait değiller. Yuvarlak bayraklar satırdaki diğer yuvarlak
 * öğelerle (radyo düğmesi) aynı geometriyi paylaşıyor.
 *
 * Kaynak: `circle-flags` (hatscripts.github.io/circle-flags) -- MIT.
 * `expo-image` SVG'yi çizebiliyor ve indirdiğini diske önbellekliyor, yani
 * bayrak ilk açılıştan sonra ağ beklemiyor.
 *
 * YÜKLENEMEZSE: emoji bayrağa düşüyor. Ağ yokken ilk açılışta satır boş
 * bir daireyle kalmasın diye -- emoji hiçbir zaman yüklenmesi gereken bir
 * şey değil.
 */
export function LanguageFlag({ code, size = 32 }: LanguageFlagProps) {
  const { theme } = useTheme();
  const language = getLanguage(code);

  if (!language) return null;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, backgroundColor: theme.bg.primary },
      ]}
      accessibilityLabel={language.nameEn}
    >
      <Text style={[styles.fallback, { fontSize: size * 0.78, lineHeight: size }]}>
        {language.flag}
      </Text>
      <Image
        source={`https://hatscripts.github.io/circle-flags/flags/${language.flagCode}.svg`}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="disk"
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    textAlign: "center",
  },
});
