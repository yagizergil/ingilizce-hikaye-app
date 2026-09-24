import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { vocabularyQueryKeys } from "@/features/vocabulary/api/queryKeys";

export interface SmartPracticeQuota {
  isPremium: boolean;
  /** Ücretsiz kullanıcıya kalan deneme oturumu; premium'da null (sınırsız). */
  remaining: number | null;
}

interface QuotaRow {
  isPremium: boolean;
  remaining: number | null;
}

/**
 * Akıllı Tekrar hakkı -- karar sunucuda (migration 049). Kelimelerim
 * ekranındaki kart "bugün 1 ücretsiz deneme" / "premium" bilgisini buradan
 * gösteriyor.
 */
export function useSmartPracticeQuotaQuery() {
  return useQuery({
    queryKey: vocabularyQueryKeys.smartPracticeQuota(),
    queryFn: async (): Promise<SmartPracticeQuota> => {
      const { data, error } = await supabase.rpc("my_smart_practice_quota");
      if (error) throw error;
      const row = data as QuotaRow;
      return { isPremium: row.isPremium, remaining: row.remaining };
    },
  });
}

/** Oturum açılırken bir hak tüketir; izin yoksa `allowed: false`. */
export async function consumeSmartPractice(): Promise<{ allowed: boolean }> {
  const { data, error } = await supabase.rpc("consume_smart_practice");
  if (error) throw error;
  return { allowed: (data as { allowed: boolean }).allowed };
}
