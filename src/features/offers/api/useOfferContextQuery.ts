import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import storage from "@/lib/storage";
import { trackError } from "@/lib/analytics";

import { offersQueryKeys } from "@/features/offers/api/queryKeys";
import { parseServerContext } from "@/features/offers/rules/context";

import type { OfferServerContext } from "@/features/offers/rules/context";

const CONTEXT_CACHE_KEY = "offers.context.v1";

/**
 * Kural motorunun sunucu bağlamı (`paywall_context()`, migration 092).
 *
 * Çevrimdışıyken son bilinen yanıt kullanılıyor (kurulum anı ve deney
 * kovası değişmez; sayaçlar bayat olabilir). Hiç yanıt yoksa null: gün
 * bazlı ve deney kovasına bakan kurallar o zaman seçilmez -- "bilinmiyor"
 * hiçbir zaman "uygun" sayılmaz.
 */
export async function fetchOfferContext(): Promise<OfferServerContext | null> {
  try {
    const { data, error } = await supabase.rpc("paywall_context");
    if (error) throw error;
    const parsed = parseServerContext(data);
    if (parsed) {
      try {
        await storage.setItem(CONTEXT_CACHE_KEY, JSON.stringify(data));
      } catch (storageError) {
        trackError("offers.context.cacheWrite", storageError);
      }
      return parsed;
    }
  } catch (error) {
    trackError("offers.context.fetch", error);
  }

  try {
    const cached = await storage.getItem(CONTEXT_CACHE_KEY);
    if (cached) return parseServerContext(JSON.parse(cached));
  } catch (error) {
    trackError("offers.context.cacheRead", error);
  }
  return null;
}

export function useOfferContextQuery() {
  return useQuery({
    queryKey: offersQueryKeys.context(),
    queryFn: fetchOfferContext,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
