import { useMemo } from "react";

import { PROMO_OFFER_IDS } from "@/lib/revenuecat";
import { env } from "@/lib/env";
import {
  buildPlanOptions,
  useOfferingsQuery,
  usePaywallFactsQuery,
  useSubscriptionQuery,
} from "@/features/paywall";

import { useRetentionOfferQuery } from "@/features/subscription/api/useRetentionOfferQuery";
import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { cancelLossItems, supportUrlFrom } from "@/features/subscription/cancelFlow";

/**
 * İptal akışının ihtiyaç duyduğu her veri tek yerde: kaybedilecekler
 * (sunucudaki sınırlardan), kullanıcının mevcut planı, nedene göre
 * teklifler (bağlama sabitli promotional kimlik, aylığa geçiş paketi).
 */
export function useCancelFlowContext() {
  const { data: lifecycle } = useSubscriptionLifecycleQuery();
  const { data: subscription } = useSubscriptionQuery();
  const { data: facts } = usePaywallFactsQuery();
  const { data: packages } = useOfferingsQuery();

  const options = useMemo(() => buildPlanOptions(packages ?? []), [packages]);
  const current = options.find((option) => option.pkg.product.identifier === lifecycle?.productId);
  const monthly = options.find((option) => option.kind === "monthly") ?? null;
  const currentKind = current?.kind ?? null;

  const promoIds =
    currentKind === "annual"
      ? [PROMO_OFFER_IDS.retainYearly]
      : currentKind === "monthly"
        ? [PROMO_OFFER_IDS.retainMonthly]
        : [];
  const { data: promo } = useRetentionOfferQuery(current ? [current.pkg] : [], {
    winback: false,
    promotionalIds: promoIds,
    enabled: promoIds.length > 0,
  });

  const lossItems = cancelLossItems({
    savedWordCount: subscription?.savedWordCount ?? 0,
    savedWordLimit: subscription?.savedWordLimit ?? 100,
    freeWordLookups: facts?.freeWordLookups ?? 0,
  });

  return {
    lifecycle: lifecycle ?? null,
    lossItems,
    promo: promo ?? null,
    monthly: currentKind === "annual" ? monthly : null,
    supportUrl: supportUrlFrom(env.privacyUrl),
  };
}
