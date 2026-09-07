import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface LiveWordTranslationParams {
  surface: string;
  lemma: string;
  contextSentence: string;
  cefrHint?: string;
}

export interface LiveWordTranslationResult {
  trGloss: string;
  pos: string;
}

interface TranslateLemmaResponse {
  status: "ok" | "unavailable";
  tr_gloss?: string;
  pos?: string;
  reason?: string;
}

/**
 * 3rd-tier, rare-case fallback: calls the `translate-lemma` Supabase Edge
 * Function ONLY after both the per-book dictionary (useBookLemmaDictionary)
 * and the global lemma_canonical lookup (useGlobalLemmaLookup) have missed.
 * The Edge Function itself writes any successful result back into `lemmas`
 * with `source: 'runtime'`, so future lookups for the same lemma resolve
 * through the normal `lemma_canonical` path without this function firing
 * again -- this is a mutation (fire-once-per-tap), not a cached query, since
 * a miss vs. a fresh translation isn't meaningfully "stale" data to
 * re-serve from a query cache the way useGlobalLemmaLookup's hits are.
 *
 * Never throws: the Edge Function always responds 200 with
 * `{ status: "unavailable", reason }` on rate-limit/provider/config
 * failures (never an opaque 500), and this hook mirrors that by resolving
 * to `null` rather than rejecting, so the caller can uniformly fall
 * through to Task 3's "no translation found" UI state on either outcome.
 */
export function useLiveWordTranslation() {
  return useMutation({
    mutationFn: async (
      params: LiveWordTranslationParams,
    ): Promise<LiveWordTranslationResult | null> => {
      const { data, error } = await supabase.functions.invoke<TranslateLemmaResponse>(
        "translate-lemma",
        { body: params },
      );

      if (error || !data || data.status !== "ok" || !data.tr_gloss || !data.pos) {
        return null;
      }

      return { trGloss: data.tr_gloss, pos: data.pos };
    },
  });
}
