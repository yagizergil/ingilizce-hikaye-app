import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchLemmaGlossesBatch } from "@/lib/lemmaGlossBatch";
import { gateOnLanguagePair, useActiveLanguagePairQuery } from "@/features/languagePair";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

export interface WordPackWord {
  lemma: string;
  gloss: string | null;
}

export interface WordPack {
  isPremium: boolean;
  total: number;
  locked: boolean;
  words: WordPackWord[];
}

interface RawWordPack {
  isPremium?: unknown;
  total?: unknown;
  locked?: unknown;
  words?: unknown;
}

/** RPC yanıtını savunmacı biçimde ayrıştırır (saf, testli). */
export function parseWordPack(raw: unknown): Omit<WordPack, "words"> & { lemmas: string[] } {
  const value = (raw ?? {}) as RawWordPack;
  const lemmas = Array.isArray(value.words)
    ? value.words.filter((w): w is string => typeof w === "string")
    : [];
  return {
    isPremium: value.isPremium === true,
    total: typeof value.total === "number" ? value.total : lemmas.length,
    locked: value.locked === true,
    lemmas,
  };
}

/**
 * Keşfet kelime paketi (1.0.6, premium). Kapı sunucuda (migration 050/051):
 * ücretsiz kullanıcıya yalnızca ilk 5 kelime dönüyor, `locked` true geliyor.
 */
export function useWordPackQuery(level: string) {
  const pair = useActiveLanguagePairQuery();
  const target = pair.data?.targetLanguage ?? "en";
  const native = pair.data?.nativeLanguage ?? "tr";

  const query = useQuery({
    queryKey: vocabularyQueryKeys.wordPack(target, native, level),
    enabled: Boolean(pair.data),
    queryFn: async (): Promise<WordPack> => {
      const { data, error } = await supabase.rpc("level_word_pack", {
        p_target_language: target,
        p_level: level,
        p_limit: 40,
      });
      if (error) throw error;
      const parsed = parseWordPack(data);
      const glosses = await fetchLemmaGlossesBatch(parsed.lemmas, native, target);
      return {
        isPremium: parsed.isPremium,
        total: parsed.total,
        locked: parsed.locked,
        words: parsed.lemmas.map((lemma) => ({
          lemma,
          gloss: glosses.get(lemma)?.gloss ?? null,
        })),
      };
    },
  });
  // Dil çifti gelene kadar sorgu kapalı; v5 bunu isLoading:false döndürüyor
  // ve ekran açılışta bir an "hata" gösteriyordu (bkz. 1.0.5 notu).
  return gateOnLanguagePair(query, pair);
}
