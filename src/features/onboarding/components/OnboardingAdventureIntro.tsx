import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  fontFamily,
  onboardingIntroColors,
  onboardingIntroMetrics,
  onboardingIntroType,
  spacing,
} from "@/theme";
import { UpperText } from "@/components/ui/UpperText";
import { useReduceMotion } from "@/hooks/useReduceMotion";

import { AdventureWords } from "@/features/onboarding/components/AdventureWords";
import { ADVENTURE_ASPECT, ADVENTURE_STILL } from "@/features/onboarding/adventureAssets";
import { AdventureScene } from "@/features/onboarding/components/AdventureScene";
import { TypewriterText } from "@/features/onboarding/components/TypewriterText";

interface OnboardingAdventureIntroProps {
  onStart: () => void;
  /** Verilirse sol üstte kapat düğmesi çıkar (geliştirici önizlemesi). */
  onClose?: () => void;
}

const DOTS = [0, 1, 2] as const;

/**
 * Onboarding 1. sayfa: "Eğlenceli macera ile dil öğren".
 *
 * Üstte animasyonlu orman sahnesi (genç kadın karakter + omzunda göz kırpan
 * papağan), altta koyu yeşil zeminde başlık, alt başlık, sayfa noktaları ve
 * "Başla". Referans: Funfluent onboarding (yalnızca düzen; karakter ve
 * illüstrasyon bize özgü). Sahne, kısa ekranda üstten kırpılır: altındaki
 * dalgalı kenar ve düz yeşile geçiş HER ZAMAN görünür kalır.
 *
 * Şimdilik yalnızca Profil > geliştirici satırından açılan bir önizleme;
 * gerçek akışa bağlanması ayrı karar. Diğer iki sayfa henüz yok, noktalar
 * sabit (ilki aktif).
 */
export function OnboardingAdventureIntro({ onStart, onClose }: OnboardingAdventureIntroProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const sceneHeight = Math.min(
    width * ADVENTURE_ASPECT,
    height * onboardingIntroMetrics.sceneRatio,
  );
  const enter = (delay: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(500);

  return (
    <View style={styles.root}>
      <View style={{ width, height: sceneHeight, overflow: "hidden" }}>
        {reduceMotion ? (
          <Image
            source={ADVENTURE_STILL}
            contentFit="cover"
            contentPosition="bottom"
            style={styles.scene}
          />
        ) : (
          <AdventureScene width={width} />
        )}
        {reduceMotion ? null : <AdventureWords boxWidth={width} boxHeight={sceneHeight} />}
      </View>

      <View style={[styles.copy, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.texts}>
          <TypewriterText
            key={t("onboarding.adventure.title")}
            text={t("onboarding.adventure.title")}
            style={styles.title}
            instant={reduceMotion}
            startDelay={600}
          />
          <Animated.Text entering={enter(1500)} style={styles.subtitle}>
            {t("onboarding.adventure.subtitle")}
          </Animated.Text>
          <Animated.View entering={enter(1700)} style={styles.dots}>
            {DOTS.map((dot) => (
              <View key={dot} style={[styles.dot, dot === 0 ? styles.dotActive : null]} />
            ))}
          </Animated.View>
        </View>

        <Animated.View entering={enter(1900)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.welcome.cta")}
            onPress={onStart}
            style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          >
            <UpperText style={styles.buttonText}>{t("onboarding.welcome.cta")}</UpperText>
          </Pressable>
        </Animated.View>
      </View>

      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          hitSlop={8}
          style={[styles.close, { top: insets.top + spacing.sm, left: spacing.lg }]}
        >
          <Ionicons name="close" size={22} color={onboardingIntroColors.controlIcon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    height: "100%",
  },
  root: {
    flex: 1,
    backgroundColor: onboardingIntroColors.bg,
  },
  copy: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  texts: {
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.nunitoExtraBold,
    ...onboardingIntroType.title,
    color: onboardingIntroColors.title,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamily.nunitoSemiBold,
    ...onboardingIntroType.subtitle,
    color: onboardingIntroColors.subtitle,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    gap: onboardingIntroMetrics.dotGap,
    marginTop: spacing.sm,
  },
  dot: {
    width: onboardingIntroMetrics.dot,
    height: onboardingIntroMetrics.dot,
    borderRadius: onboardingIntroMetrics.dot / 2,
    backgroundColor: onboardingIntroColors.dotIdle,
  },
  dotActive: {
    backgroundColor: onboardingIntroColors.dotActive,
  },
  button: {
    height: onboardingIntroMetrics.buttonHeight,
    borderRadius: onboardingIntroMetrics.buttonHeight / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: onboardingIntroColors.buttonFill,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: fontFamily.nunitoExtraBold,
    ...onboardingIntroType.button,
    textTransform: "uppercase",
    color: onboardingIntroColors.buttonText,
  },
  close: {
    position: "absolute",
    width: onboardingIntroMetrics.controlSize,
    height: onboardingIntroMetrics.controlSize,
    borderRadius: onboardingIntroMetrics.controlSize / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: onboardingIntroColors.controlFill,
  },
});
