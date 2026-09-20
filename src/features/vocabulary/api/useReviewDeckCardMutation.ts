import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackError, trackEvent } from "@/lib/analytics";

import { scheduleCard, type SrsRating } from "@/features/srs/scheduler";
import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { CustomDeckCard } from "@/features/vocabulary/types";

interface ReviewInput {
  card: CustomDeckCard;
  rating: SrsRating;
  elapsedMs: number;
}

/**
 * Bir deste kartını değerlendirir -- `useReviewCardMutation`'ın (kitap
 * kelimeleri) BİREBİR aynı deseni: planlama saf `scheduleCard`de, burada
 * yalnızca yazma var. `CustomDeckCard` zaten `SrsCardState`in alanlarını
 * (repetitions/intervalDays/ease/lapses) taşıyor, yani aynı fonksiyon hiç
 * değişiklik olmadan burada da çalışıyor -- iki ayrı SM-2 uygulaması
 * yazmaktan kaçınıyoruz.
 */
async function reviewDeckCard({ card, rating, elapsedMs }: ReviewInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");

  const next = scheduleCard(card, rating, new Date());

  const { error: updateError } = await supabase
    .from("custom_deck_cards")
    .update({
      due_at: next.dueAt.toISOString(),
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      lapses: next.lapses,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", card.id);
  if (updateError) throw updateError;

  // Geçmiş yazılamazsa fırlatılmıyor -- kartın planı zaten yazıldı (bkz.
  // useReviewCardMutation'daki aynı gerekçe, 2026-09-19 denetimi).
  const { error: reviewError } = await supabase.from("custom_deck_reviews").insert({
    card_id: card.id,
    user_id: userData.user.id,
    rating: rating === "again" ? 0 : rating === "hard" ? 3 : 5,
    elapsed_ms: Math.min(elapsedMs, 600_000),
  });
  if (reviewError) trackError("customDeck.reviewHistory", reviewError, { cardId: card.id });
}

export function useReviewDeckCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewDeckCard,
    onSuccess: (_data, variables) => {
      trackEvent("custom_deck_card_reviewed", {
        deck_id: variables.card.deckId,
        rating: variables.rating,
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckDueCards(variables.card.deckId),
      });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
    onError: (error, variables) => {
      trackError("customDeck.reviewCard", error, { cardId: variables.card.id });
    },
  });
}
