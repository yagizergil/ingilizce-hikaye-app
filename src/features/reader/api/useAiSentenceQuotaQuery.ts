import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface AiSentenceQuota {
  isPremium: boolean;
  limit: number;
  used: number;
  remaining: number;
}

interface RawQuota {
  isPremium?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
}

/**
 * FAZ 6 (2026-09-14, referans uygulama eşleştirmesi): reader'ın üst ikon
 * çubuğundaki mavi "kalan çeviri hakkı" rozeti için. Sunucu tarafı zaten
 * bu veriyi hesaplıyordu (`my_ai_sentence_quota()`, migration 029) ama
 * yalnızca paywall'daki sabit limit sayıları için okunuyordu
 * (`usePaywallFactsQuery`) -- `remaining`/`used` hiçbir yerde
 * gösterilmiyordu. Referans bunu okuma sırasında sürekli görünür bir
 * sayaç yapıyor; aynı RPC'yi burada da okuyoruz, sınırı ikinci kez
 * tanımlamadan.
 *
 * `staleTime` kısa: kullanıcı bir cümle çevirisi yaptıkça sayı düşüyor,
 * `useSentenceTranslationQuery` başarılı her çeviriden sonra bu query'i
 * invalidate ediyor (bkz. o dosyanın yorumu) -- staleTime asıl olarak
 * "aynı okuma oturumunda gereksiz tekrar sorgu" önlemek için var.
 */
export function useAiSentenceQuotaQuery() {
  return useQuery({
    queryKey: ["reader", "aiSentenceQuota"],
    queryFn: async (): Promise<AiSentenceQuota> => {
      const { data, error } = await supabase.rpc("my_ai_sentence_quota");
      if (error) throw error;

      const shape = (data ?? {}) as RawQuota;
      return {
        isPremium: shape.isPremium ?? false,
        limit: shape.limit ?? 0,
        used: shape.used ?? 0,
        remaining: shape.remaining ?? 0,
      };
    },
    staleTime: 30_000,
    retry: false,
  });
}
