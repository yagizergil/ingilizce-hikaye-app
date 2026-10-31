import { useQuery } from "@tanstack/react-query";

import {
  fetchOfferingPackagesStrict,
  findRetentionOffer,
  isPurchasesAvailable,
} from "@/lib/revenuecat";
import { subscriptionQueryKeys } from "@/features/paywall";

import type { PurchasesPackage } from "react-native-purchases";

/**
 * Bu kullanıcıya uygulanabilecek win-back / promotional teklif.
 *
 * App Store Connect'te teklif tanımlı değilse (bugünkü durum) sonuç null ve
 * ekranlar yalnızca bilgilendirip yönlendiriyor. Sorgu hatası da null'a
 * düşüyor (findRetentionOffer hataları kaydedip yutmadan null döner):
 * kazanılmamış bir indirim iddiası Guideline 2.3.1 riski.
 */
export function useRetentionOfferQuery(
  packages: PurchasesPackage[] | undefined,
  options: { winback: boolean; promotionalIds: readonly string[]; enabled?: boolean },
) {
  const ids = (packages ?? []).map((pkg) => pkg.identifier).sort();
  return useQuery({
    queryKey: [
      ...subscriptionQueryKeys.all,
      "retentionOffer",
      ids,
      options.winback,
      [...options.promotionalIds],
    ],
    queryFn: () =>
      findRetentionOffer(packages ?? [], {
        winback: options.winback,
        promotionalIds: options.promotionalIds,
      }),
    enabled: isPurchasesAvailable && ids.length > 0 && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * `sale` offering'inin paketleri (winback_trial, IZLENECEK-YOL §3.2).
 * ASC'de `...premium.yearly.sale` ürünü ve RevenueCat'te `sale` offering'i
 * kurulana kadar boş: ekran o zaman yalnızca bilgilendirir.
 */
export function useSaleOfferingQuery(enabled: boolean) {
  return useQuery({
    queryKey: [...subscriptionQueryKeys.offerings(), "strict", "sale"],
    queryFn: () => fetchOfferingPackagesStrict("sale"),
    enabled: isPurchasesAvailable && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
