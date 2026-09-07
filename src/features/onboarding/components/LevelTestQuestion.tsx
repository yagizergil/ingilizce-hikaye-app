import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { WordAnswer } from "@/features/onboarding/levelEstimate";

interface LevelTestQuestionProps {
  word: string;
  index: number;
  total: number;
  onAnswer: (answer: WordAnswer) => void;
}

/**
 * Tek bir kelime ve üç cevap düğmesi.
 *
 * Türkçe karşılık BİLEREK gösterilmiyor: bu bir öğretme ekranı değil, bir
 * ölçüm. Karşılığı göstermek cevabı bozar.
 */
export function LevelTestQuestion({ word, index, total, onAnswer }: LevelTestQuestionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const options: { answer: WordAnswer; label: string }[] = [
    { answer: "known", label: t("onboarding.answerKnown") },
    { answer: "unsure", label: t("onboarding.answerUnsure") },
    { answer: "unknown", label: t("onboarding.answerUnknown") },
  ];

  const progress = total > 0 ? index / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.progressBlock}>
        <View style={[styles.track, { backgroundColor: theme.border.hairline }]}>
          <View
            style={[styles.bar, { backgroundColor: theme.accent, width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={[monoType.label, { color: theme.text.secondary }]}>
          {index + 1} / {total}
        </Text>
      </View>

      <View style={styles.wordBlock}>
        <Text style={[type.display, styles.word, { color: theme.text.primary }]}>{word}</Text>
      </View>

      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.answer}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.hairline,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            onPress={() => onAnswer(option.answer)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Text style={[monoType.rowText, { color: theme.text.primary }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  progressBlock: {
    gap: spacing.xs,
    alignItems: "center",
  },
  track: {
    height: 3,
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
  },
  wordBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  word: {
    textAlign: "center",
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
