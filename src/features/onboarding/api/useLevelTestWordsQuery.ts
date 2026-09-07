import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { CEFR_LEVELS, type CefrLevel, type LevelTestItem } from "@/features/onboarding/levelEstimate";

/** Her CEFR bandından kaç kelime sorulacak. 6 × 6 bant = 36 soru, ~60-90 sn. */
export const WORDS_PER_BAND = 6;

interface SampleRow {
  lemma: string;
  cefr_level: string;
  tr_gloss: string | null;
}

/**
 * Testin kelime setini getirir ve bantları karıştırır.
 *
 * Karıştırma önemli: kelimeler kolaydan zora sıralı gelirse kullanıcı
 * nerede olduğunu anlar ve cevabı buna göre ayarlar. Karışık sırada her
 * kelime bağımsız bir yargı oluyor.
 */
export async function fetchLevelTestWords(): Promise<LevelTestItem[]> {
  // `.returns<T[]>()` RPC üzerinde çalışmıyor (supabase-js tekil/dizi
  // ayrımını RPC'de çözemiyor), o yüzden sonuç elle daraltılıyor.
  const { data, error } = await supabase.rpc("sample_level_test_words", {
    per_band: WORDS_PER_BAND,
  });

  if (error) throw error;

  const rows = (Array.isArray(data) ? data : []) as SampleRow[];

  const items: LevelTestItem[] = rows
    .filter((row): row is SampleRow & { cefr_level: CefrLevel } =>
      CEFR_LEVELS.includes(row.cefr_level as CefrLevel),
    )
    .map((row) => ({
      lemma: row.lemma,
      level: row.cefr_level,
      trGloss: row.tr_gloss,
    }));

  return shuffle(items);
}

/** Fisher-Yates. Girdiyi değiştirmez. */
function shuffle<T>(input: T[]): T[] {
  const output = [...input];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = output[i];
    const b = output[j];
    if (a !== undefined && b !== undefined) {
      output[i] = b;
      output[j] = a;
    }
  }
  return output;
}

export function useLevelTestWordsQuery() {
  return useQuery({
    queryKey: ["onboarding", "levelTestWords"],
    queryFn: fetchLevelTestWords,
    // Test bir kez yapılıyor; ekran açıkken yeniden çekmek soruları
    // ortasından değiştirir.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
}
