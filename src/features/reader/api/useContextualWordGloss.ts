import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { LookupPair } from "@/features/reader/api/wordLookupRoute";

export interface ContextualWordGlossParams {
  surface: string;
  lemma: string;
  sentence: string;
}

export interface ContextualWordGloss {
  gloss: string;
  pos: string;
  lemma: string | null;
  alternatives: string[];
}

interface TranslateLemmaResponse {
  status: "ok" | "unavailable";
  gloss?: string;
  pos?: string;
  lemma?: string | null;
  alternatives?: unknown;
  reason?: string;
}

/** İstek gövdesi ayrı ve saf: dil çiftinin HER istekte gittiği testle kilitli. */
export function buildContextualGlossRequest(params: ContextualWordGlossParams, pair: LookupPair) {
  return {
    surface: params.surface,
    lemma: params.lemma,
    contextSentence: params.sentence,
    nativeLanguage: pair.nativeLanguage,
    targetLanguage: pair.targetLanguage,
  };
}

export function contextualGlossQueryKey(
  params: ContextualWordGlossParams | null,
  pair: LookupPair | null,
) {
  return [
    "reader",
    "contextGloss",
    pair?.targetLanguage ?? "",
    pair?.nativeLanguage ?? "",
    params?.surface.toLowerCase() ?? "",
    params?.sentence ?? "",
  ] as const;
}

async function fetchContextualGloss(
  params: ContextualWordGlossParams,
  pair: LookupPair,
): Promise<ContextualWordGloss | null> {
  const { data, error } = await supabase.functions.invoke<TranslateLemmaResponse>(
    "translate-lemma",
    { body: buildContextualGlossRequest(params, pair) },
  );
  if (error) throw error;
  if (!data || data.status !== "ok" || !data.gloss) return null;
  const alternatives = Array.isArray(data.alternatives)
    ? data.alternatives.filter((alt): alt is string => typeof alt === "string")
    : [];
  return {
    gloss: data.gloss,
    pos: data.pos ?? "other",
    lemma: data.lemma ?? null,
    alternatives,
  };
}

/**
 * İngilizce-Türkçe dışındaki her çiftte kelime anlamının TEK kaynağı:
 * kaynak dil + yüzey biçimi + lemma + cümle `translate-lemma`'ya gider,
 * sunucu önce bağlama duyarlı önbelleğe (`word_context_glosses`) bakar.
 * Anahtar dil çiftini ve cümleyi taşıdığı için "son" gibi çok anlamlı
 * kelimeler farklı cümlelerde karışmaz.
 */
export function useContextualWordGloss(
  params: ContextualWordGlossParams | null,
  pair: LookupPair | null,
) {
  return useQuery({
    queryKey: contextualGlossQueryKey(params, pair),
    queryFn: () => fetchContextualGloss(params as ContextualWordGlossParams, pair as LookupPair),
    enabled: params !== null && pair !== null && params.surface.length > 0,
    staleTime: Infinity,
    retry: 1,
  });
}
