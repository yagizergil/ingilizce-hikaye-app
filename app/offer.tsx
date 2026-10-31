import { useCallback } from "react";

import { router, useLocalSearchParams } from "expo-router";

import { SaleOfferScreen } from "@/features/offers";
import { ErrorBoundary } from "@/components/ui";

import type { RuleTrigger } from "@/features/offers";

/**
 * Kural motorunun açtığı indirim ekranı (`/offer?rule=sale_d2`).
 * Teklif kurulamazsa (App Store'da indirimli ürün / RevenueCat'te `sale`
 * offering'i yok) aynı yerde normal paywall'a geçilir (replace: geri tuşu
 * boş bir teklif ekranına dönmesin); kaskadda ise yalnızca kapanır.
 */
export default function OfferRoute() {
  const { rule } = useLocalSearchParams<{ rule?: string }>();
  const close = useCallback(() => router.back(), []);
  const fallback = useCallback((source: string, trigger: RuleTrigger) => {
    if (trigger === "paywall_closed") {
      router.back();
      return;
    }
    router.replace(`/paywall?source=${encodeURIComponent(source)}`);
  }, []);

  return (
    <ErrorBoundary source="offer">
      <SaleOfferScreen ruleId={rule ?? ""} onClose={close} onFallback={fallback} />
    </ErrorBoundary>
  );
}
