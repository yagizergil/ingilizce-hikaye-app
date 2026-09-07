import { useQuery } from "@tanstack/react-query";

import { fetchOfferingPackages, isPurchasesAvailable } from "@/lib/revenuecat";

import { subscriptionQueryKeys } from "@/features/paywall/api/useSubscriptionQuery";

import type { PurchasesPackage } from "react-native-purchases";

/**
 * Satın alınabilir paketler.
 *
 * Fiyatlar RevenueCat'ten geliyor ve `product.priceString` zaten kullanıcının
 * bölgesine göre biçimlenmiş oluyor (₺, $, €) — uygulamada fiyat biçimleme
 * yapmıyoruz, App Store'un söylediğini gösteriyoruz.
 */
export function useOfferingsQuery() {
  return useQuery<PurchasesPackage[]>({
    queryKey: subscriptionQueryKeys.offerings(),
    queryFn: fetchOfferingPackages,
    // Expo Go'da native modül yok; sorguyu hiç çalıştırmıyoruz.
    enabled: isPurchasesAvailable,
    staleTime: 10 * 60 * 1000,
  });
}
