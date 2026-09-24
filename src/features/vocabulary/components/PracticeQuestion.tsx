import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";

import { monoType, radius, readingType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";
import { UpperText } from "@/components/ui/UpperText";
import { isTypedAnswerCorrect } from "@/features/vocabulary/practice/buildPracticeSession";

import type { PracticeExercise } from "@/features/vocabulary/practice/buildPracticeSession";

interface PracticeQuestionProps {
  exercise: PracticeExercise;
  /** Dilin büyük/küçük harf kuralları için (Türkçe İ/ı). */
  language: string;
  /** Dinleme sorusunda kelimenin okunacağı locale (öğrenilen dil). */
  ttsLocale: string;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}

/** Bir alıştırma sorusu: çoktan seçmeli ya da yazarak; cevaptan sonra geri bildirim. */
export function PracticeQuestion({
  exercise,
  language,
  ttsLocale,
  onAnswered,
  onNext,
}: PracticeQuestionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const answered = picked !== null;
  const correct =
    exercise.kind === "typing"
      ? answered && isTypedAnswerCorrect(picked, exercise.answer, language)
      : picked === exercise.answer;

  const submit = (value: string) => {
    if (answered) return;
    setPicked(value);
    onAnswered(
      exercise.kind === "typing"
        ? isTypedAnswerCorrect(value, exercise.answer, language)
        : value === exercise.answer,
    );
  };

  const isCloze = exercise.kind === "cloze";
  const isListening = exercise.kind === "listening";

  const speak = useCallback(() => {
    Speech.stop();
    Speech.speak(exercise.prompt, { language: ttsLocale });
  }, [exercise.prompt, ttsLocale]);

  // Dinleme sorusu açılır açılmaz bir kez okunuyor; soru değişince susuyor.
  useEffect(() => {
    if (!isListening) return;
    speak();
    return () => {
      Speech.stop();
    };
  }, [isListening, speak]);

  return (
    <View style={styles.container}>
      <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
        {t(`vocabulary.practice.kinds.${exercise.kind}`)}
      </UpperText>

      {isListening ? (
        <Pressable
          onPress={speak}
          accessibilityRole="button"
          accessibilityLabel={t("vocabulary.practice.playAgain")}
          style={[styles.speaker, { backgroundColor: theme.accentMuted }]}
        >
          <Ionicons name="volume-high" size={40} color={theme.accent} />
        </Pressable>
      ) : (
        <Text
          style={[
            isCloze ? readingType.gloss : type.screenTitle,
            styles.prompt,
            { color: theme.text.primary },
          ]}
          adjustsFontSizeToFit={!isCloze}
          numberOfLines={isCloze ? undefined : 2}
        >
          {exercise.prompt}
        </Text>
      )}

      {exercise.kind === "typing" ? (
        <View style={styles.typing}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={!answered}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => typed.trim() && submit(typed)}
            placeholder={t("vocabulary.practice.typingPlaceholder", { hint: exercise.hint })}
            placeholderTextColor={theme.text.secondary}
            style={[
              type.chapterRowTitle,
              styles.input,
              { color: theme.text.primary, borderColor: theme.border.strong },
            ]}
          />
          {!answered ? (
            <Button
              label={t("vocabulary.practice.check")}
              onPress={() => submit(typed)}
              disabled={!typed.trim()}
              fullWidth
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.options}>
          {exercise.options.map((option) => {
            const isAnswer = option === exercise.answer;
            const isPicked = option === picked;
            const background = !answered
              ? theme.bg.surface
              : isAnswer
                ? theme.success
                : isPicked
                  ? theme.danger
                  : theme.bg.surface;
            const color =
              answered && (isAnswer || isPicked) ? theme.text.onAccent : theme.text.primary;
            return (
              <Pressable
                key={option}
                onPress={() => submit(option)}
                disabled={answered}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked }}
                style={[
                  styles.option,
                  { backgroundColor: background, borderColor: theme.border.hairline },
                ]}
              >
                <Text style={[type.chapterRowTitle, { color }]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {answered ? (
        <View style={styles.feedback}>
          <Text style={[type.bookTitleLg, { color: correct ? theme.success : theme.danger }]}>
            {correct ? t("vocabulary.practice.correct") : t("vocabulary.practice.wrong")}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
            {t("vocabulary.practice.answerLine", { lemma: exercise.lemma, gloss: exercise.gloss })}
          </Text>
          <Button label={t("vocabulary.practice.next")} onPress={onNext} fullWidth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  prompt: {
    textAlign: "center",
  },
  options: {
    gap: spacing.sm,
  },
  speaker: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  typing: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  feedback: {
    gap: spacing.sm,
    alignItems: "stretch",
  },
});
