import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackError, trackEvent } from "@/lib/analytics";
import { Button, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { UpperText } from "@/components/ui/UpperText";
import { ReviewProgress } from "@/features/srs/components/ReviewProgress";
import { useActiveLanguagePairQuery, useTargetTtsLocale } from "@/features/languagePair";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";
import { consumeSmartPractice } from "@/features/vocabulary/api/useSmartPractice";
import { recordPracticeResult } from "@/features/vocabulary/api/recordPracticeResult";
import { useVocabularyQuery } from "@/features/vocabulary/api/useVocabularyQuery";
import { PracticeQuestion } from "@/features/vocabulary/components/PracticeQuestion";
import {
  MIN_PRACTICE_WORDS,
  buildPracticeSession,
} from "@/features/vocabulary/practice/buildPracticeSession";

import type { PracticeExercise } from "@/features/vocabulary/practice/buildPracticeSession";

type Phase = "preparing" | "empty" | "running" | "done" | "error";

interface SmartPracticeScreenProps {
  onClose: () => void;
}

/**
 * Akıllı Tekrar (1.0.6, premium). Oturum kelime listesinden kuruluyor ve
 * hak ANCAK kurulabilecek bir oturum varsa tüketiliyor -- 4'ten az kelimesi
 * olan ücretsiz kullanıcının günlük denemesi boşa gitmesin. Hak yoksa
 * kullanıcı paywall'a gidiyor; karar sunucuda (migration 049).
 */
export function SmartPracticeScreen({ onClose }: SmartPracticeScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const vocabulary = useVocabularyQuery();
  const pair = useActiveLanguagePairQuery();
  const language = pair.data?.targetLanguage ?? "en";
  const ttsLocale = useTargetTtsLocale();

  const [phase, setPhase] = useState<Phase>("preparing");
  const [session, setSession] = useState<PracticeExercise[]>([]);
  const [position, setPosition] = useState(0);
  const [missed, setMissed] = useState<PracticeExercise[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const startedRef = useRef(false);

  const start = useCallback(async () => {
    if (!vocabulary.data) return;
    const built = buildPracticeSession(vocabulary.data.words, Date.now());
    if (built.length === 0) {
      setPhase("empty");
      return;
    }
    try {
      const { allowed } = await consumeSmartPractice();
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.smartPracticeQuota() });
      if (!allowed) {
        trackEvent("paywall_opened", { source: "smart_practice" });
        router.replace("/paywall?source=smart_practice");
        return;
      }
      trackEvent("smart_practice_started", { size: built.length });
      setSession(built);
      setPhase("running");
    } catch (error) {
      trackError("smartPractice.consume", error);
      setPhase("error");
    }
  }, [vocabulary.data, queryClient]);

  useEffect(() => {
    if (startedRef.current || !vocabulary.data) return;
    startedRef.current = true;
    void start();
  }, [vocabulary.data, start]);

  const exercise = session[position];

  const handleAnswered = useCallback(
    (correct: boolean) => {
      if (!exercise) return;
      void (
        correct
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      ).catch((error: unknown) => trackError("smartPractice.haptic", error));
      if (correct) setCorrectCount((count) => count + 1);
      else setMissed((list) => [...list, exercise]);
      // Sonuç tekrar planına yazılıyor (bkz. recordPracticeResult). Yazılamazsa
      // oturum durmuyor; kelimenin planı yalnızca bu tur güncellenmemiş olur.
      void recordPracticeResult(exercise.lemma, correct).catch((error: unknown) =>
        trackError("smartPractice.recordResult", error, { lemma: exercise.lemma }),
      );
    },
    [exercise],
  );

  const handleNext = useCallback(() => {
    if (position + 1 >= session.length) {
      trackEvent("smart_practice_finished", { correct: correctCount, total: session.length });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.all });
      setPhase("done");
      return;
    }
    setPosition((value) => value + 1);
  }, [position, session.length, correctCount, queryClient]);

  const background = { backgroundColor: theme.bg.primary };

  if (vocabulary.isError || phase === "error") {
    return (
      <SafeAreaView style={[styles.fill, background]}>
        <ErrorState
          message={t("vocabulary.practice.error")}
          onRetry={() => {
            startedRef.current = false;
            setPhase("preparing");
            void vocabulary.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (phase === "preparing") {
    return (
      <SafeAreaView style={[styles.fill, background]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (phase === "empty") {
    return (
      <SafeAreaView style={[styles.fill, background]}>
        <EmptyState
          title={t("vocabulary.practice.emptyTitle")}
          description={t("vocabulary.practice.emptyBody", { count: MIN_PRACTICE_WORDS })}
        />
        <View style={styles.footer}>
          <Button label={t("common.close")} onPress={onClose} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "done") {
    return (
      <SafeAreaView style={[styles.fill, background]}>
        <ScrollView contentContainerStyle={styles.summary}>
          <Text style={[type.screenTitle, styles.center, { color: theme.text.primary }]}>
            {t("vocabulary.practice.doneTitle")}
          </Text>
          <Text style={[type.bookTitleLg, styles.center, { color: theme.accent }]}>
            {t("vocabulary.practice.score", { correct: correctCount, total: session.length })}
          </Text>
          {missed.length > 0 ? (
            <View style={styles.missed}>
              <UpperText style={[monoType.label, { color: theme.text.secondary }]}>
                {t("vocabulary.practice.missedTitle")}
              </UpperText>
              {missed.map((item) => (
                <Text key={item.wordId} style={[monoType.rowText, { color: theme.text.primary }]}>
                  {t("vocabulary.practice.answerLine", { lemma: item.lemma, gloss: item.gloss })}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[monoType.rowText, styles.center, { color: theme.text.secondary }]}>
              {t("vocabulary.practice.perfect")}
            </Text>
          )}
          <Button label={t("common.close")} onPress={onClose} fullWidth />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, background]}>
      <ReviewProgress current={position + 1} total={session.length} onClose={onClose} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {exercise ? (
            <PracticeQuestion
              key={`${exercise.wordId}-${position}`}
              exercise={exercise}
              language={language}
              ttsLocale={ttsLocale}
              onAnswered={handleAnswered}
              onNext={handleNext}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  body: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
  },
  summary: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    textAlign: "center",
  },
  missed: {
    gap: spacing.xs,
  },
});
