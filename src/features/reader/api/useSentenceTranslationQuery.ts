import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

interface TranslateSentenceResponse {
  status: "ok" | "unavailable";
  translation?: string;
  reason?: string;
}

export interface SentenceTranslationResult {
  translation: string;
}

/**
 * Cümle çevirisi (item 5): kullanıcı WordSheet'teki örnek cümlenin altında
 * toggle ikonuna basınca `translate-sentence` Edge Function'ını çağırır.
 * `enabled: false` ile başlar -- ilk tıklamada `refetch()` tetiklenir; aynı
 * cümle için sheet açık kaldığı sürece TanStack Query'nin normal cache'i
 * sonucu tutar, tekrar tıklamak yeni bir API çağrısı yapmaz (queryKey
 * `sentence` metnine bağlı, `staleTime: Infinity` ile bu oturumda asla
 * bayatlamaz).
 *
 * Sonuç DB'ye yazılmaz (Edge Function tarafında da yok) -- cümleye özgü,
 * tekrar kullanılabilirliği düşük bir çeviri, kalıcı bir tabloya değmez.
 */
export function useSentenceTranslationQuery(sentence: string | null) {
  return useQuery({
    queryKey: ["reader", "sentenceTranslation", sentence],
    queryFn: async (): Promise<SentenceTranslationResult> => {
      if (!sentence) throw new Error("sentence_translation_missing_sentence");

      const { data, error } = await supabase.functions.invoke<TranslateSentenceResponse>(
        "translate-sentence",
        { body: { sentence } },
      );

      if (error) {
        throw new Error("sentence_translation_request_failed");
      }
      if (!data || data.status !== "ok" || !data.translation) {
        const reason = data?.reason ?? "sentence_translation_unavailable";

        // Kota tavanına çarpmak bir HATA değil, bir ÜRÜN SİNYALİ: ücretsiz
        // katmanın günlük 10 çevirisi kaç kişiye yetmiyor? Premium'un
        // gerçekten çözdüğü bir sıkıntı mı, yoksa kimsenin çarpmadığı bir
        // tavan mı? Bu ölçülmeden paywall metni tahmine dayanır.
        // (Bkz. docs/plans/2026-09-07-buyume-onerileri.md, Ö12.)
        if (reason === "free_tier_daily_limit" || reason === "rate_limited") {
          trackEvent("ai_quota_exhausted", { reason });
        }

        throw new Error(reason);
      }

      return { translation: data.translation };
    },
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });
}
