import { useMemo } from "react";

import { useOfferingsQuery } from "@/features/paywall/api/useOfferingsQuery";
import { buildPlanOptions } from "@/features/paywall/planModel";

/**
 * Önerilen plandaki ücretsiz deneme süresi (gün) -- deneme yoksa null.
 *
 * NEDEN SABİT "7 GÜN" YAZILMADI: deneme süresi App Store Connect'teki
 * giriş fiyatından geliyor ve orada değiştirilebilir. Ekranda yazan gün
 * sayısı ile gerçekte uygulanan süre ayrışırsa bu yanıltıcı metadata olur
 * (Guideline 2.3.1) -- paywall'ın geri kalanında fiyatı koda gömmeme
 * gerekçesinin aynısı.
 */
export function useTrialDays(): number | null {
  const { data: packages } = useOfferingsQuery();

  return useMemo(() => {
    const options = buildPlanOptions(packages ?? []);
    const recommended = options.find((option) => option.isRecommended) ?? options[0] ?? null;
    return recommended?.trial?.days ?? null;
  }, [packages]);
}
