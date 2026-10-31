import type { LifecycleStatus } from "@/features/subscription/lifecycle";

export type WinbackSource = "store_offer" | "sale" | "none";

/**
 * Winback'te hangi teklif kaynağının kullanılacağı (IZLENECEK-YOL §3.2-3.3):
 *  - lapsed_paid: App Store win-back / `lng_winback_promo`; yoksa `sale`.
 *  - lapsed_trial: yalnızca `sale` ürünü (win-back offer "en az bir dönem
 *    ödemiş" koşulu ister, promotional offer eski aboneye tasarlandı).
 * Hiçbiri yoksa "none": ekran yalnızca bilgilendirir ve planlara yönlendirir.
 */
export function winbackSourceFor(input: {
  status: LifecycleStatus | null;
  hasStoreOffer: boolean;
  hasSalePackage: boolean;
}): WinbackSource {
  if (input.status === "lapsed_paid" && input.hasStoreOffer) return "store_offer";
  if ((input.status === "lapsed_paid" || input.status === "lapsed_trial") && input.hasSalePackage) {
    return "sale";
  }
  return "none";
}
