import { supabase } from "@/lib/supabase";
import { reviewCard } from "@/features/srs";

interface CardRow {
  id: string;
  lemma: string;
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
}

/**
 * Akıllı Tekrar cevabını kelimenin tekrar planına yansıtır.
 *
 * - Vadesi gelmiş kart doğru bilindiyse "hard" (orta) değerlendirme: tekrar
 *   yapılmış sayılır.
 * - Yanlış bilinen her kart "again": unutulan kelime yakında yeniden sorulur.
 * - Vadesi gelmemiş kart doğru bilindiyse DOKUNULMUYOR: pratik, aralıkları
 *   erkenden uzatıp kelimeyi gereğinden geç sordurmamalı.
 */
export async function recordPracticeResult(lemma: string, correct: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("srs_cards")
    .select("id, lemma, due_at, interval_days, ease, repetitions, lapses")
    .eq("card_type", "recognition")
    .eq("lemma", lemma)
    .maybeSingle<CardRow>();
  if (error) throw error;
  if (!data) return;

  const isDue = new Date(data.due_at).getTime() <= Date.now();
  if (correct && !isDue) return;

  await reviewCard({
    card: {
      id: data.id,
      lemma: data.lemma,
      surface: data.lemma,
      gloss: null,
      contextText: null,
      bookTitle: null,
      repetitions: data.repetitions,
      intervalDays: data.interval_days,
      ease: data.ease,
      lapses: data.lapses,
    },
    rating: correct ? "hard" : "again",
    elapsedMs: 0,
  });
}
