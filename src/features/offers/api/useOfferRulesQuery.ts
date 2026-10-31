import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import storage from "@/lib/storage";
import { trackError } from "@/lib/analytics";

import { offersQueryKeys } from "@/features/offers/api/queryKeys";
import { parseRules } from "@/features/offers/rules/engine";
import defaultRules from "@/features/offers/rules/defaultRules.json";

import type { ConfigFetchState, Rule } from "@/features/offers/types";

const RULES_CACHE_KEY = "offers.rules.v1";

export interface OfferRules {
  rules: Rule[];
  /** Kuralların nereden geldiği (`config_fetch_state`, rapor C14). */
  source: ConfigFetchState;
}

/** Uygulama paketindeki kopya -- sunucu ve önbellek yoksa. */
export function embeddedRules(): Rule[] {
  return parseRules(defaultRules);
}

/**
 * Teklif kuralları: sunucu -> AsyncStorage önbelleği -> gömülü kopya.
 *
 * HİÇ FIRLATMAZ: kural motoru çevrimdışı da çalışmalı (rapor C6 adım 1).
 * Sunucu hatası bir "teklif yok" sebebi değil; son bilinen kurallara, o da
 * yoksa paketle gelenlere düşülüyor. Sunucudan boş liste gelmesi ise GERÇEK
 * bir cevap (bütün kurallar kapatılmış) ve aynen uygulanıyor.
 */
export async function fetchOfferRules(): Promise<OfferRules> {
  try {
    const { data, error } = await supabase
      .from("paywall_rules")
      .select(
        "id, trigger, presentation, rank, conditions, action, cooldown_hours, max_shows, exempt_global_cooldown, min_app_version",
      )
      .eq("app", "lingo");
    if (error) throw error;
    const rows: unknown[] = data ?? [];
    try {
      await storage.setItem(RULES_CACHE_KEY, JSON.stringify(rows));
    } catch (storageError) {
      trackError("offers.rules.cacheWrite", storageError);
    }
    return { rules: parseRules(rows), source: "backend" };
  } catch (error) {
    trackError("offers.rules.fetch", error);
  }

  try {
    const cached = await storage.getItem(RULES_CACHE_KEY);
    if (cached) return { rules: parseRules(JSON.parse(cached)), source: "cache" };
  } catch (error) {
    trackError("offers.rules.cacheRead", error);
  }
  return { rules: embeddedRules(), source: "fallback" };
}

export function useOfferRulesQuery() {
  return useQuery({
    queryKey: offersQueryKeys.rules(),
    queryFn: fetchOfferRules,
    staleTime: 30 * 60 * 1000,
    // Hata zaten içeride yedeklere çevriliyor.
    retry: false,
  });
}
