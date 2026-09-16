import { supabase } from "@/lib/supabase";

export interface LemmaGlossEntry {
  gloss: string | null;
  pos: string | null;
  cefrLevel: string | null;
}

/**
 * Aynı sınır sorunu -- bkz. useBookLemmaDictionary.ts'teki `LEMMA_CHUNK_SIZE`
 * yorumu: Supabase JS `.in()` filtresini GET query-string olarak gönderiyor,
 * uzun bir lemma listesi URL'i güvenli olmayan bir uzunluğa taşıyabilir.
 * Kelime defteri/tekrar listeleri bir kitabın tüm kelime dağarcığı kadar
 * büyük olmasa da (kullanıcının KENDİ kaydettiği kelimeler), aynı savunmayı
 * ucuza uygulamak riski baştan kapatıyor.
 */
const LEMMA_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Bir grup lemma için TOPLU karşılık çeker -- kelime defteri ("Kelimelerim")
 * ve aralıklı tekrar ekranları için.
 *
 * ÇÖZÜLEN KRİTİK HATA (kullanıcı bulgusu, 2026-09-16): `useVocabularyQuery`
 * ve `useDueCardsQuery` `lemma_canonical.tr_gloss`'u KOŞULSUZ okuyordu --
 * WordSheet.tsx'teki dil-çiftine-duyarlı zincir (bkz. o dosyanın
 * `nativeIsTurkish` ayrımı) yalnızca OKURKEN gösterilen anlık karşılığı
 * düzeltmişti, kaydedilen kelimenin SONRADAN listelerde nasıl gösterileceği
 * hâlâ ayrı, düzeltilmemiş bir koddu. Sonuç: ana dili Rusça olan bir
 * kullanıcı İngilizce bir kitapta doğru (Rusça) karşılığı görüp kelimeyi
 * kaydettiğinde, "Kelimelerim" ekranında aynı kelimenin TÜRKÇE karşılığı
 * çıkıyordu.
 *
 * TEK KAYNAK: WordSheet'in canlı-AI-fallback zincirinin (bookEntry ->
 * globalEntry -> pairEntry -> liveEntry) AI ile ürettiği her karşılık zaten
 * `lemma_translations`'a yazılıyor (bkz. translate-lemma edge function).
 * Bu fonksiyon o ÖNCEDEN ÇÖZÜLMÜŞ karşılıkları okuyor -- burada canlı bir AI
 * çağrısı YAPILMIYOR (liste ekranlarında onlarca kelime için bunu yapmak ne
 * maliyet ne gecikme açısından savunulabilir olurdu; bir kelime WordSheet'te
 * hiç açılmadan doğrudan kaydedilemediği için -- kaydetme her zaman
 * WordSheet üzerinden olur -- karşılığın burada zaten var olması beklenir).
 *
 * ADR-013 ile aynı ayrım: ana dil Türkçe VE hedef İngilizce ise
 * `lemma_canonical` (birincil, 26.000+ kelimelik üretim sözlüğü);
 * başka HER (ana dil, hedef dil) çiftinde `lemma_translations` (migration
 * 033'teki genel önbellek).
 */
export async function fetchLemmaGlossesBatch(
  lemmas: string[],
  nativeLanguage: string,
  targetLanguage: string,
): Promise<Map<string, LemmaGlossEntry>> {
  const map = new Map<string, LemmaGlossEntry>();
  if (lemmas.length === 0) return map;

  const lemmaChunks = chunk(lemmas, LEMMA_CHUNK_SIZE);

  if (nativeLanguage === "tr" && targetLanguage === "en") {
    const results = await Promise.all(
      lemmaChunks.map(async (lemmaChunk) => {
        const { data, error } = await supabase
          .from("lemma_canonical")
          .select("lemma, pos, cefr_level, tr_gloss")
          .in("lemma", lemmaChunk);
        if (error) throw error;
        return data ?? [];
      }),
    );
    for (const row of results.flat()) {
      map.set(row.lemma, { gloss: row.tr_gloss, pos: row.pos, cefrLevel: row.cefr_level });
    }
    return map;
  }

  const results = await Promise.all(
    lemmaChunks.map(async (lemmaChunk) => {
      const { data, error } = await supabase
        .from("lemma_translations")
        .select("lemma, pos, cefr_level, gloss")
        .eq("native_language", nativeLanguage)
        .eq("target_language", targetLanguage)
        .in("lemma", lemmaChunk);
      if (error) throw error;
      return data ?? [];
    }),
  );
  for (const row of results.flat()) {
    map.set(row.lemma, { gloss: row.gloss, pos: row.pos, cefrLevel: row.cefr_level });
  }
  return map;
}
