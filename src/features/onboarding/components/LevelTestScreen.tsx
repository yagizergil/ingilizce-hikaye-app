import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, ErrorState, LoadingState } from "@/components/ui";

import { useCompleteOnboardingMutation } from "@/features/onboarding/api/useCompleteOnboardingMutation";
import { useLevelTestWordsQuery } from "@/features/onboarding/api/useLevelTestWordsQuery";
import { LevelTestIntro } from "@/features/onboarding/components/LevelTestIntro";
import { LevelTestQuestion } from "@/features/onboarding/components/LevelTestQuestion";
import { LevelTestResult } from "@/features/onboarding/components/LevelTestResult";
import { estimateLevel, readingLevelFor } from "@/features/onboarding/levelEstimate";

import type { CefrLevel, WordAnswer } from "@/features/onboarding/levelEstimate";

type Phase = "intro" | "test" | "result";

/** Testi atlayan kullanıcı için varsayılan. Katalogda en çok içerik burada. */
const DEFAULT_LEVEL: CefrLevel = "A2";

interface LevelTestScreenProps {
  /** Onboarding bittiğinde çağrılır (atlansa da tamamlansa da). */
  onDone: () => void;
}

/**
 * Seviye tespiti akışı: karşılama → 36 kelimelik tanıma testi → sonuç.
 *
 * Tasarım gerekçesi ve yöntem seçimi için bkz.
 * docs/plans/2026-09-07-eksik-katmanlar-design.md.
 */
export function LevelTestScreen({ onDone }: LevelTestScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: items, isLoading, isError, refetch } = useLevelTestWordsQuery();
  const completeMutation = useCompleteOnboardingMutation();

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, WordAnswer>>({});
  const [chosenLevel, setChosenLevel] = useState<CefrLevel | null>(null);

  useEffect(() => {
    trackEvent("onboarding_viewed");
  }, []);

  const estimate = useMemo(
    () => (items ? estimateLevel(items, answers) : null),
    [items, answers],
  );

  const handleStart = useCallback(() => {
    trackEvent("onboarding_test_started");
    setPhase("test");
  }, []);

  const finish = useCallback(
    (targetLevel: CefrLevel, adjusted: boolean) => {
      completeMutation.mutate(
        {
          targetLevel,
          estimate: estimate ? { size: estimate.estimatedSize, level: estimate.level } : null,
          adjusted,
        },
        { onSuccess: onDone },
      );
    },
    [completeMutation, estimate, onDone],
  );

  const handleSkip = useCallback(() => {
    trackEvent("onboarding_test_skipped");
    completeMutation.mutate(
      { targetLevel: DEFAULT_LEVEL, estimate: null, adjusted: false },
      { onSuccess: onDone },
    );
  }, [completeMutation, onDone]);

  const handleAnswer = useCallback(
    (answer: WordAnswer) => {
      const current = items?.[index];
      if (!current) return;

      setAnswers((previous) => ({ ...previous, [current.lemma]: answer }));

      if (index + 1 >= (items?.length ?? 0)) {
        setPhase("result");
      } else {
        setIndex(index + 1);
      }
    },
    [items, index],
  );

  const handleConfirm = useCallback(() => {
    if (!estimate) return;
    const suggested = readingLevelFor(estimate.level);
    const selected = chosenLevel ?? suggested;
    finish(selected, selected !== suggested);
  }, [estimate, chosenLevel, finish]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Kelime listesi gelmezse kullanıcıyı burada kilitlemiyoruz: yeniden
  // deneme VE testi atlayıp uygulamaya geçme seçeneği birlikte sunuluyor.
  if (isError || !items || items.length === 0) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <View style={styles.errorBlock}>
          <ErrorState message={t("onboarding.loadError")} onRetry={() => void refetch()} />
          <Button
            label={t("onboarding.skip")}
            onPress={handleSkip}
            variant="secondary"
            fullWidth
            disabled={completeMutation.isPending}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      {phase === "intro" ? (
        <LevelTestIntro
          onStart={handleStart}
          onSkip={handleSkip}
          busy={completeMutation.isPending}
        />
      ) : phase === "test" ? (
        <LevelTestQuestion
          word={items[index]?.lemma ?? ""}
          index={index}
          total={items.length}
          onAnswer={handleAnswer}
        />
      ) : (
        <LevelTestResult
          estimatedSize={estimate?.estimatedSize ?? 0}
          selectedLevel={chosenLevel ?? readingLevelFor(estimate?.level ?? DEFAULT_LEVEL)}
          onSelectLevel={setChosenLevel}
          onConfirm={handleConfirm}
          busy={completeMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  errorBlock: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
