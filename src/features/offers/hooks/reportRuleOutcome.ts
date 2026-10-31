import { setImpressionOutcome } from "@/features/offers/api/offerApi";
import { useOfferHistoryStore } from "@/features/offers/hooks/useOfferHistoryStore";

import type { ImpressionOutcome } from "@/features/offers/api/offerApi";

/**
 * Kural gösteriminin sonucunu sunucudaki satıra yazar (kural başına
 * dönüşüm, rapor C14 "kural başına gelir"). Satır henüz yazılamadıysa
 * (çevrimdışı) sessizce atlanır; olay analitikte zaten var.
 */
export function reportRuleOutcome(ruleId: string, outcome: ImpressionOutcome): void {
  const id = useOfferHistoryStore.getState().impressionIds[ruleId];
  if (id === undefined) return;
  void setImpressionOutcome(id, outcome);
}
