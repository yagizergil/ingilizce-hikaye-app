/**
 * Paywall tetikleyici kataloğu (C15).
 *
 * `source` = paywall'ı açan ÖZEL neden. Değerler BİLEREK yeniden
 * adlandırılmadı: geçmiş telemetri (`paywall_viewed.source`), başlık
 * eşlemesi ve RevenueCat'e yazılan bağlam bu adlarla birikti; yeniden
 * adlandırmak huniyi tarih ekseninde ikiye bölerdi. Belgedeki önerilen
 * adlar (ör. `audio_book_detail`) gerekirse analizde bu tablodan eşlenir.
 *
 * `placement` = açıldığı yer TÜRÜ (az ve sabit). Yeni; her paywall olayına
 * eklenir ki huni kaynak kaynak değil yer yer de okunabilsin.
 *
 * Yeni bir tetikleyici: önce buraya (derleyici `HEADLINE_BY_SOURCE`'ta
 * başlığını da ister), sonra `paywallTriggers.test.ts` envanterine.
 */
export const PLACEMENT_BY_SOURCE = {
  onboarding: "onboarding",
  home_offer: "home",
  word_quota: "limit",
  word_quota_badge: "limit",
  sentence_quota: "limit",
  smart_practice: "limit",
  vocabulary_strip: "limit",
  audio: "feature_gate",
  reader_listen: "feature_gate",
  book_quiz: "feature_gate",
  quiz_level_passed: "feature_gate",
  word_pack: "feature_gate",
  language_pair: "feature_gate",
  book_finished: "lesson_end",
  profile: "settings",
} as const;

export type PaywallSource = keyof typeof PLACEMENT_BY_SOURCE;
export type PaywallPlacement = (typeof PLACEMENT_BY_SOURCE)[PaywallSource];

export function isPaywallSource(value: string): value is PaywallSource {
  return Object.prototype.hasOwnProperty.call(PLACEMENT_BY_SOURCE, value);
}

/**
 * Bilinmeyen kaynak (eski bir derin bağlantı, `source`suz açılış) `unknown`
 * yerleşimine düşer; uygulama içi her çağrı `openPaywall()` ile tipli.
 */
export function placementFor(source: string): PaywallPlacement | "unknown" {
  return isPaywallSource(source) ? PLACEMENT_BY_SOURCE[source] : "unknown";
}
