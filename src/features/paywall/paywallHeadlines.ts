import { isPaywallSource } from "@/features/paywall/paywallSources";
import type { PaywallSource } from "@/features/paywall/paywallSources";

/**
 * Paywall başlığı, açıldığı ana göre: kullanıcı o an neyi istiyorsa onu
 * söyle. Anahtar `paywall.headlines.<değer>.{title,subtitle}`.
 *
 * 1.1.0: onboarding, profile, book_finished, vocabulary_strip,
 * language_pair, word_pack ve home_offer eklendi -- denetimde bu altı
 * kaynak genel başlığa düşüyordu (bkz. docs/research/2026-10-12-1.1.0-donusum-denetimi.md).
 * Bilinmeyen kaynakta genel başlık (`paywall.title`).
 *
 * C15: tip `Record<PaywallSource, …>` -- katalogda (paywallSources.ts) olup
 * burada başlığı olmayan bir kaynak DERLEME hatası.
 */
export const HEADLINE_BY_SOURCE: Record<PaywallSource, string> = {
  audio: "listen",
  reader_listen: "listen",
  book_quiz: "quiz",
  quiz_level_passed: "quiz",
  word_quota: "words",
  word_quota_badge: "words",
  sentence_quota: "sentences",
  smart_practice: "practice",
  onboarding: "onboarding",
  profile: "profile",
  book_finished: "bookFinished",
  vocabulary_strip: "notebook",
  language_pair: "languagePair",
  word_pack: "wordPack",
  home_offer: "homeOffer",
};

export function headlineKeyFor(source: string): string | null {
  return isPaywallSource(source) ? HEADLINE_BY_SOURCE[source] : null;
}
