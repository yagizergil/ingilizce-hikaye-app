import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";
import { flushOfflineWordLookups, saveQuotaSnapshot } from "@/features/reader/api/wordLookupLedger";

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

async function rpcConsumeWordLookup(): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc("consume_word_lookup");
  if (error) throw error;
  return data as ConsumeResult;
}

/**
 * Çevrimdışıyken açılan kartların borcunu sunucuya yazar (wordLookupLedger).
 * Başarısızlık sorguyu düşürmez: borç kuyrukta kalır, sonraki denemede gider.
 */
async function settleOfflineLookups(): Promise<void> {
  try {
    await flushOfflineWordLookups(rpcConsumeWordLookup);
  } catch (error) {
    trackError("reader.wordQuota.flush", error);
  }
}

/** Son kota bilgisi çevrimdışı karar için saklanıyor; yazılamazsa loglanır. */
function rememberQuota(quota: WordLookupQuota): void {
  void saveQuotaSnapshot(quota).catch((error: unknown) =>
    trackError("reader.wordQuota.snapshot", error),
  );
}

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
      // Önce çevrimdışı borçlar: gösterilen sayı onları da içersin.
      await settleOfflineLookups();
      const { data, error } = await supabase.rpc("my_word_lookup_quota");
      if (error) throw error;
      const quota = data as WordLookupQuota;
      rememberQuota(quota);
      return quota;
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
      // Bekleyen çevrimdışı borç yoksa bu yalnızca bir depo okuması.
      await settleOfflineLookups();
      return rpcConsumeWordLookup();
    },
    onSuccess: (result) => {
      // Sayaç rozeti aynı anda güncelleniyor: ayrı bir sorgu turu beklemek,
      // kullanıcıya bir dokunuş boyunca eski sayıyı göstermek demekti.
      const quota: WordLookupQuota = {
        isPremium: result.isPremium,
        limit: result.limit,
        used: result.used,
        remaining: result.remaining,
      };
      queryClient.setQueryData<WordLookupQuota>(wordQuotaQueryKey, quota);
      rememberQuota(quota);
    },
  });
}

/**
 * Cümleye uzun basıldığında kart açılmadan paywall'a mı gidilmeli?
 *
 * Ücretsiz katmanda kelime ve cümle çevirisi aynı günlük hakkı paylaşıyor
 * (migration 057). Yalnızca sunucunun BİLDİRDİĞİ sıfırda erken yönlendirme;
 * kota bilinmiyorsa (yükleniyor/hata) kart açılır ve karar sunucuda verilir.
 */
export function shouldOpenSentencePaywall(quota: WordLookupQuota | undefined): boolean {
  if (!quota || quota.isPremium) return false;
  return quota.remaining === 0;
}
