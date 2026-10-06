import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  fontFamily,
  mascotSize,
  onboardingIntroMetrics,
  onboardingSkyColors,
  onboardingSkyType,
  spacing,
} from "@/theme";
import { MascotAnim } from "@/components/ui";

interface OnboardingMeetMascotProps {
  onContinue: () => void;
}

/**
 * "Merhaba, ben Lumi!" -- maskotla tanışma (referans: Funfluent "Hi, I'm
 * Macca", yalnızca düzen). Maskotun adı Lumi: ışık çağrışımı, hikâye
 * dünyamız Port Lumen'le bağ, 10 dilde de kolay söylenir.
 */
export function OnboardingMeetMascot({ onContinue }: OnboardingMeetMascotProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}
    >
      <View style={styles.center}>
        <MascotAnim name="home" width={mascotSize.hero} />
        <Text style={styles.title}>{t("onboarding.mascot.title")}</Text>
        <Text style={styles.body}>{t("onboarding.mascot.body")}</Text>
      </View>
      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <Text style={styles.buttonText}>{t("onboarding.mascot.cta")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: onboardingSkyColors.sky,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.gabaritoBold,
    ...onboardingSkyType.title,
    color: onboardingSkyColors.title,
    textAlign: "center",
  },
  body: {
    fontFamily: fontFamily.gabaritoRegular,
    ...onboardingSkyType.body,
    color: onboardingSkyColors.body,
    textAlign: "center",
  },
  button: {
    height: onboardingIntroMetrics.buttonHeight,
    borderRadius: onboardingIntroMetrics.buttonHeight / 2,
    backgroundColor: onboardingSkyColors.cta,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: fontFamily.gabaritoBold,
    ...onboardingSkyType.button,
    color: onboardingSkyColors.ctaText,
  },
});
