import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchLemmaGlossesBatch } from "@/lib/lemmaGlossBatch";
import { fetchActiveLanguagePair } from "@/features/languagePair";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { VocabularyData, VocabularyWord } from "@/features/vocabulary/types";

interface SavedWordRow {
  id: string;
  lemma: string;
  created_at: string;
  books: { title: string } | null;
}

interface SrsCardRow {
  lemma: string;
  due_at: string;
}

interface LemmaStateRow {
  lemma: string;
  state: "new" | "learning" | "known" | "ignored";
}

/**
 * Fetches everything the "Defter" screen needs and merges it client-side
 * by lemma:
 *  - `user_saved_words` — the saved word list itself (source of truth for
 *    which rows exist).
 *  - `lemma_canonical` — one gloss/pos/cefr row per lemma (see types.ts
 *    for why the raw `lemmas` table can't be joined directly).
 *  - `srs_cards` — due date per lemma, recognition card only (matches the
 *    mockup's single due-date-per-word display; a lemma can have
 *    recognition/production/listening cards, recognition is the one shown
 *    to the user first).
 *  - `user_lemma_state` — mastery state per lemma, used for the
 *    ÖĞRENİLDİ filter.
 *
 * RLS scopes `user_saved_words`, `srs_cards` and `user_lemma_state` to
 * `auth.uid()` automatically; no explicit user_id filter is needed here.
 */
export async function fetchVocabularyData(): Promise<VocabularyData> {
  const { data: savedRows, error: savedError } = await supabase
    .from("user_saved_words")
    .select("id, lemma, created_at, books(title)")
    .order("created_at", { ascending: false })
    .returns<SavedWordRow[]>();

  if (savedError) {
    throw savedError;
  }

  const words = savedRows ?? [];
  const lemmas = Array.from(new Set(words.map((word) => word.lemma)));

  if (lemmas.length === 0) {
    return { words: [], summary: { totalCount: 0, dueTodayCount: 0 } };
  }

  // ÇÖZÜLEN KRİTİK HATA (kullanıcı bulgusu, 2026-09-16): bu sorgu
  // `lemma_canonical.tr_gloss`'u KOŞULSUZ okuyordu -- ana dili Türkçe
  // olmayan bir kullanıcı, okurken doğru (kendi ana dilindeki) karşılığı
  // görüp kelimeyi kaydettiğinde, bu ekranda aynı kelimenin TÜRKÇE
  // karşılığı çıkıyordu. Artık WordSheet'in kullandığı AYNI dil-çiftine
  // duyarlı kaynağı okuyor -- bkz. `fetchLemmaGlossesBatch`'in doc comment'i.
  const activePair = await fetchActiveLanguagePair();

  const [
    glossByLemma,
    { data: cardRows, error: cardError },
    { data: stateRows, error: stateError },
  ] = await Promise.all([
    fetchLemmaGlossesBatch(lemmas, activePair.nativeLanguage, activePair.targetLanguage),
    supabase
      .from("srs_cards")
      .select("lemma, due_at")
      .eq("card_type", "recognition")
      .in("lemma", lemmas)
      .returns<SrsCardRow[]>(),
    supabase
      .from("user_lemma_state")
      .select("lemma, state")
      .in("lemma", lemmas)
      .returns<LemmaStateRow[]>(),
  ]);

  if (cardError) {
    throw cardError;
  }
  if (stateError) {
    throw stateError;
  }

  const cardByLemma = new Map((cardRows ?? []).map((row) => [row.lemma, row]));
  const stateByLemma = new Map((stateRows ?? []).map((row) => [row.lemma, row]));

  const mapped: VocabularyWord[] = words.map((row) => {
    const gloss = glossByLemma.get(row.lemma);
    const card = cardByLemma.get(row.lemma);
    const state = stateByLemma.get(row.lemma);

    return {
      id: row.id,
      lemma: row.lemma,
      gloss: gloss?.gloss ?? null,
      pos: gloss?.pos ?? null,
      cefrLevel: gloss?.cefrLevel ?? null,
      sourceTitle: row.books?.title ?? null,
      dueAt: card?.due_at ?? null,
      state: state?.state ?? null,
      createdAt: row.created_at,
    };
  });

  const now = Date.now();
  const dueTodayCount = mapped.filter(
    (word) => word.dueAt !== null && new Date(word.dueAt).getTime() <= now,
  ).length;

  return {
    words: mapped,
    summary: { totalCount: mapped.length, dueTodayCount },
  };
}

export function useVocabularyQuery() {
  return useQuery({
    queryKey: vocabularyQueryKeys.words(),
    queryFn: fetchVocabularyData,
  });
}
