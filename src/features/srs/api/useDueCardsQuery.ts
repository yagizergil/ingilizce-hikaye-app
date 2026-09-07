import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { srsQueryKeys } from "@/features/srs/api/queryKeys";

import type { SrsDueData, SrsReviewCard } from "@/features/srs/types";

/**
 * Tek oturumda gösterilecek en fazla kart sayısı.
 *
 * Vadesi gelen 200 kart varken hepsini tek seferde göstermek kullanıcıyı
 * boğar ve oturumu terk ettirir. Sınır ücretsiz/premium ayrımı DEĞİL —
 * kalan kartlar yarına kalmıyor, kullanıcı isterse yeni bir oturum
 * başlatıp devam edebiliyor.
 */
const SESSION_SIZE = 20;

interface CardRow {
  id: string;
  lemma: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
}

interface SavedWordRow {
  lemma: string;
  surface: string;
  context_text: string | null;
  books: { title: string } | null;
}

interface GlossRow {
  lemma: string;
  tr_gloss: string | null;
}

/**
 * Vadesi gelmiş kartları, gösterim için gereken bağlamla birlikte getirir.
 *
 * RLS `srs_cards` ve `user_saved_words` tablolarını `auth.uid()` ile
 * sınırlıyor, bu yüzden burada ayrıca user_id filtresi yok.
 */
export async function fetchDueCards(): Promise<SrsDueData> {
  const nowIso = new Date().toISOString();

  const { data: cardRows, error: cardError, count } = await supabase
    .from("srs_cards")
    .select("id, lemma, interval_days, ease, repetitions, lapses", { count: "exact" })
    .eq("card_type", "recognition")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(SESSION_SIZE)
    .returns<CardRow[]>();

  if (cardError) throw cardError;

  const cards = cardRows ?? [];
  if (cards.length === 0) {
    return { cards: [], dueCount: count ?? 0 };
  }

  const lemmas = Array.from(new Set(cards.map((card) => card.lemma)));

  const [{ data: wordRows, error: wordError }, { data: glossRows, error: glossError }] =
    await Promise.all([
      supabase
        .from("user_saved_words")
        .select("lemma, surface, context_text, books(title)")
        .in("lemma", lemmas)
        .returns<SavedWordRow[]>(),
      supabase
        .from("lemma_canonical")
        .select("lemma, tr_gloss")
        .in("lemma", lemmas)
        .returns<GlossRow[]>(),
    ]);

  if (wordError) throw wordError;
  if (glossError) throw glossError;

  const wordByLemma = new Map((wordRows ?? []).map((row) => [row.lemma, row]));
  const glossByLemma = new Map((glossRows ?? []).map((row) => [row.lemma, row.tr_gloss]));

  const reviewCards: SrsReviewCard[] = cards.map((card) => {
    const word = wordByLemma.get(card.lemma);
    return {
      id: card.id,
      lemma: card.lemma,
      // Kaydedilen satır bir şekilde silinmişse yüzey biçimi olarak
      // lemma'nın kendisini göster — kart yine de çalışılabilir.
      surface: word?.surface ?? card.lemma,
      trGloss: glossByLemma.get(card.lemma) ?? null,
      contextText: word?.context_text ?? null,
      bookTitle: word?.books?.title ?? null,
      intervalDays: Number(card.interval_days),
      ease: Number(card.ease),
      repetitions: card.repetitions,
      lapses: card.lapses,
    };
  });

  return { cards: reviewCards, dueCount: count ?? reviewCards.length };
}

export function useDueCardsQuery() {
  return useQuery({
    queryKey: srsQueryKeys.dueCards(),
    queryFn: fetchDueCards,
    // Kartlar kullanıcı cevapladıkça değişiyor; ekrana her dönüşte
    // tazelemek yerine mutation'lar cache'i doğrudan güncelliyor.
    staleTime: 60_000,
  });
}
