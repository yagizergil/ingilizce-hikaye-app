import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

import type { CustomDeckCard } from "@/features/vocabulary/types";

interface RawCardRow {
  id: string;
  deck_id: string;
  surface: string;
  meaning: string;
  example_sentence: string | null;
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
  created_at: string;
}

function mapRow(row: RawCardRow): CustomDeckCard {
  return {
    id: row.id,
    deckId: row.deck_id,
    surface: row.surface,
    meaning: row.meaning,
    exampleSentence: row.example_sentence,
    dueAt: row.due_at,
    intervalDays: row.interval_days,
    ease: row.ease,
    repetitions: row.repetitions,
    lapses: row.lapses,
    createdAt: row.created_at,
  };
}

/**
 * Bir destenin TÜM kartları -- deste detay ekranındaki liste için.
 *
 * `.limit()` konmadı ama risksiz: bu TEK bir kullanıcının TEK destesi,
 * PostgREST'in 1000 satır sınırına gerçekçi olarak asla yaklaşmaz
 * (`useCustomDecksQuery`'nin çok-deste TOPLAMI için ayrı bir RPC kullanma
 * sebebiyle karıştırılmamalı -- oradaki risk kullanıcı genelindeki TOPLAM
 * kart sayısıydı, burada tek destenin kendisi).
 */
async function fetchDeckCards(deckId: string): Promise<CustomDeckCard[]> {
  const { data, error } = await supabase
    .from("custom_deck_cards")
    .select(
      "id, deck_id, surface, meaning, example_sentence, due_at, interval_days, ease, repetitions, lapses, created_at",
    )
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RawCardRow[]).map(mapRow);
}

export function useDeckCardsQuery(deckId: string) {
  return useQuery({
    queryKey: vocabularyQueryKeys.deckCards(deckId),
    queryFn: () => fetchDeckCards(deckId),
    enabled: deckId.length > 0,
  });
}

/**
 * Bir destenin BUGÜN vadesi gelen kartları -- "Bu desteyi çalış" akışı.
 */
async function fetchDeckDueCards(deckId: string): Promise<CustomDeckCard[]> {
  const { data, error } = await supabase
    .from("custom_deck_cards")
    .select(
      "id, deck_id, surface, meaning, example_sentence, due_at, interval_days, ease, repetitions, lapses, created_at",
    )
    .eq("deck_id", deckId)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RawCardRow[]).map(mapRow);
}

export function useDeckDueCardsQuery(deckId: string) {
  return useQuery({
    queryKey: vocabularyQueryKeys.deckDueCards(deckId),
    queryFn: () => fetchDeckDueCards(deckId),
    enabled: deckId.length > 0,
  });
}
