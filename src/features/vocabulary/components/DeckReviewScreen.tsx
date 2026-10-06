import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { trackError, trackEvent } from "@/lib/analytics";
import { Button, ErrorState, LoadingState, MascotAnim, UiIcon, useToast } from "@/components/ui";
import { useHomePalette } from "@/features/home/useHomePalette";
import { ReviewProgress } from "@/features/srs/components/ReviewProgress";
import { ReviewRatingBar } from "@/features/srs/components/ReviewRatingBar";

import { useDeckDueCardsQuery } from "@/features/vocabulary/api/useDeckCardsQuery";
import { useReviewDeckCardMutation } from "@/features/vocabulary/api/useReviewDeckCardMutation";
import { useDeckReviewSession } from "@/features/vocabulary/hooks/useDeckReviewSession";

import type { SrsRating } from "@/features/srs/scheduler";
import { playSfx } from "@/lib/sfx";

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
  const { show: showToast } = useToast();
  const failedToastShownRef = useRef(false);
  const palette = useHomePalette();
  const insets = useSafeAreaInsets();
  const pageStyle = [styles.fill, { backgroundColor: palette.page, paddingTop: insets.top }];
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
      playSfx(rating === "again" ? "wrong" : "correct");
      void Haptics.selectionAsync().catch((error: unknown) => trackError("srs.rateHaptic", error));
      const shownAt = shownAtRef.current;
      reviewMutation.mutate(
        {
          card,
          rating,
          elapsedMs: shownAt > 0 ? Date.now() - shownAt : 0,
        },
        {
          onError: () => {
            // İlk hatada hemen söyleniyor: çevrimdışı kalan biri 20 kartı
            // puanlayıp ancak bitiş ekranında öğrenmesin.
            if (failedToastShownRef.current === false) {
              failedToastShownRef.current = true;
              showToast(t("srs.saveFailedToast"));
            }
            setFailedCount((current) => current + 1);
          },
        },
      );
      advance();
      shownAtRef.current = Date.now();
    },
    [card, reviewMutation, advance, showToast, t],
  );

  if (isLoading) {
    return (
      <View style={pageStyle}>
        <LoadingState />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={pageStyle}>
        <ErrorState message={t("srs.loadError")} onRetry={() => void refetch()} />
      </View>
    );
  }

  if (finished) {
    return (
      <View style={pageStyle}>
        <View style={styles.centered}>
          <MascotAnim
            name={reviewedCount > 0 ? "party" : "books"}
            width={homeMetrics.startMascot * 2}
          />
          <Text style={[detailType.heroTitle, styles.centeredText, { color: palette.ink }]}>
            {reviewedCount > 0 ? t("srs.doneTitle") : t("srs.emptyTitle")}
          </Text>
          <Text style={[homeType.cardSub, styles.centeredText, { color: palette.muted }]}>
            {reviewedCount > 0
              ? t("srs.doneMessage", { count: reviewedCount })
              : t("vocabulary.decks.review.emptyMessage")}
          </Text>
          {failedCount > 0 ? (
            <Text
              style={[homeType.cardSub, styles.centeredText, { color: detailColors.amberDeep }]}
            >
              {t("srs.saveFailed", { count: failedCount })}
            </Text>
          ) : null}
          <View style={styles.doneButton}>
            <Button label={t("common.back")} onPress={onClose} fullWidth />
          </View>
        </View>
      </View>
    );
  }

  if (!card) return null;

  return (
    <View style={pageStyle}>
      <ReviewProgress current={position} total={total} onClose={onClose} />

      <Pressable
        style={styles.cardArea}
        onLayout={handleCardShown}
        onPress={handleReveal}
        disabled={revealed}
        accessibilityRole="button"
        accessibilityLabel={revealed ? card.surface : t("srs.revealHint")}
      >
        <View style={[styles.card, { backgroundColor: palette.card }]}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            <UiIcon name="cards" size={homeMetrics.statTileIcon} />
            <Text style={[detailType.sheetWord, styles.word, { color: palette.ink }]}>
              {card.surface}
            </Text>

            {revealed ? (
              <View style={styles.answer}>
                <Text
                  style={[detailType.heroTitle, styles.meaning, { color: detailColors.amberDeep }]}
                >
                  {card.meaning}
                </Text>

                {card.exampleSentence ? (
                  <Text style={[homeType.cardSub, styles.context, { color: palette.muted }]}>
                    {card.exampleSentence}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.hint}>
                <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
                  {t("srs.revealHint")}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>

      {revealed ? <ReviewRatingBar onRate={handleRate} /> : <View style={styles.ratingSpacer} />}
    </View>
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
    gap: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
  },
  centeredText: {
    textAlign: "center",
  },
  doneButton: {
    alignSelf: "stretch",
    marginTop: homeSpace.lg,
  },
  cardArea: {
    flex: 1,
    padding: homeMetrics.gutter,
  },
  card: {
    flex: 1,
    borderRadius: homeMetrics.cardRadius,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  cardContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: homeSpace.xl,
    paddingVertical: homeSpace.xl,
    gap: homeSpace.lg,
  },
  word: {
    textAlign: "center",
  },
  hint: {
    paddingHorizontal: homeSpace.lg,
    height: homeMetrics.continueButton,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  answer: {
    alignItems: "center",
    gap: homeSpace.md,
  },
  meaning: {
    textAlign: "center",
  },
  context: {
    textAlign: "center",
  },
  ratingSpacer: {
    height: homeMetrics.continueButton + homeSpace.lg * 2 + homeSpace.xl,
  },
});
