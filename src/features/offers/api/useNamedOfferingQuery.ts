import { useQuery } from "@tanstack/react-query";

import { fetchNamedOffering, isPurchasesAvailable } from "@/lib/revenuecat";

import { offersQueryKeys } from "@/features/offers/api/queryKeys";

/**
 * Kuralın adlandırdığı RevenueCat offering'i (ör. "sale", "downsell"),
 * güncel teklifle BİRLEŞTİRİLMEDEN. Tanımlı değilse `requested: null` ve
 * çağıran sessizce normal akışa düşer.
 */
export function useNamedOfferingQuery(offeringId: string | null) {
  return useQuery({
    queryKey: [...offersQueryKeys.all, "offering", offeringId ?? ""],
    queryFn: () => fetchNamedOffering(offeringId ?? ""),
    enabled: isPurchasesAvailable && offeringId !== null,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}
