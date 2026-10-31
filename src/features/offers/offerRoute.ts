import type { Href } from "expo-router";

import type { Rule } from "@/features/offers/types";

/**
 * Seçilen kuralın açılacağı rota; rotası olmayan sunum (kart, sheet) için
 * null -- onları çağıran ekran kendisi çiziyor.
 */
export function offerRoute(rule: Rule): Href | null {
  if (rule.action.kind === "sale" && rule.presentation === "fullscreen") {
    return `/offer?rule=${encodeURIComponent(rule.id)}`;
  }
  return null;
}
