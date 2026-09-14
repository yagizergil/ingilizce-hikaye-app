import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { OnboardingWord } from "@/features/onboarding/components/OnboardingFirstReadStep";

/**
 * İlk kelimeler kutlaması (referans: `bookvo-09-ilk-3-kelime.jpeg`).
 *
 * Referansta ortada sayıyı taşıyan bir halka, altında kelime çipleri ve
 * konfeti var. Konfeti yerine halkanın kendisi ölçekleniyor: yeni bir
 * animasyon kütüphanesi eklemeden ("basitlik önce gelir") aynı "başardın"
 * anını veriyor.
 *
 * SAYI GERÇEK: kullanıcının az önce seçtiği kelime sayısı. Referans "3"
 * diyor çünkü orada da üç kelime seçtiriliyor; bizde kullanıcı daha
 * fazlasını seçtiyse gerçek sayı yazıyor.
 */
interface OnboardingWordsCelebrationStepProps {
  progress: number;
  words: OnboardingWord[];
  onContinue: () => void;
}

export function OnboardingWordsCelebrationStep({
  progress,
  words,
  onContinue,
}: OnboardingWordsCelebrationStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // `useRef(...).current` render sırasında okunamıyor (react-hooks/refs);
  // lazy initializer aynı "bir kez üret" davranışını veriyor.
  const [scale] = useState(() => new Animated.Value(0.7));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.celebrate.title", { count: words.length })}
      subtitle={t("onboarding.celebrate.subtitle")}
      footer={<OnboardingFooterButton label={t("common.continue")} onPress={onContinue} />}
    >
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: theme.accent, opacity: fade, transform: [{ scale }] },
          ]}
        >
          <Text style={[type.screenTitle, { color: theme.accent }]}>{words.length}</Text>
        </Animated.View>

        <Animated.View style={[styles.chips, { opacity: fade }]}>
          {words.map((word) => (
            <View
              key={word.lemma}
              style={[
                styles.chip,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
              ]}
            >
              <Text style={[monoType.rowText, { color: theme.text.primary }]}>{word.surface}</Text>
              {word.gloss ? (
                <Text style={[monoType.meta, { color: theme.text.secondary }]}>
                  {`— ${word.gloss}`}
                </Text>
              ) : null}
            </View>
          ))}
        </Animated.View>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.section,
  },
  ring: {
    width: 140,
    height: 140,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    gap: spacing.xs,
    alignSelf: "stretch",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
