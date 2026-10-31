import { useOfferRulesQuery } from "@/features/offers/api/useOfferRulesQuery";

/**
 * Bir kuralın sunucudaki cooldown'u (saat) ve açık olup olmadığı.
 *
 * Ana sayfa deneme kartı (`home_offer`) kendi yerel sıklık durumunu
 * tutmaya devam ediyor; yalnızca 72 saatlik sabit ve aç/kapa artık kural
 * tablosundan geliyor (rapor Faz 2 #2: "mevcut 72 sa kuralı tabloya
 * taşınır"). Kurallar henüz yüklenmediyse `fallbackHours`.
 */
export function useRuleCooldownHours(
  ruleId: string,
  fallbackHours: number,
): { enabled: boolean; cooldownHours: number } {
  const { data } = useOfferRulesQuery();
  if (!data) return { enabled: true, cooldownHours: fallbackHours };
  const rule = data.rules.find((item) => item.id === ruleId);
  if (!rule) return { enabled: false, cooldownHours: fallbackHours };
  return { enabled: true, cooldownHours: rule.cooldownHours ?? fallbackHours };
}
