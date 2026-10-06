import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { localDateKey } from "@/lib/localDate";

import { profileQueryKeys } from "@/features/profile/api/queryKeys";

import type { XpBreakdown } from "@/features/profile/xp";

function toInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Okur XP'si (migration 053, `get_user_xp`). Sunucu türetiyor; istemci
 * yazmıyor. Kısa `staleTime`: okuma/tekrar sonrası ekrana dönünce taze olsun.
 */
export function useXpQuery() {
  return useQuery({
    queryKey: profileQueryKeys.xp(),
    staleTime: 30_000,
    queryFn: async (): Promise<XpBreakdown> => {
      const { data, error } = await supabase.rpc("get_user_xp", { p_today: localDateKey() });
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      return {
        reading: toInt(row.reading),
        words: toInt(row.words),
        reviews: toInt(row.reviews),
        quiz: toInt(row.quiz),
        books: toInt(row.books),
        today: toInt(row.today),
      };
    },
  });
}
