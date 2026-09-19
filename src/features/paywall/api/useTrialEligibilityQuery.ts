import { useQuery } from "@tanstack/react-query";

import { fetchTrialEligibleProductIds, isPurchasesAvailable } from "@/lib/revenuecat";

import { subscriptionQueryKeys } from "@/features/paywall/api/useSubscriptionQuery";

import type { PurchasesPackage } from "react-native-purchases";

/** Hiçbir ürünün uygun olmadığı, paylaşılan boş sonuç. */
const NONE: ReadonlySet<string> = new Set<string>();

/**
 * Bu kullanıcının ücretsiz denemeye hak kazandığı ürünler.
 *
 * NEDEN AYRI BİR SORGU: deneme iddiası (`readTrial`) ÜRÜNÜN giriş
 * fiyatından çıkıyor, ama giriş fiyatı ürüne bağlı — denemesini çoktan
 * kullanmış kullanıcıda da aynen geliyor. Ekranda "7 gün ücretsiz dene"
 * yazıp kullanıcıdan anında ücret çekmek yanıltıcı metadata olurdu
 * (Guideline 2.3.1). Uygunluğu yalnızca RevenueCat bilebiliyor.
 *
 * SORGU BAŞARISIZSA "UYGUN DEĞİL": `data` yokken çağıranlar boş kümeyi
 * kullanıyor, yani deneme iddiası hiç yazılmıyor. Kazanılmamış bir cümle
 * kaybedilmiş bir satır; yanlış bir cümle reddedilme sebebi.
 */
export function useTrialEligibilityQuery(packages: PurchasesPackage[] | undefined) {
  // Ürün kimlikleri anahtarın parçası: teklif değiştiğinde (onboarding
  // teklifi vs. varsayılan) eski yanıt yeniden kullanılmamalı.
  const productIds = [...new Set((packages ?? []).map((pkg) => pkg.product.identifier))].sort();

  return useQuery<ReadonlySet<string>>({
    queryKey: [...subscriptionQueryKeys.all, "trialEligibility", productIds],
    queryFn: () => fetchTrialEligibleProductIds(productIds),
    enabled: isPurchasesAvailable && productIds.length > 0,
    // Uygunluk kullanıcıya bağlı ve oturum içinde değişmiyor; satın alma
    // sonrası zaten paywall kapanıyor.
    staleTime: 10 * 60 * 1000,
  });
}

/** Sorgu henüz yanıtlamadıysa/başarısızsa: hiçbir ürün uygun değil. */
export function trialEligibilityOrNone(data: ReadonlySet<string> | undefined): ReadonlySet<string> {
  return data ?? NONE;
}
