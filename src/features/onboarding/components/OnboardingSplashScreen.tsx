import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { UpperText } from "@/components/ui/UpperText";

/**
 * Onboarding'in ilk karesi: marka.
 *
 * NEDEN NATIVE SPLASH'A EK BİR EKRAN VAR: `app.config.ts`'teki native
 * splash yalnızca JS paketi yüklenene kadar duruyor ve hiçbir şey
 * anlatmıyor. Bu ekran onun devamı gibi görünüyor (aynı zemin rengi) ama
 * markayı bir an için sakin bir şekilde gösteriyor ve arka planda oturum
 * / profil çözülürken geçen boşluğu dolduruyor -- yani bir "bekleme"
 * ekranı değil, beklemenin GÖRÜNEN hâli.
 *
 * Süre bilerek kısa (900 ms): marka ekranı bir gecikme gibi hissedilmemeli.
 */
const HOLD_MS = 900;
const FADE_MS = 420;

interface OnboardingSplashScreenProps {
  onDone: () => void;
}

export function OnboardingSplashScreen({ onDone }: OnboardingSplashScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // NEDEN `useState(() => ...)`, `useRef(...).current` DEĞİL: animasyon
  // değeri render sırasında okunuyor (style'a veriliyor) ve yeni
  // react-hooks kuralı ref'in render'da okunmasını hata sayıyor. Lazy
  // initializer ile değer yine yalnızca BİR KEZ üretiliyor.
  const [opacity] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(12));

  useEffect(() => {
    // Marka yukarı doğru çok hafif süzülerek beliriyor -- "açılıyor"
    // hissi, dikkat çeken bir animasyon değil.
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onDone, HOLD_MS + FADE_MS);
    return () => clearTimeout(timer);
  }, [opacity, lift, onDone]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <Animated.View style={[styles.block, { opacity, transform: [{ translateY: lift }] }]}>
        <Text style={[type.wordmark, styles.wordmark, { color: theme.text.primary }]}>
          {t("app.name")}
        </Text>
        <View style={[styles.rule, { backgroundColor: theme.accent }]} />
        <UpperText style={[monoType.label, styles.tagline, { color: theme.text.secondary }]}>
          {t("onboarding.splash.tagline")}
        </UpperText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  block: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  wordmark: {
    textAlign: "center",
  },
  /** Marka ile alt yazı arasında kısa bir vurgu çizgisi -- logo yerine
   * geçen tek grafik öğe. */
  rule: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  tagline: {
    textAlign: "center",
  },
});
