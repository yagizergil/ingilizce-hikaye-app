import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { srsQueryKeys } from "@/features/srs/api/queryKeys";
import { scheduleCard, type SrsRating } from "@/features/srs/scheduler";
import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { SrsReviewCard } from "@/features/srs/types";

interface ReviewInput {
  card: SrsReviewCard;
  rating: SrsRating;
  /** Kullanıcının cevaba kadar geçirdiği süre; zorluk analizi için. */
  elapsedMs: number;
}

/**
 * Bir kartı değerlendirir: yeni planı hesaplar, kartı günceller ve tekrarı
 * geçmişe yazar.
 *
 * Planlama saf fonksiyonda (`scheduleCard`) yapılıyor; burada yalnızca
 * sonucun yazılması var. Bu ayrım sayesinde algoritma veritabanı olmadan
 * test edilebiliyor.
 */
async function reviewCard({ card, rating, elapsedMs }: ReviewInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");

  const next = scheduleCard(card, rating, new Date());

  const { error: updateError } = await supabase
    .from("srs_cards")
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

  // Tekrar geçmişi ayrı bir tabloda: kartın kendisi yalnızca güncel durumu
  // tutuyor, geçmiş ise ileride FSRS'e geçmek istersek parametre uydurmanın
  // girdisi olacak (bkz. scheduler.ts başlığı).
  const { error: reviewError } = await supabase.from("srs_reviews").insert({
    card_id: card.id,
    user_id: userData.user.id,
    rating: rating === "again" ? 0 : rating === "hard" ? 3 : 5,
    elapsed_ms: Math.min(elapsedMs, 600_000),
  });

  // Geçmiş yazılamazsa kartın planı yine de doğru — kullanıcıyı
  // durdurmuyoruz, ama sessizce yutmuyoruz da.
  if (reviewError) throw reviewError;
}

export function useReviewCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewCard,
    onSuccess: (_data, variables) => {
      trackEvent("srs_card_reviewed", {
        rating: variables.rating,
        repetitions: variables.card.repetitions,
        elapsed_ms: variables.elapsedMs,
      });
      void queryClient.invalidateQueries({ queryKey: srsQueryKeys.all });
      // Kelimelerim ekranındaki "vadesi gelen" sayacı da değişti.
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.all });
    },
  });
}
