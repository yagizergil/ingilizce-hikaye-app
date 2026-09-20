import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { ReviewProgress } from "@/features/srs/components/ReviewProgress";
import { ReviewRatingBar } from "@/features/srs/components/ReviewRatingBar";

import { useDeckDueCardsQuery } from "@/features/vocabulary/api/useDeckCardsQuery";
import { useReviewDeckCardMutation } from "@/features/vocabulary/api/useReviewDeckCardMutation";
import { useDeckReviewSession } from "@/features/vocabulary/hooks/useDeckReviewSession";

import type { SrsRating } from "@/features/srs/scheduler";

interface DeckReviewScreenProps {
  deckId: string;
  onClose: () => void;
}

/**
 * Bir destenin tekrar oturumu -- `src/features/srs/components/ReviewScreen.tsx`
 * ile AYNI etkileşim mekaniği (göster -> hatırlamayı dene -> dokunup aç ->
 * değerlendir), kasıtlı olarak KENDİ kart kaynağı ve KENDİ oturum hook'unu
 * (`useDeckReviewSession`) kullanan ayrı bir bileşen -- gerekçe o hook'un
 * doc comment'inde: kitap kelimelerinin tekrar akışını (daha önce kritik
 * bir hataya sebep olmuş, şimdi testli) hiç riske atmadan.
 */
export function DeckReviewScreen({ deckId, onClose }: DeckReviewScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useDeckDueCardsQuery(deckId);
  const reviewMutation = useReviewDeckCardMutation();

  const session = useDeckReviewSession(data);
  const { card, position, total, reviewedCount, advance } = session;

  const [revealedPosition, setRevealedPosition] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const shownAtRef = useRef<number>(0);

  const revealed = revealedPosition === position;
  const finished = !isLoading && !isError && session.ready && session.finished;

  useEffect(() => {
    trackEvent("custom_deck_review_started", { deck_id: deckId, due_count: data?.length ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardShown = useCallback(() => {
    shownAtRef.current = Date.now();
  }, []);

  const handleReveal = useCallback(() => {
    setRevealedPosition(position);
  }, [position]);

  const handleRate = useCallback(
    (rating: SrsRating) => {
      if (!card) return;
      const shownAt = shownAtRef.current;
      reviewMutation.mutate(
        {
          card,
          rating,
          elapsedMs: shownAt > 0 ? Date.now() - shownAt : 0,
        },
        { onError: () => setFailedCount((current) => current + 1) },
      );
      advance();
      shownAtRef.current = Date.now();
    },
    [card, reviewMutation, advance],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <ErrorState message={t("srs.loadError")} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <View style={styles.centered}>
          <Text style={[type.sectionHeading, { color: theme.text.primary }]}>
            {reviewedCount > 0 ? t("srs.doneTitle") : t("srs.emptyTitle")}
          </Text>
          <Text style={[monoType.rowText, styles.centeredText, { color: theme.text.secondary }]}>
            {reviewedCount > 0
              ? t("srs.doneMessage", { count: reviewedCount })
              : t("vocabulary.decks.review.emptyMessage")}
          </Text>
          {failedCount > 0 ? (
            <Text style={[monoType.rowText, styles.centeredText, { color: theme.accent }]}>
              {t("srs.saveFailed", { count: failedCount })}
            </Text>
          ) : null}
          <Button label={t("common.back")} onPress={onClose} variant="secondary" size="sm" />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) return null;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <ReviewProgress current={position} total={total} onClose={onClose} />

      <Pressable
        style={styles.cardArea}
        onLayout={handleCardShown}
        onPress={handleReveal}
        disabled={revealed}
        accessibilityRole="button"
        accessibilityLabel={revealed ? card.surface : t("srs.revealHint")}
      >
        <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          <Text style={[type.display, styles.word, { color: theme.text.primary }]}>
            {card.surface}
          </Text>

          {revealed ? (
            <View style={styles.answer}>
              <Text style={[type.sectionHeading, styles.meaning, { color: theme.accent }]}>
                {card.meaning}
              </Text>

              {card.exampleSentence ? (
                <Text style={[monoType.rowText, styles.context, { color: theme.text.secondary }]}>
                  {card.exampleSentence}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[monoType.label, styles.hint, { color: theme.text.secondary }]}>
              {t("srs.revealHint")}
            </Text>
          )}
        </ScrollView>
      </Pressable>

      {revealed ? <ReviewRatingBar onRate={handleRate} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  centeredText: {
    textAlign: "center",
  },
  cardArea: {
    flex: 1,
  },
  cardContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  word: {
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    opacity: 0.7,
  },
  answer: {
    alignItems: "center",
    gap: spacing.md,
  },
  meaning: {
    textAlign: "center",
  },
  context: {
    textAlign: "center",
  },
});
