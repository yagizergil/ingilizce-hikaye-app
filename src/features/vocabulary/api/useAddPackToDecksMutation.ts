import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { WordPackWord } from "@/features/vocabulary/api/useWordPackQuery";

interface AddPackInput {
  name: string;
  level: string;
  words: WordPackWord[];
}

/**
 * Keşfet paketini tek seferde yeni bir özel desteye çevirir. Karşılığı
 * olmayan kelimeler atlanıyor -- boş arka yüzlü kart işe yaramaz. Kart
 * eklenemezse yarım kalan deste siliniyor (kullanıcı boş bir deste görmesin).
 */
export function useAddPackToDecksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPackInput): Promise<string> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("no_session");
      const userId = userData.user.id;

      const cards = input.words.filter((w) => w.gloss);
      if (cards.length === 0) throw new Error("empty_pack");

      const { data: deck, error: deckError } = await supabase
        .from("custom_decks")
        .insert({ user_id: userId, name: input.name, color_key: "sage" })
        .select("id")
        .single();
      if (deckError) throw deckError;
      const deckId = deck.id as string;

      const { error: cardsError } = await supabase.from("custom_deck_cards").insert(
        cards.map((w) => ({
          deck_id: deckId,
          user_id: userId,
          surface: w.lemma,
          meaning: w.gloss,
          example_sentence: null,
        })),
      );
      if (cardsError) {
        await supabase.from("custom_decks").delete().eq("id", deckId);
        throw cardsError;
      }
      return deckId;
    },
    onSuccess: (_deckId, variables) => {
      trackEvent("word_pack_added", { level: variables.level, size: variables.words.length });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
  });
}
