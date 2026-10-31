import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";

import type { CancelReason, RetentionChoice } from "@/features/subscription/cancelFlow";

export interface CancelFeedbackInput {
  reason: CancelReason;
  note: string | null;
  productId: string | null;
  lifecycleStatus: string | null;
  offerShown: RetentionChoice;
}

/**
 * Neden anketini `cancel_feedback`e yazar (migration 101, RLS: yalnızca
 * kendi satırı). Başarısızlık akışı DURDURMAZ: anket bizim için, iptal
 * kullanıcının hakkı -- hata kaydedilir ve akış devam eder.
 */
export async function submitCancelFeedback(input: CancelFeedbackInput): Promise<void> {
  const { error } = await supabase.from("cancel_feedback").insert({
    reason: input.reason,
    note: input.note,
    product_id: input.productId,
    lifecycle_status: input.lifecycleStatus,
    offer_shown: input.offerShown,
  });
  if (error) throw error;
}

export function useCancelFeedbackMutation() {
  return useMutation({
    mutationFn: submitCancelFeedback,
    onError: (error) => trackError("subscription.cancelFeedback", error),
  });
}
