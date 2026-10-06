import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  quizColors,
  quizMetrics,
  quizType,
} from "@/theme";
import { EmptyState, ErrorState, LoadingState, useToast } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";
import { useQuizQuestionsQuery, useSubmitQuizMutation } from "@/features/quiz/api/quizApi";
import { QuizOption } from "@/features/quiz/components/QuizOption";
import { QuizResult } from "@/features/quiz/components/QuizResult";
import { PASS_RATIO } from "@/features/quiz/levelState";

import type { QuizOptionState } from "@/features/quiz/components/QuizOption";
import { playSfx } from "@/lib/sfx";

const SCENE = require("../../../../assets/home/quiz-header.webp") as number;

/**
 * Kitap quizi soru ekranı (migration 052). Akış: seçenek seç -> "Kontrol
 * et" -> doğru/yanlış rengi + kısa açıklama -> "Sonraki". Anında geri
 * bildirim ve açıklama, yalnızca puan göstermekten daha çok öğretiyor
 * (testing effect + feedback). Bitişte sonuç sunucuya yazılır.
 *
 * Premium basamakta ücretsiz kullanıcıya RLS boş liste döndürür; bu ekrana
 * normalde gelinmez (kart paywall'a gider), gelinirse paywall'a yönlenir.
 */
export function QuizQuestionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { quizId, level } = useLocalSearchParams<{ quizId: string; level?: string }>();
  const questionsQuery = useQuizQuestionsQuery(quizId);
  const submit = useSubmitQuizMutation();
  const { show: showToast } = useToast();
  const subscription = useSubscriptionQuery();
  const isPremium = subscription.data?.isPremium === true;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questionsQuery.isLoading) return <LoadingState />;
  if (questionsQuery.isError) {
    return <ErrorState message={t("quiz.error")} onRetry={() => void questionsQuery.refetch()} />;
  }
  const questions = questionsQuery.data ?? [];
  if (questions.length === 0) {
    // Sorular RLS ile boş döndüyse sebep premium'dur; premium kullanıcıda
    // boş liste bir içerik eksiği, onu paywall'a göndermek yanlış olurdu.
    if (!isPremium && !subscription.isLoading) return <Redirect href="/paywall?source=book_quiz" />;
    if (subscription.isLoading) return <LoadingState />;
    return <EmptyState title={t("quiz.emptyTitle")} />;
  }

  const total = questions.length;
  const restart = () => {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setCorrect(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <QuizResult
        correct={correct}
        total={total}
        onRetry={restart}
        onClose={() => router.back()}
        // 1. basamağı geçen ücretsiz kullanıcı: bir sonraki basamak premium.
        // Kullanıcının en memnun olduğu an; kendisi seçerse paywall'a gider.
        nextLevelUpsell={
          level === "1" && !isPremium && correct / total >= PASS_RATIO
            ? () => router.replace("/paywall?source=quiz_level_passed")
            : undefined
        }
      />
    );
  }

  const question = questions[index];
  if (!question) return null;
  const isLast = index === total - 1;
  const isRight = selected === question.correctIndex;

  const handlePrimary = () => {
    if (selected === null) return;
    if (!checked) {
      setChecked(true);
      playSfx(isRight ? "correct" : "wrong");
      if (isRight) setCorrect(correct + 1);
      return;
    }
    if (isLast) {
      if (quizId && !submit.isPending) {
        submit.mutate({ quizId, correct }, { onError: () => showToast(t("quiz.saveError")) });
      }
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  };

  const optionState = (optionIndex: number): QuizOptionState => {
    if (!checked) return selected === optionIndex ? "selected" : "idle";
    if (optionIndex === question.correctIndex) return "correct";
    if (optionIndex === selected) return "wrong";
    return "dimmed";
  };

  return (
    <View style={styles.container}>
      <Image
        source={SCENE}
        style={[
          styles.scene,
          // Görsel güvenli alanın ALTINDAN başlar: y=0'dan başladığında
          // iPhone 15 Pro'da Dynamic Island papağanın balonunu kesiyordu.
          // Üstteki şerit görselin gökyüzü rengiyle (container) dolu.
          { top: insets.top, height: quizMetrics.sceneHeight + quizMetrics.sheetRadius },
        ]}
        contentFit="cover"
        contentPosition="center"
      />

      <View style={[styles.top, { top: insets.top + homeMetrics.pillTop }]}>
        <Pressable
          onPress={() => {
            if (index === 0 && !checked) return router.back();
            Alert.alert(t("quiz.leaveTitle"), t("quiz.leaveBody"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("quiz.leaveConfirm"), style: "destructive", onPress: () => router.back() },
            ]);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={styles.close}
        >
          <Ionicons name="close" size={22} color={detailColors.muted} />
        </Pressable>
        <View
          style={styles.pill}
          accessibilityLabel={t("quiz.progressAccessibility", { current: index + 1, total })}
        >
          <Text style={[quizType.pill, { color: detailColors.title }]}>
            {t("quiz.progress", { current: index + 1, total })}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${((index + 1) / total) * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={[styles.sheet, { top: insets.top + quizMetrics.sceneHeight }]}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[homeType.cardSub, styles.kind]}>{t(`quiz.kind.${question.kind}`)}</Text>
          <Text style={[quizType.question, styles.question]} accessibilityRole="header">
            {question.prompt}
          </Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {question.options.map((option, optionIndex) => (
              <QuizOption
                key={`${question.id}-${optionIndex}`}
                label={option}
                state={optionState(optionIndex)}
                disabled={checked}
                onPress={() => setSelected(optionIndex)}
              />
            ))}
          </View>
        </ScrollView>
        {/* Geri bildirim kaydırılan alanın DIŞINDA, düğmenin üstünde sabit:
            eskiden açıklama listenin sonuna ekleniyor, soru yukarı kayıyor ve
            kullanıcı elle geri çekmek zorunda kalıyordu. */}
        <View
          style={[
            styles.footer,
            checked ? (isRight ? styles.feedbackRight : styles.feedbackWrong) : null,
            { paddingBottom: quizMetrics.buttonBottom + insets.bottom },
          ]}
        >
          {checked ? (
            <View style={styles.feedback}>
              <Text
                style={[
                  detailType.sectionTitle,
                  { color: isRight ? quizColors.correctInk : quizColors.wrong },
                ]}
              >
                {t(isRight ? "quiz.feedback.right" : "quiz.feedback.wrong")}
              </Text>
              {question.explanation ? (
                <Text style={[homeType.cardSub, styles.explanation]} numberOfLines={4}>
                  {question.explanation}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Pressable
            onPress={handlePrimary}
            disabled={selected === null}
            accessibilityRole="button"
            accessibilityState={{ disabled: selected === null }}
            style={({ pressed }) => [
              styles.next,
              selected === null ? styles.nextDisabled : null,
              pressed ? styles.nextPressed : null,
            ]}
          >
            <Text style={[detailType.cta, { color: detailColors.amberInk }]}>
              {t(!checked ? "quiz.check" : isLast ? "quiz.finish" : "quiz.next")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: quizColors.headerSky,
  },
  scene: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  top: {
    position: "absolute",
    left: homeMetrics.gutter,
    right: homeMetrics.gutter,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  close: {
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    backgroundColor: detailColors.circle,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: quizMetrics.pillWidth,
    height: quizMetrics.pillHeight,
    borderRadius: quizMetrics.pillHeight / 2,
    backgroundColor: detailColors.circle,
    paddingHorizontal: homeSpace.md,
    justifyContent: "center",
    gap: homeSpace.xxs,
  },
  bar: {
    height: quizMetrics.pillBar,
    borderRadius: quizMetrics.pillBar / 2,
    backgroundColor: quizColors.progressTrack,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: homeColors.orange,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: quizMetrics.sheetRadius,
    borderTopRightRadius: quizMetrics.sheetRadius,
    backgroundColor: detailColors.circle,
    paddingHorizontal: detailMetrics.gutter,
  },
  sheetContent: {
    paddingTop: quizMetrics.questionTop,
    paddingBottom: homeSpace.lg,
  },
  kind: {
    color: homeColors.muted,
    marginBottom: homeSpace.xs,
  },
  question: {
    color: detailColors.title,
  },
  options: {
    marginTop: quizMetrics.optionsTop,
    gap: homeSpace.sm,
  },
  footer: {
    marginHorizontal: -detailMetrics.gutter,
    paddingHorizontal: detailMetrics.gutter,
    paddingTop: homeSpace.md,
    borderTopLeftRadius: quizMetrics.optionCardRadius,
    borderTopRightRadius: quizMetrics.optionCardRadius,
  },
  feedback: {
    gap: homeSpace.xxs,
    marginBottom: homeSpace.md,
  },
  feedbackRight: {
    backgroundColor: quizColors.correctBg,
  },
  feedbackWrong: {
    backgroundColor: quizColors.wrongBg,
  },
  explanation: {
    color: detailColors.title,
  },
  next: {
    height: quizMetrics.buttonHeight,
    borderRadius: quizMetrics.buttonHeight / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  nextDisabled: {
    opacity: 0.45,
  },
  nextPressed: {
    opacity: 0.85,
  },
});
