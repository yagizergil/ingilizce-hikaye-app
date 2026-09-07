import { useMemo } from "react";

import type { VocabularyFilter, VocabularyWord } from "@/features/vocabulary/types";

/**
 * Filter semantics (see api/useVocabularyQuery.ts for where each field
 * comes from):
 *  - "all": every saved word.
 *  - "due": words with an `srs_cards` recognition card whose `due_at` has
 *    arrived or passed (`due_at <= now`). Words with no card yet don't
 *    qualify — they haven't entered the review queue.
 *  - "known": words whose `user_lemma_state.state` is "known", the
 *    schema's only graduated/mastered signal.
 */
export function useFilteredWords(words: VocabularyWord[] | undefined, filter: VocabularyFilter): VocabularyWord[] {
  return useMemo(() => {
    if (!words) {
      return [];
    }

    if (filter === "all") {
      return words;
    }

    if (filter === "due") {
      // "Suresi gelmis" filtresi tanimi geregi o anki zamana bakar;
      // sabit bir deger anlamsiz olurdu.
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      return words.filter((word) => word.dueAt !== null && new Date(word.dueAt).getTime() <= now);
    }

    return words.filter((word) => word.state === "known");
  }, [words, filter]);
}
