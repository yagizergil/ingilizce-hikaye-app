import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { VocabularyWord } from "@/features/vocabulary/types";

interface SavedWordRow {
  id: string;
  lemma: string;
  created_at: string;
}

interface LemmaCanonicalRow {
  lemma: string;
  pos: string | null;
  cefr_level: string | null;
  tr_gloss: string | null;
}

interface LemmaStateRow {
  lemma: string;
  state: "new" | "learning" | "known" | "ignored";
}

export interface BookSavedWords {
  /** Bu kitapta hâlâ aktif kayıtlı (öğrenilmekte olan) kelimeler --
   * referansın "Favoriler" sekmesi. */
  favorites: VocabularyWord[];
  /** Bu kitapla etkileşime girmiş TÜM kelimeler (öğrenilmekte + öğrenildi)
   * -- referansın "Geçmiş" sekmesi. Not: her kelimeye dokunma (arama)
   * ayrı bir "geçmiş" tablosunda tutulmuyor -- burada "geçmiş" kaydedilmiş
   * kelimelerin tamamı anlamına geliyor, kaydetmeden yalnızca bakılan
   * kelimeler bu listeye girmiyor. */
  history: VocabularyWord[];
}

/**
 * FAZ 7 (2026-09-14, referans uygulama eşleştirmesi): reader'ın "kitap"
 * ikonunun açtığı "Kitaptan Kelimeler" sheet'i için -- `useVocabularyQuery`
 * ile aynı birleştirme mantığı (`user_saved_words` + `lemma_canonical` +
 * `user_lemma_state`), yalnızca TEK bir kitaba (`book_id`) filtrelenmiş.
 * `user_saved_words.book_id` zaten vardı (bkz. useSavedWordsQuery.ts'in
 * `saveWord`'ü) -- yeni bir sütun/migration gerekmedi.
 */
export function useBookSavedWordsQuery(bookId: string | null) {
  return useQuery({
    queryKey: ["reader", "bookSavedWords", bookId],
    queryFn: async (): Promise<BookSavedWords> => {
      if (!bookId) return { favorites: [], history: [] };

      const { data: savedRows, error: savedError } = await supabase
        .from("user_saved_words")
        .select("id, lemma, created_at")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .returns<SavedWordRow[]>();

      if (savedError) throw savedError;

      const rows = savedRows ?? [];
      const lemmas = Array.from(new Set(rows.map((row) => row.lemma)));

      if (lemmas.length === 0) return { favorites: [], history: [] };

      const [
        { data: canonicalRows, error: canonicalError },
        { data: stateRows, error: stateError },
      ] = await Promise.all([
        supabase
          .from("lemma_canonical")
          .select("lemma, pos, cefr_level, tr_gloss")
          .in("lemma", lemmas)
          .returns<LemmaCanonicalRow[]>(),
        supabase
          .from("user_lemma_state")
          .select("lemma, state")
          .in("lemma", lemmas)
          .returns<LemmaStateRow[]>(),
      ]);

      if (canonicalError) throw canonicalError;
      if (stateError) throw stateError;

      const canonicalByLemma = new Map((canonicalRows ?? []).map((row) => [row.lemma, row]));
      const stateByLemma = new Map((stateRows ?? []).map((row) => [row.lemma, row]));

      const mapped: VocabularyWord[] = rows.map((row) => {
        const canonical = canonicalByLemma.get(row.lemma);
        const state = stateByLemma.get(row.lemma);

        return {
          id: row.id,
          lemma: row.lemma,
          gloss: canonical?.tr_gloss ?? null,
          pos: canonical?.pos ?? null,
          cefrLevel: canonical?.cefr_level ?? null,
          sourceTitle: null,
          dueAt: null,
          state: state?.state ?? null,
          createdAt: row.created_at,
        };
      });

      return {
        favorites: mapped.filter((word) => word.state === "learning"),
        history: mapped.filter((word) => word.state === "learning" || word.state === "known"),
      };
    },
    enabled: bookId !== null,
  });
}
