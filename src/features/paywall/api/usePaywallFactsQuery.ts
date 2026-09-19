import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface PaywallFacts {
  /** Yayında kitap sayısı — sosyal kanıt satırı. */
  bookCount: number;
  /** Ücretsiz katmanın günlük AI cümle çevirisi kotası. */
  aiFreeLimit: number;
  /** Premium'un günlük AI cümle çevirisi kotası. */
  aiPremiumLimit: number;
  /**
   * Ücretsiz katmanın günlük KELİME çevirisi kotası (migration 038).
   * Aynı gerekçe: sınır sunucuda tanımlı, paywall metni onu okuyor --
   * çeviri dosyasına yazılsaydı sınır iki yerde yaşardı.
   */
  freeWordLookups: number;
  /**
   * Kullanıcının KENDİ son 7 günü. Hepsi null olabilir: sorgu başarısızsa
   * ya da kullanıcının hiç geçmişi yoksa paywall bu bloğu HİÇ göstermiyor
   * (bkz. `PaywallActivity`). Sıfır yazan bir "başarı" bloğu, satılan şeyin
   * değersiz olduğunu söylemek olurdu.
   */
  activity: PaywallActivityFacts | null;
}

export interface PaywallActivityFacts {
  /** Son 7 günde okunan gün sayısı. */
  daysRead: number;
  /** Son 7 günde çevrilen kelime sayısı. */
  wordsLookedUp: number;
  /** Deftere kaydedilmiş toplam kelime. */
  wordsSaved: number;
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
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [books, quota, wordQuota, lookups, saved, readingDays] = await Promise.all([
        supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.rpc("my_ai_sentence_quota"),
        supabase.rpc("my_word_lookup_quota"),
        // Kelime çevirisi sayacı zaten burada tutuluyor (migration 038'in
        // `my_word_lookup_quota`'sı da aynı tabloyu sayıyor).
        supabase
          .from("ai_usage")
          .select("id", { count: "exact", head: true })
          .eq("feature", "word_lookup")
          .gte("created_at", sevenDaysAgo),
        supabase.from("user_saved_words").select("id", { count: "exact", head: true }),
        supabase
          .from("user_reading_stats")
          .select("date")
          .gt("minutes", 0)
          .gte("date", sevenDaysAgo.slice(0, 10)),
      ]);

      if (books.error) throw books.error;

      const shape = (quota.data ?? {}) as QuotaShape;
      const wordShape = (wordQuota.data ?? {}) as QuotaShape;

      /**
       * Etkinlik bloğu YALNIZCA gerçek bir geçmiş varsa doluyor. Üç sorgudan
       * herhangi biri hata verirse (RLS, ağ) blok hiç gösterilmiyor -- eksik
       * bir sayı göstermektense hiç göstermemek doğru taraf.
       */
      const activityFailed = Boolean(lookups.error || saved.error || readingDays.error);
      const daysRead = new Set((readingDays.data ?? []).map((row) => row.date as string)).size;
      const wordsLookedUp = lookups.count ?? 0;
      const wordsSaved = saved.count ?? 0;
      const hasHistory = daysRead > 0 || wordsLookedUp > 0 || wordsSaved > 0;

      return {
        bookCount: books.count ?? 0,
        aiFreeLimit: typeof shape.freeLimit === "number" ? shape.freeLimit : 0,
        aiPremiumLimit: typeof shape.premiumLimit === "number" ? shape.premiumLimit : 0,
        freeWordLookups: typeof wordShape.freeLimit === "number" ? wordShape.freeLimit : 0,
        activity: activityFailed || !hasHistory ? null : { daysRead, wordsLookedUp, wordsSaved },
      };
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
