/**
 * Vocabulary feature types — "Defter" (saved words) screen.
 *
 * Data model note (see supabase/migrations 001-003):
 *  - `user_saved_words` is the list of words a user explicitly saved while
 *    reading (lemma, surface form, source sentence/book, note).
 *  - `srs_cards` is the spaced-repetition queue, keyed by (user, lemma,
 *    card_type). A saved word may or may not have a card yet.
 *  - `user_lemma_state` tracks per-lemma mastery state
 *    ('new' | 'learning' | 'known' | 'ignored') — "known" is the schema's
 *    only "öğrenildi" signal, used for the ÖĞRENİLDİ filter.
 *  - `lemma_canonical` (view over `lemmas`) resolves the ambiguous
 *    (lemma, pos) primary key to one canonical gloss/pos/cefr row per
 *    lemma — see migration 013 for why the raw `lemmas` table can't be
 *    joined directly by lemma alone.
 */

export type VocabularyFilter = "all" | "due" | "known";

export interface VocabularyWord {
  /** `user_saved_words.id` — stable row identity for list keys. */
  id: string;
  lemma: string;
  /** Turkish gloss from `lemma_canonical.tr_gloss`, may be missing for a
   * lemma the pipeline hasn't glossed yet. */
  gloss: string | null;
  /** `lemma_canonical.pos`, e.g. "noun", "verb". */
  pos: string | null;
  /** `lemma_canonical.cefr_level`, e.g. "B1". Optional per lemma. */
  cefrLevel: string | null;
  /** Title of the book this word was saved from, if any. */
  sourceTitle: string | null;
  /** `srs_cards.due_at` for this lemma's recognition card, if a card
   * exists yet. */
  dueAt: string | null;
  /** `user_lemma_state.state` for this lemma. */
  state: "new" | "learning" | "known" | "ignored" | null;
  createdAt: string;
}

export interface VocabularySummary {
  totalCount: number;
  dueTodayCount: number;
}

export interface VocabularyData {
  words: VocabularyWord[];
  summary: VocabularySummary;
}
