import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

interface AddCardInput {
  deckId: string;
  surface: string;
  meaning: string;
  exampleSentence: string | null;
}

export function useAddDeckCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCardInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("no_session");

      const { error } = await supabase.from("custom_deck_cards").insert({
        deck_id: input.deckId,
        user_id: userData.user.id,
        surface: input.surface.trim(),
        meaning: input.meaning.trim(),
        example_sentence: input.exampleSentence?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      trackEvent("custom_deck_card_added", { deck_id: variables.deckId });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckCards(variables.deckId),
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckDueCards(variables.deckId),
      });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
  });
}

interface UpdateCardInput {
  id: string;
  deckId: string;
  surface: string;
  meaning: string;
  exampleSentence: string | null;
}

export function useUpdateDeckCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCardInput) => {
      const { error } = await supabase
        .from("custom_deck_cards")
        .update({
          surface: input.surface.trim(),
          meaning: input.meaning.trim(),
          example_sentence: input.exampleSentence?.trim() || null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckCards(variables.deckId),
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckDueCards(variables.deckId),
      });
    },
  });
}

export function useDeleteDeckCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; deckId: string }) => {
      const { error } = await supabase.from("custom_deck_cards").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      trackEvent("custom_deck_card_removed", { deck_id: variables.deckId });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckCards(variables.deckId),
      });
      void queryClient.invalidateQueries({
        queryKey: vocabularyQueryKeys.deckDueCards(variables.deckId),
      });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
  });
}
