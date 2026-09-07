import type { TFunction } from "i18next";

/**
 * `lemma_canonical.pos` -> Turkish tag label for vocabulary.html
 * `.word .tags .tag` (e.g. "İsim", "Sıfat" — see mockup rows for
 * "oblivion" / "wretched"). Pipeline pos values observed across
 * migrations (013's canonical-row ordering): noun, verb, adjective,
 * adverb, preposition, determiner, pronoun, plus an "other" catch-all.
 */
export function formatPosLabel(t: TFunction, pos: string | null): string | null {
  if (pos === null) {
    return null;
  }

  const known = ["noun", "verb", "adjective", "adverb", "preposition", "determiner", "pronoun"];
  const key = known.includes(pos) ? pos : "other";

  return t(`vocabulary.pos.${key}`);
}
