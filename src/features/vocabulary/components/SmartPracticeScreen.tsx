import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { trackError, trackEvent } from "@/lib/analytics";
import { Button, EmptyState, ErrorState, LoadingState, MascotAnim } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
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
import { playSfx } from "@/lib/sfx";

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
  const palette = useHomePalette();
  const insets = useSafeAreaInsets();
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
      playSfx(correct ? "correct" : "wrong");
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

  const background = { backgroundColor: palette.page, paddingTop: insets.top };

  if (vocabulary.isError || phase === "error") {
    return (
      <View style={[styles.fill, background]}>
        <ErrorState
          message={t("vocabulary.practice.error")}
          onRetry={() => {
            setPhase("preparing");
            // Kelimeler zaten yüklüyse doğrudan yeniden dene: refetch aynı
            // veriyi döndürünce (yapısal paylaşım) efekt tetiklenmiyor ve
            // ekran sonsuza dek "hazırlanıyor"da kalıyordu.
            if (vocabulary.data && !vocabulary.isError) void start();
            else {
              startedRef.current = false;
              void vocabulary.refetch();
            }
          }}
        />
        <CloseButton onPress={onClose} top={insets.top} />
      </View>
    );
  }

  if (phase === "preparing") {
    return (
      <View style={[styles.fill, background]}>
        <LoadingState />
        <CloseButton onPress={onClose} top={insets.top} />
      </View>
    );
  }

  if (phase === "empty") {
    return (
      <View style={[styles.fill, background]}>
        <EmptyState
          title={t("vocabulary.practice.emptyTitle")}
          description={t("vocabulary.practice.emptyBody", { count: MIN_PRACTICE_WORDS })}
        />
        <View style={styles.footer}>
          <Button label={t("common.close")} onPress={onClose} fullWidth />
        </View>
      </View>
    );
  }

  if (phase === "done") {
    return (
      <View style={[styles.fill, background]}>
        <ScrollView contentContainerStyle={styles.summary}>
          <MascotAnim
            name={missed.length === 0 ? "party" : "profile"}
            width={homeMetrics.startMascot * 2}
            style={styles.mascot}
          />
          <Text style={[detailType.heroTitle, styles.center, { color: palette.ink }]}>
            {t("vocabulary.practice.doneTitle")}
          </Text>
          <View style={styles.scoreChip}>
            <Text style={[detailType.sheetTitle, { color: detailColors.amberInk }]}>
              {t("vocabulary.practice.score", { correct: correctCount, total: session.length })}
            </Text>
          </View>
          {missed.length > 0 ? (
            <View style={[styles.missed, { backgroundColor: palette.card }]}>
              <Text style={[homeType.sectionTitle, { color: palette.ink }]}>
                {t("vocabulary.practice.missedTitle")}
              </Text>
              {missed.map((item) => (
                <Text key={item.wordId} style={[homeType.cardSub, { color: palette.muted }]}>
                  {t("vocabulary.practice.answerLine", { lemma: item.lemma, gloss: item.gloss })}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[homeType.cardSub, styles.center, { color: palette.muted }]}>
              {t("vocabulary.practice.perfect")}
            </Text>
          )}
          <Button label={t("common.close")} onPress={onClose} fullWidth />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.fill, background]}>
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
    </View>
  );
}

/** Hazırlık ve hata ekranlarında da çıkış yolu olsun (eskiden yoktu). */
function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      hitSlop={12}
      style={[styles.closeButton, { top: top + homeSpace.sm }]}
    >
      <Ionicons name="close" size={26} color={homeColors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: homeMetrics.gutter,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    flex: 1,
  },
  body: {
    padding: homeMetrics.gutter,
  },
  footer: {
    padding: homeMetrics.gutter,
  },
  summary: {
    padding: homeMetrics.gutter,
    gap: homeSpace.lg,
    alignItems: "stretch",
  },
  mascot: {
    alignSelf: "center",
  },
  scoreChip: {
    alignSelf: "center",
    paddingHorizontal: homeSpace.xl,
    height: homeMetrics.continueButton + homeSpace.md,
    borderRadius: (homeMetrics.continueButton + homeSpace.md) / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    textAlign: "center",
  },
  missed: {
    gap: homeSpace.sm,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
});
