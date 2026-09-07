import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface PaywallFacts {
  /** Yayında kitap sayısı — sosyal kanıt satırı. */
  bookCount: number;
  /** Ücretsiz katmanın günlük AI cümle çevirisi kotası. */
  aiFreeLimit: number;
  /** Premium'un günlük AI cümle çevirisi kotası. */
  aiPremiumLimit: number;
}

interface QuotaShape {
  freeLimit?: number;
  premiumLimit?: number;
}

/**
 * Paywall'da gösterilen HER SAYININ tek kaynağı.
 *
 * NEDEN SORGULANIYOR, ARAYÜZ METNİNE GÖMÜLMÜYOR:
 *  - "85 hikâye" gibi bir sayıyı i18n dosyasına yazmak, katalog büyüdüğü
 *    anda yanlış bir iddiaya dönüşür.
 *  - AI kotaları (ücretsiz 10 / premium 200) migration 029'daki
 *    `ai_sentence_daily_limit()` fonksiyonunda tanımlı. Aynı sayıları
 *    çeviri dosyasına da yazmak, sınırın iki yerde yaşaması demek olurdu;
 *    biri değiştiğinde paywall sessizce yalan söylerdi.
 *
 * NEDEN TEK SORGU: iki ayrı hook, paywall açılışında iki ayrı yükleme
 * durumu ve iki ayrı hata yolu demekti.
 *
 * Sorgu başarısız olursa ilgili satırlar hiç gösterilmez — paywall bir
 * sayı uğruna bekletilmiyor.
 */
export function usePaywallFactsQuery() {
  return useQuery({
    queryKey: ["paywall", "facts"],
    queryFn: async (): Promise<PaywallFacts> => {
      const [books, quota] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.rpc("my_ai_sentence_quota"),
      ]);

      if (books.error) throw books.error;

      const shape = (quota.data ?? {}) as QuotaShape;

      return {
        bookCount: books.count ?? 0,
        aiFreeLimit: typeof shape.freeLimit === "number" ? shape.freeLimit : 0,
        aiPremiumLimit: typeof shape.premiumLimit === "number" ? shape.premiumLimit : 0,
      };
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
