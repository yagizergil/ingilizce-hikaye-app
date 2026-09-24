import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export interface BookWordOverlap {
  count: number;
  sample: string[];
}

/** RPC yanıtını savunmacı biçimde ayrıştırır (saf, testli). */
export function parseBookWordOverlap(raw: unknown): BookWordOverlap {
  const value = (raw ?? {}) as { count?: unknown; sample?: unknown };
  return {
    count: typeof value.count === "number" ? value.count : 0,
    sample: Array.isArray(value.sample)
      ? value.sample.filter((w): w is string => typeof w === "string")
      : [],
  };
}

/**
 * Kelime defterindeki kaç kelime bu kitapta geçiyor (1.0.6, ücretsiz,
 * migration 050). "Bu kitabın %87'sini biliyorsun" gibi bir skor bilerek
 * yapılmadı: kullanıcılar kelimeleri "biliyorum" diye nadiren işaretliyor,
 * skor sistematik olarak yanlış olurdu. Bu sayı ise doğrudan doğru.
 */
export function useBookWordOverlapQuery(bookId: string | undefined) {
  return useQuery({
    queryKey: ["library", "wordOverlap", bookId],
    enabled: Boolean(bookId),
    queryFn: async (): Promise<BookWordOverlap> => {
      const { data, error } = await supabase.rpc("book_saved_word_overlap", {
        p_book_id: bookId,
      });
      if (error) throw error;
      return parseBookWordOverlap(data);
    },
  });
}
