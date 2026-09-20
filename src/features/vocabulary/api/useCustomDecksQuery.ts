import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { CustomDeck } from "@/features/vocabulary/types";

interface RawDeckRow {
  id: string;
  name: string;
  color_key: string;
  created_at: string;
}

interface RawCountRow {
  deck_id: string;
  card_count: number;
  due_count: number;
}

/**
 * DENETİM BULGUSU (2026-09-20): kart sayısı/vade sayısı istemcide ham
 * satırlar üzerinden SAYILMIYOR -- `custom_deck_counts()` RPC'si (migration
 * 045) veritabanında topluyor. Gerekçe: bu denetimde üç kez bulunan
 * "PostgREST'in 1000 satır varsayılan sınırı sessizce kesiyor" hatasının
 * (book_lemmas, book_paragraphs, books) aynı sınıfını baştan önlemek.
 */
async function fetchCustomDecks(): Promise<CustomDeck[]> {
  const [deckResult, countResult] = await Promise.all([
    supabase
      .from("custom_decks")
      .select("id, name, color_key, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("custom_deck_counts"),
  ]);

  if (deckResult.error) throw deckResult.error;
  if (countResult.error) throw countResult.error;

  const counts = new Map<string, { cardCount: number; dueCount: number }>();
  for (const row of (countResult.data ?? []) as RawCountRow[]) {
    counts.set(row.deck_id, { cardCount: row.card_count, dueCount: row.due_count });
  }

  return ((deckResult.data ?? []) as RawDeckRow[]).map((deck) => ({
    id: deck.id,
    name: deck.name,
    colorKey: deck.color_key,
    cardCount: counts.get(deck.id)?.cardCount ?? 0,
    dueCount: counts.get(deck.id)?.dueCount ?? 0,
    createdAt: deck.created_at,
  }));
}

export function useCustomDecksQuery() {
  return useQuery({
    queryKey: vocabularyQueryKeys.decks(),
    queryFn: fetchCustomDecks,
  });
}
