import { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { fontFamily, onboardingSkyColors, onboardingSkyType, radius, spacing } from "@/theme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { LogoAnim } from "@/components/ui";

/**
 * Onboarding'in ilk karesi: Lingo logosu ve onlarca dilde "merhaba"
 * balonları (referans: Funfluent açılışı, yalnızca düzen).
 *
 * Kısa (2,6 sn; logo animasyonu ~1,5 sn) ve sakin: balonlar sırayla yumuşakça belirir, sonra akış
 * tanıtım sayfalarına geçer. "Hareketi azalt" açıksa hepsi doğrudan görünür.
 */
const HOLD_MS = 2600;

const SKY = require("../../../../assets/splash/lingo-bg.jpg") as number;

/** Selamlar marka öğesi, çeviri DEĞİL: her biri kendi dilinde yazılır. */
const GREETINGS = [
  { text: "Hello", x: 0.08, y: 0 },
  { text: "Bonjour", x: 0.58, y: 0.02 },
  { text: "Hola", x: 0.32, y: 0.22 },
  { text: "こんにちは", x: 0.02, y: 0.44 },
  { text: "Merhaba", x: 0.6, y: 0.4 },
  { text: "Ciao", x: 0.36, y: 0.66 },
  { text: "Hallo", x: 0.66, y: 0.78 },
  { text: "你好", x: 0.12, y: 0.82 },
] as const;

interface OnboardingSplashScreenProps {
  onDone: () => void;
}

export function OnboardingSplashScreen({ onDone }: OnboardingSplashScreenProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const logoWidth = Math.min(width * 0.72, 320);
  const cloudWidth = Math.min(width - spacing.xl * 2, 340);

  useEffect(() => {
    const timer = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const enter = (delay: number) => (reduceMotion ? undefined : FadeIn.delay(delay).duration(380));

  return (
    <View
      style={[styles.container, { paddingTop: height * 0.24 }]}
      accessibilityLabel={t("app.name")}
    >
      <Image
        source={SKY}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        accessible={false}
      />
      <View style={[styles.cloud, { width: cloudWidth, height: cloudWidth * 0.5 }]}>
        {GREETINGS.map((greeting, i) => (
          <Animated.View
            key={greeting.text}
            entering={enter(120 + i * 70)}
            style={[
              styles.bubble,
              { left: greeting.x * cloudWidth, top: greeting.y * cloudWidth * 0.5 },
            ]}
          >
            <Text style={styles.bubbleText}>{greeting.text}</Text>
          </Animated.View>
        ))}
      </View>
      {/* Harfler sırayla düşer, papağan "o" en son gelip kafasını sallar. */}
      <LogoAnim width={logoWidth} delay={150} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.lg,
    backgroundColor: onboardingSkyColors.sky,
  },
  cloud: {
    position: "relative",
  },
  bubble: {
    position: "absolute",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: onboardingSkyColors.bubble,
  },
  bubbleText: {
    fontFamily: fontFamily.gabaritoBold,
    ...onboardingSkyType.bubble,
    color: onboardingSkyColors.bubbleText,
  },
});
