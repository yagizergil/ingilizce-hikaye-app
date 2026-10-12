import { useMemo } from "react";

import { useOfferingsQuery } from "@/features/paywall/api/useOfferingsQuery";
import {
  trialEligibilityOrNone,
  useTrialEligibilityQuery,
} from "@/features/paywall/api/useTrialEligibilityQuery";
import { buildPlanOptions } from "@/features/paywall/planModel";

/**
 * Bu kullanıcıya GERÇEKTEN sunulabilecek ücretsiz deneme (gün) -- yoksa null.
 *
 * `useTrialDays`'ten farkı: uygunluk kontrolü de yapılıyor. Paywall dışında
 * "N gün ücretsiz" yazan her yüzey (ana sayfa teklif kartı) bunu kullanmalı;
 * denemesini kullanmış birine deneme vaat etmek Guideline 2.3.1 ihlali.
 */
export function useTrialOffer(): number | null {
  const { data: packages } = useOfferingsQuery();
  const { data: eligible } = useTrialEligibilityQuery(packages);

  return useMemo(() => {
    const options = buildPlanOptions(packages ?? [], trialEligibilityOrNone(eligible));
    const withTrial =
      options.find((option) => option.isRecommended && option.trial) ??
      options.find((option) => option.trial) ??
      null;
    return withTrial?.trial?.days ?? null;
  }, [packages, eligible]);
}
