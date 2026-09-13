import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { fetchActiveLanguagePair } from "@/features/languagePair";

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
  gloss?: string;
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
 * GENELLEŞTİRME (v2, 2026-09-13 — dil çiftleri): edge function artık
 * herhangi bir (ana dil, hedef dil) çifti alıyor -- bkz.
 * supabase/functions/translate-lemma. Bu hook aktif çifti okuyup isteğe
 * ekliyor. `trGloss` alan adı DEĞİŞMEDİ (WordSheet'te "gösterilecek
 * karşılık" anlamında dahili bir isim, artık Türkçe'ye özgü değil -- adı
 * değiştirmek WordSheet'in her yerini dokunmak demek olurdu, faydası yok).
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
      const pair = await fetchActiveLanguagePair();

      const { data, error } = await supabase.functions.invoke<TranslateLemmaResponse>(
        "translate-lemma",
        {
          body: {
            ...params,
            nativeLanguage: pair.nativeLanguage,
            targetLanguage: pair.targetLanguage,
          },
        },
      );

      if (error || !data || data.status !== "ok" || !data.gloss || !data.pos) {
        return null;
      }

      return { trGloss: data.gloss, pos: data.pos };
    },
  });
}
