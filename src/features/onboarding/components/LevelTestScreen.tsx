import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, ErrorState, LoadingState } from "@/components/ui";

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
  /**
   * Test bittiğinde (atlansa da tamamlansa da) çağrılır -- profili KENDİSİ
   * YAZMIYOR, sonucu `OnboardingFlow`'a bırakıyor.
   *
   * DENETİM BULGUSU (2026-09-17): bu ekran daha önce testi bitirir bitirmez
   * `completeOnboarding` mutasyonunu KENDİSİ çağırıp doğrudan akışın
   * DIŞINDAKİ `onDone`'ı tetikliyordu -- yani testi seçen her kullanıcı
   * `taste`/`firstRead`/`quiz`/`celebrate`/`goal`/`path`/`plan`/`paywall`/
   * `success` adımlarının TAMAMINI atlayıp doğrudan uygulamaya düşüyordu.
   * Özellikle onboarding'e özel paywall teklifini (`source="onboarding"`)
   * hiç görmüyorlardı -- ve seviye testini seçen kullanıcılar muhtemelen
   * ortalamadan daha meraklı/ciddi kullanıcılar, yani dönüşümü en yüksek
   * segment tam olarak en yüksek niyetli paywall yerleşiminden atlatılıyordu.
   * Artık bu ekran sadece SONUCU raporluyor, `OnboardingFlow` iki yoldan
   * (hızlı seçim / test) gelen sonucu AYNI kalan adımlara yönlendiriyor.
   */
  onFinish: (
    targetLevel: CefrLevel,
    estimate: { size: number; level: CefrLevel } | null,
    adjusted: boolean,
  ) => void;
}

/**
 * Seviye tespiti akışı: karşılama → 36 kelimelik tanıma testi → sonuç.
 *
 * Tasarım gerekçesi ve yöntem seçimi için bkz.
 * docs/plans/2026-09-07-eksik-katmanlar-design.md.
 */
export function LevelTestScreen({ onFinish }: LevelTestScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: items, isLoading, isError, refetch } = useLevelTestWordsQuery();

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, WordAnswer>>({});
  const [chosenLevel, setChosenLevel] = useState<CefrLevel | null>(null);

  useEffect(() => {
    trackEvent("onboarding_viewed");
  }, []);

  const estimate = useMemo(() => (items ? estimateLevel(items, answers) : null), [items, answers]);

  const handleStart = useCallback(() => {
    trackEvent("onboarding_test_started");
    setPhase("test");
  }, []);

  const finish = useCallback(
    (targetLevel: CefrLevel, adjusted: boolean) => {
      onFinish(
        targetLevel,
        estimate ? { size: estimate.estimatedSize, level: estimate.level } : null,
        adjusted,
      );
    },
    [estimate, onFinish],
  );

  const handleSkip = useCallback(() => {
    trackEvent("onboarding_test_skipped");
    onFinish(DEFAULT_LEVEL, null, false);
  }, [onFinish]);

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
          <Button label={t("onboarding.skip")} onPress={handleSkip} variant="secondary" fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      {phase === "intro" ? (
        <LevelTestIntro onStart={handleStart} onSkip={handleSkip} busy={false} />
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
          busy={false}
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
