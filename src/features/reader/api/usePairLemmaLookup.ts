import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchActiveLanguagePair } from "@/features/languagePair";
import { lemmaCandidates } from "@/features/reader/text/tokenizer";

import type { BookLemmaEntry } from "@/features/reader/api/useBookLemmaDictionary";

interface TranslationRow {
  lemma: string;
  pos: string | null;
  gloss: string | null;
  ipa: string | null;
  cefr_level: string | null;
  is_phrasal: boolean | null;
}

/**
 * `lemma_translations` önbelleğinden okuma -- AI'ya gitmeden önceki SON adım.
 *
 * ÇÖZDÜĞÜ SORUN: `translate-lemma` edge function'ı ürettiği karşılığı
 * zaten `lemma_translations`'a yazıyordu, ama İSTEMCİ o tabloyu HİÇ
 * okumuyordu -- yalnızca `lemma_canonical`'a bakıyordu ve o tablo
 * İngilizce-Türkçe sözlüğün kendisi. Sonuç: İngilizce-Türkçe dışındaki her
 * çiftte aynı kelimeye her dokunuşta yeniden AI çağrısı yapılıyordu.
 * Kullanıcı bunu "karşılık aranıyor" ekranının hiç bitmemesi olarak
 * görüyordu; faturası da her seferinde yeniden ödeniyordu.
 *
 * Artık zincir şu: kitap sözlüğü -> `lemma_canonical` -> BU ÖNBELLEK ->
 * AI. Bir kelime bir kez çevrildiğinde ikinci dokunuşta veritabanından
 * geliyor.
 *
 * `staleTime: Infinity`: bir çevirinin karşılığı zamanla değişmiyor ve
 * anahtar hem lemma'yı hem dil çiftini taşıyor.
 */
async function fetchPairLemma(lemma: string, surface: string | null) {
  const pair = await fetchActiveLanguagePair();

  const candidates: string[] = [];
  for (const candidate of lemmaCandidates(surface?.trim() || lemma)) {
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }
  if (!candidates.includes(lemma)) candidates.push(lemma);

  const { data, error } = await supabase
    .from("lemma_translations")
    .select("lemma, pos, gloss, ipa, cefr_level, is_phrasal")
    .eq("native_language", pair.nativeLanguage)
    .eq("target_language", pair.targetLanguage)
    .in("lemma", candidates);
  if (error) throw error;

  const rows = (data ?? []) as TranslationRow[];
  // Aday sırası bir önceliktir: önce hesaplanan kök, sonra yüzey biçimi.
  for (const candidate of candidates) {
    const match = rows.find((row) => row.lemma === candidate);
    if (!match?.gloss) continue;
    const entry: BookLemmaEntry = {
      pos: match.pos,
      cefrLevel: match.cefr_level,
      trGloss: match.gloss,
      ipa: match.ipa,
      audioUrl: null,
      isPhrasal: match.is_phrasal ?? false,
      falseFriendNoteTr: null,
    };
    return entry;
  }
  return null;
}

export function usePairLemmaLookup(lemma: string | null, surface: string | null = null) {
  return useQuery({
    queryKey: ["reader", "lemma", "pair", `${lemma ?? ""}|${surface ?? ""}`],
    queryFn: () => fetchPairLemma(lemma as string, surface),
    enabled: lemma !== null && lemma.length > 0,
    staleTime: Infinity,
  });
}
