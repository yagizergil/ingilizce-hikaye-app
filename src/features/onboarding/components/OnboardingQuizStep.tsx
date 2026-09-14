import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LoadingState } from "@/components/ui";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { OnboardingWord } from "@/features/onboarding/components/OnboardingFirstReadStep";

/**
 * Kelime alıştırması (referans: `bookvo-08-kelime-quiz.jpeg`).
 *
 * MEKANİK: az önce seçilen kelimeler tek tek gösteriliyor, kullanıcı doğru
 * karşılığı seçiyor. Üstteki noktalar kaçıncı soruda olduğunu gösteriyor.
 *
 * ŞIKLAR REFERANSTA DÖRT, BİZDE SEÇİLEN KELİME SAYISI KADAR: referans
 * uygulama şıkları kendi sözlüğünden rastgele çekiyor. Bizde doğru olan,
 * kullanıcının AZ ÖNCE seçtiği kelimelerin karşılıklarını şık yapmak --
 * uydurma bir çeldirici üretmek yerine gerçek bir eşleştirme alıştırması
 * çıkıyor ve fazladan sorgu gerekmiyor.
 *
 * YANLIŞ CEVAP CEZALANDIRILMIYOR: doğru şık işaretleniyor ve devam
 * ediliyor. Burası bir ölçüm değil, ilk temas -- onboarding'de kullanıcıyı
 * "başaramadın" hissiyle karşılamak akışın amacına aykırı.
 */
interface OnboardingQuizStepProps {
  progress: number;
  words: OnboardingWord[];
  loading: boolean;
  onContinue: () => void;
}

export function OnboardingQuizStep({
  progress,
  words,
  loading,
  onContinue,
}: OnboardingQuizStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  // Karşılığı olmayan kelime soruya dönüştürülemez; sessizce eleniyor.
  const answerable = useMemo(() => words.filter((word) => word.gloss), [words]);
  const current = answerable[index];

  const options = useMemo(() => {
    if (!current) return [];
    const glosses = answerable.map((word) => word.gloss as string);
    // Sıra sabit: her soruda aynı şıklar, yalnızca doğru cevap değişiyor.
    return glosses;
  }, [answerable, current]);

  const isLast = index >= answerable.length - 1;

  const handleChoose = (gloss: string) => {
    if (chosen) return;
    setChosen(gloss);
  };

  const handleNext = () => {
    if (isLast) {
      onContinue();
      return;
    }
    setIndex((value) => value + 1);
    setChosen(null);
  };

  if (loading) {
    return (
      <OnboardingScaffold progress={progress} title={t("onboarding.quiz.title")}>
        <LoadingState />
      </OnboardingScaffold>
    );
  }

  // Hiçbir kelimenin karşılığı gelmediyse alıştırma anlamsız -- atla.
  if (answerable.length === 0) {
    return (
      <OnboardingScaffold
        progress={progress}
        title={t("onboarding.quiz.title")}
        subtitle={t("onboarding.quiz.unavailable")}
        footer={<OnboardingFooterButton label={t("common.continue")} onPress={onContinue} />}
      />
    );
  }

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.quiz.title")}
      subtitle={t("onboarding.quiz.subtitle")}
      footer={
        <OnboardingFooterButton
          label={isLast ? t("common.continue") : t("onboarding.quiz.next")}
          onPress={handleNext}
          disabled={chosen === null}
        />
      }
    >
      <View style={styles.body}>
        <View style={styles.dots}>
          {answerable.map((word, dotIndex) => (
            <View
              key={word.lemma}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex <= index ? theme.accent : theme.border.hairline,
                },
              ]}
            />
          ))}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
          ]}
        >
          <Text style={[type.display, styles.word, { color: theme.text.primary }]}>
            {current?.surface}
          </Text>

          <View style={styles.options}>
            {options.map((gloss) => {
              const picked = chosen === gloss;
              const correct = gloss === current?.gloss;
              // Renk YALNIZCA cevap verildikten sonra: önce seçenekler
              // eşit görünmeli, yoksa doğru cevap belli olur.
              const borderColor = !chosen
                ? theme.border.hairline
                : correct
                  ? theme.accent
                  : picked
                    ? theme.danger
                    : theme.border.hairline;

              return (
                <Pressable
                  key={gloss}
                  onPress={() => handleChoose(gloss)}
                  disabled={chosen !== null}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: theme.bg.primary,
                      borderColor,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[type.bookTitleMd, styles.optionText, { color: theme.text.primary }]}>
                    {gloss}
                  </Text>
                  {chosen && correct ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.cover,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  word: {
    textAlign: "center",
  },
  options: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
  },
});
