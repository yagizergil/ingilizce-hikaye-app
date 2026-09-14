import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface WordLookupQuota {
  isPremium: boolean;
  /** Günlük sınır; premium'da null (sınırsız). */
  limit: number | null;
  used: number;
  /** Kalan hak; premium'da null. */
  remaining: number | null;
}

interface ConsumeResult extends WordLookupQuota {
  allowed: boolean;
}

export const wordQuotaQueryKey = ["reader", "wordQuota"] as const;

/**
 * Günlük kelime çevirisi kotası (migration 038).
 *
 * KOTA SUNUCUDA SAYILIYOR, İSTEMCİDE DEĞİL: istemcide tutulan bir sayaç,
 * uygulamayı kapatıp açmakla ya da cihaz saatini değiştirmekle
 * sıfırlanabilirdi -- yani sınır olmazdı. Bu hook yalnızca sunucunun
 * söylediğini gösteriyor.
 */
export function useWordLookupQuotaQuery() {
  return useQuery({
    queryKey: wordQuotaQueryKey,
    queryFn: async (): Promise<WordLookupQuota> => {
      const { data, error } = await supabase.rpc("my_word_lookup_quota");
      if (error) throw error;
      return data as WordLookupQuota;
    },
    // Sayaç her dokunuşta değişiyor; ekrana dönüldüğünde taze olsun.
    staleTime: 10 * 1000,
  });
}

/**
 * Bir kelime çevirisi hakkı TÜKETİR.
 *
 * Tek çağrıda hem kontrol hem yazma yapılıyor (bkz. migration 038): "önce
 * sor, sonra yaz" iki ayrı istek olsaydı hızlı dokunuşlarda ikisi birden
 * sınırın altında cevap alıp ikisi de yazabilirdi.
 *
 * `allowed: false` dönerse çağıran taraf sözlüğü AÇMAMALI ve paywall'a
 * yönlendirmeli -- kararı sunucu veriyor, istemci yalnızca uyguluyor.
 */
export function useConsumeWordLookupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ConsumeResult> => {
      const { data, error } = await supabase.rpc("consume_word_lookup");
      if (error) throw error;
      return data as ConsumeResult;
    },
    onSuccess: (result) => {
      // Sayaç rozeti aynı anda güncelleniyor: ayrı bir sorgu turu beklemek,
      // kullanıcıya bir dokunuş boyunca eski sayıyı göstermek demekti.
      queryClient.setQueryData<WordLookupQuota>(wordQuotaQueryKey, {
        isPremium: result.isPremium,
        limit: result.limit,
        used: result.used,
        remaining: result.remaining,
      });
    },
  });
}
