import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
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
  const palette = useHomePalette();
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
      <View style={styles.kindChip}>
        <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
          {t(`vocabulary.practice.kinds.${exercise.kind}`)}
        </Text>
      </View>

      {isListening ? (
        <Pressable
          onPress={speak}
          accessibilityRole="button"
          accessibilityLabel={t("vocabulary.practice.playAgain")}
          style={styles.speaker}
        >
          <Ionicons name="volume-high" size={40} color={detailColors.amberInk} />
        </Pressable>
      ) : (
        <Text
          style={[
            isCloze ? detailType.sheetTitle : detailType.sheetWord,
            styles.prompt,
            { color: palette.ink },
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
            placeholderTextColor={homeColors.muted}
            style={[detailType.statLabel, styles.input, { color: palette.ink }]}
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
              ? palette.card
              : isAnswer
                ? theme.success
                : isPicked
                  ? theme.danger
                  : palette.card;
            const color = answered && (isAnswer || isPicked) ? detailColors.circle : palette.ink;
            return (
              <Pressable
                key={option}
                onPress={() => submit(option)}
                disabled={answered}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked }}
                style={[styles.option, { backgroundColor: background }]}
              >
                <Text style={[detailType.statLabel, { color }]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {answered ? (
        <View style={styles.feedback}>
          <Text style={[detailType.heroTitle, { color: correct ? theme.success : theme.danger }]}>
            {correct ? t("vocabulary.practice.correct") : t("vocabulary.practice.wrong")}
          </Text>
          <Text style={[homeType.cardSub, { color: palette.muted }]}>
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
    gap: homeSpace.lg,
  },
  kindChip: {
    alignSelf: "center",
    paddingHorizontal: homeSpace.lg,
    height: homeMetrics.continueButton,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  prompt: {
    textAlign: "center",
  },
  options: {
    gap: homeSpace.md,
  },
  speaker: {
    alignSelf: "center",
    width: homeMetrics.statTileIcon * 2,
    height: homeMetrics.statTileIcon * 2,
    borderRadius: homeMetrics.statTileIcon,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    minHeight: homeMetrics.continueButton + homeSpace.xl,
    borderRadius: homeMetrics.cardRadius,
    paddingHorizontal: homeSpace.lg,
    justifyContent: "center",
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  typing: {
    gap: homeSpace.md,
  },
  input: {
    minHeight: homeMetrics.continueButton + homeSpace.xl,
    borderRadius: homeMetrics.cardRadius,
    borderWidth: 2,
    borderColor: homeColors.peach,
    paddingHorizontal: homeSpace.lg,
  },
  feedback: {
    gap: homeSpace.md,
    alignItems: "stretch",
  },
});
