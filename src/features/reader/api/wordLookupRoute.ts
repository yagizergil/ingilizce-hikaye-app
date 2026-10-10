/**
 * Bir kelime dokunuşunun HANGİ kaynaktan çözüleceğine karar verir.
 *
 * KÖK SEBEP (2026-10-10, kullanıcı bulgusu): Fransızca kitapta "au" ->
 * "altın", "Sa" -> "bilinmeyen kısaltma". WordSheet yalnızca ana dilin
 * Türkçe olup olmadığına bakıyor, HEDEF dile bakmadan İngilizce-Türkçe
 * sözlüğe (`book_lemmas` -> `lemma_canonical`) gidiyordu. Fransızca
 * metindeki token'ların %47'si o sözlükte bir İngilizce girdiye çarpıyordu.
 *
 * Kural: İngilizce-Türkçe sözlük YALNIZCA (hedef = en, ana = tr) çiftinde
 * kullanılır. Diğer her çift cümle bağlamında `translate-lemma`'ya gider.
 * Çift henüz bilinmiyorsa hiçbir kaynak denenmez ("pending").
 */
export type WordLookupRoute = "pending" | "en-tr-dictionary" | "contextual";

export interface LookupPair {
  nativeLanguage: string;
  targetLanguage: string;
}

export function wordLookupRoute(pair: LookupPair | null | undefined): WordLookupRoute {
  if (!pair) return "pending";
  if (pair.targetLanguage === "en" && pair.nativeLanguage === "tr") return "en-tr-dictionary";
  return "contextual";
}
