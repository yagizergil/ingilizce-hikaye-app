import type { SrsCardState } from "@/features/srs/scheduler";

/**
 * Tekrar ekranında gösterilen tek bir kart.
 *
 * `contextText` kritik: kelimeyi kendi hikâyesinden hatırlamak izole
 * ezberden çok daha güçlü. Kullanıcı kelimeyi ilk gördüğü cümleyle
 * birlikte görüyor.
 */
export interface SrsReviewCard extends SrsCardState {
  id: string;
  lemma: string;
  /** Kelimenin metinde göründüğü hali (çekimli olabilir). */
  surface: string;
  /** Türkçe karşılık. Sözlükte yoksa null — kart yine gösterilir. */
  trGloss: string | null;
  /** Kelimenin ilk kaydedildiği cümle. */
  contextText: string | null;
  /** Kelimenin kaydedildiği kitabın adı. */
  bookTitle: string | null;
}

export interface SrsDueData {
  cards: SrsReviewCard[];
  /** Bugün için toplam vadesi gelen kart sayısı. */
  dueCount: number;
}
