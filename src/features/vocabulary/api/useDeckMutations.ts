import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

/**
 * Yeni deste oluşturur. Ücretsiz/premium sınırı YOK (2026-09-20 ürün
 * kararı) -- CRUD burada bilerek basit, `set_language_pair` gibi bir
 * server-side kural/RPC gerekmiyor çünkü kural yok.
 */
export function useCreateDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; colorKey: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("no_session");

      const { data, error } = await supabase
        .from("custom_decks")
        .insert({ user_id: userData.user.id, name: input.name.trim(), color_key: input.colorKey })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      trackEvent("custom_deck_created");
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
  });
}

export function useRenameDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { deckId: string; name: string; colorKey: string }) => {
      const { error } = await supabase
        .from("custom_decks")
        .update({ name: input.name.trim(), color_key: input.colorKey })
        .eq("id", input.deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
    },
  });
}

/**
 * Desteyi ve içindeki tüm kartları siler (`on delete cascade`, migration
 * 045). Onay ekranda soruluyor (`app/deck/[deckId].tsx`) -- geri alınamaz.
 */
export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabase.from("custom_decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: (_data, deckId) => {
      trackEvent("custom_deck_deleted");
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKeys.decks() });
      void queryClient.removeQueries({ queryKey: vocabularyQueryKeys.deckCards(deckId) });
    },
  });
}
