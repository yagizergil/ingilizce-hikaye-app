import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, ErrorState, LoadingState } from "@/components/ui";

import { useDueCardsQuery } from "@/features/srs/api/useDueCardsQuery";
import { useReviewCardMutation } from "@/features/srs/api/useReviewCardMutation";
import { ReviewProgress } from "@/features/srs/components/ReviewProgress";
import { ReviewRatingBar } from "@/features/srs/components/ReviewRatingBar";

import type { SrsRating } from "@/features/srs/scheduler";

interface ReviewScreenProps {
  onClose: () => void;
}

/**
 * Aralıklı tekrar oturumu.
 *
 * Akış: kelime göster → kullanıcı hatırlamaya çalışır → dokunup cevabı
 * açar → üç düğmeden biriyle değerlendirir → sonraki kart.
 *
 * Cevap kendiliğinden açılmıyor; kullanıcının önce hatırlamayı denemesi
 * gerekiyor. Bu "retrieval practice" ilkesi aralıklı tekrarın işe yaramasının
 * asıl sebebi — cevabı hemen göstermek onu pasif okumaya çevirir.
 */
export function ReviewScreen({ onClose }: ReviewScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useDueCardsQuery();
  const reviewMutation = useReviewCardMutation();

  const [index, setIndex] = useState(0);
  // Hangi kartın cevabı açıldı. Ayrı bir "revealed" boolean'ı tutup effect
  // ile sıfırlamak yerine indeksle karşılaştırıyoruz: kart değiştiğinde
  // cevap kendiliğinden kapanmış oluyor, senkronizasyon effect'i gerekmiyor.
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  // Kartın ekrana geldiği an. Render sırasında Date.now() çağırmak saf
  // olmayan bir işlem (react-hooks/purity), o yüzden ilk damga kartın
  // yerleşiminde (onLayout) atılıyor, sonrakiler kart ilerletilirken.
  const shownAtRef = useRef<number>(0);

  const revealed = revealedIndex === index;

  const cards = data?.cards ?? [];
  const card = cards[index];
  const finished = !isLoading && !isError && (cards.length === 0 || index >= cards.length);

  useEffect(() => {
    trackEvent("srs_session_started", { due_count: data?.dueCount ?? 0 });
    // Oturum başına bir kez; kart sayısı değiştiğinde tekrar saymıyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardShown = useCallback(() => {
    shownAtRef.current = Date.now();
  }, []);

  const handleReveal = useCallback(() => {
    setRevealedIndex(index);
  }, [index]);

  const handleRate = useCallback(
    (rating: SrsRating) => {
      if (!card) return;
      const shownAt = shownAtRef.current;
      reviewMutation.mutate({
        card,
        rating,
        // Damga bir şekilde atılmadıysa süreyi 0 gönder — yanlış bir süre
        // yazmaktansa "ölçülemedi" demek daha doğru.
        elapsedMs: shownAt > 0 ? Date.now() - shownAt : 0,
      });
      setIndex((current) => current + 1);
      // Sonraki kartın süre ölçümü buradan başlıyor.
      shownAtRef.current = Date.now();
    },
    [card, reviewMutation],
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
    const reviewedCount = Math.min(index, cards.length);
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
        <View style={styles.centered}>
          <Text style={[type.sectionHeading, { color: theme.text.primary }]}>
            {reviewedCount > 0 ? t("srs.doneTitle") : t("srs.emptyTitle")}
          </Text>
          <Text
            style={[monoType.rowText, styles.centeredText, { color: theme.text.secondary }]}
          >
            {reviewedCount > 0
              ? t("srs.doneMessage", { count: reviewedCount })
              : t("srs.emptyMessage")}
          </Text>
          <Button label={t("common.back")} onPress={onClose} variant="secondary" size="sm" />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) return null;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <ReviewProgress current={index + 1} total={cards.length} onClose={onClose} />

      <Pressable
        style={styles.cardArea}
        onLayout={handleCardShown}
        onPress={handleReveal}
        disabled={revealed}
        accessibilityRole="button"
        accessibilityLabel={revealed ? card.lemma : t("srs.revealHint")}
      >
        <ScrollView
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[type.display, styles.word, { color: theme.text.primary }]}>
            {card.surface}
          </Text>

          {revealed ? (
            <View style={styles.answer}>
              <Text style={[type.sectionHeading, styles.gloss, { color: theme.accent }]}>
                {card.trGloss ?? t("srs.noGloss")}
              </Text>

              {card.contextText ? (
                <Text
                  style={[monoType.rowText, styles.context, { color: theme.text.secondary }]}
                >
                  {card.contextText}
                </Text>
              ) : null}

              {card.bookTitle ? (
                <Text style={[monoType.label, styles.source, { color: theme.text.secondary }]}>
                  {card.bookTitle}
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
  gloss: {
    textAlign: "center",
  },
  context: {
    textAlign: "center",
  },
  source: {
    textAlign: "center",
    opacity: 0.7,
  },
});
