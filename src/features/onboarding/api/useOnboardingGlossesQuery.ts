import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Onboarding'de seçilen kelimelerin karşılıkları.
 *
 * NEDEN AYRI BİR SORGU: kelime kartı (`WordSheet`) karşılığı ekranda
 * gösteriyor ama çağırana GERİ VERMİYOR -- kaydetme geri çağrısı yalnızca
 * "kaydedildi" diyor. Kartın arayüzünü yalnızca onboarding için
 * genişletmek, uygulamanın her yerinde kullanılan bir bileşeni tek bir
 * ekran uğruna değiştirmek olurdu. Karşılıkları burada ayrıca okumak hem
 * daha ucuz hem daha az riskli.
 *
 * İKİ KAYNAK: Türkçe ana dil + İngilizce hedef için birincil kaynak hâlâ
 * `lemma_canonical` (26.100 kelimelik, üretimde kanıtlanmış tablo).
 * Diğer bütün çiftler için migration 033'teki genel `lemma_translations`
 * önbelleği -- bkz. ADR-013.
 */
export type OnboardingGlosses = Map<string, string>;

async function fetchGlosses(
  lemmas: string[],
  targetLanguage: string,
  nativeLanguage: string,
): Promise<OnboardingGlosses> {
  const result: OnboardingGlosses = new Map();
  if (lemmas.length === 0) return result;

  if (targetLanguage === "en" && nativeLanguage === "tr") {
    const { data, error } = await supabase
      .from("lemma_canonical")
      .select("lemma, tr_gloss")
      .in("lemma", lemmas);
    if (error) throw error;
    for (const row of data ?? []) {
      const gloss = (row.tr_gloss as string | null) ?? null;
      if (gloss) result.set(row.lemma as string, gloss);
    }
    return result;
  }

  const { data, error } = await supabase
    .from("lemma_translations")
    .select("lemma, gloss")
    .eq("target_language", targetLanguage)
    .eq("native_language", nativeLanguage)
    .in("lemma", lemmas);
  if (error) throw error;
  for (const row of data ?? []) {
    const gloss = (row.gloss as string | null) ?? null;
    if (gloss) result.set(row.lemma as string, gloss);
  }
  return result;
}

export function useOnboardingGlossesQuery(
  lemmas: string[],
  targetLanguage: string | null,
  nativeLanguage: string | null,
) {
  const key = [...lemmas].sort().join(",");
  return useQuery({
    queryKey: ["onboarding", "glosses", targetLanguage, nativeLanguage, key],
    queryFn: () => fetchGlosses(lemmas, targetLanguage as string, nativeLanguage as string),
    enabled: lemmas.length > 0 && Boolean(targetLanguage) && Boolean(nativeLanguage),
    staleTime: Infinity,
  });
}
