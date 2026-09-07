import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { readerQueryKeys } from "@/features/reader/api/queryKeys";
import { lemmaCandidates } from "@/features/reader/text/tokenizer";

import type { BookLemmaEntry } from "@/features/reader/api/useBookLemmaDictionary";

interface RawSenseRow {
  pos: string | null;
  tr_gloss: string | null;
}

interface RawCanonicalRow {
  pos: string | null;
  cefr_level: string | null;
  tr_gloss: string | null;
  ipa: string | null;
  audio_url: string | null;
  is_phrasal: boolean | null;
  false_friend_note_tr: string | null;
  senses: RawSenseRow[] | null;
}

function toEntry(row: RawCanonicalRow): BookLemmaEntry {
  return {
    pos: row.pos,
    cefrLevel: row.cefr_level,
    trGloss: row.tr_gloss,
    ipa: row.ipa,
    audioUrl: row.audio_url,
    isPhrasal: row.is_phrasal ?? false,
    falseFriendNoteTr: row.false_friend_note_tr,
    senses: (row.senses ?? []).map((sense) => ({ pos: sense.pos, trGloss: sense.tr_gloss })),
  };
}

/**
 * Sözlükte aranacak adaylar, öncelik sırasıyla.
 *
 * ÇÖZÜLEN SORUN (2026-09-07): kullanıcı bazı kelimelerde "karşılık
 * bulunamadı" görüyordu. Ölçüm: yayındaki kitaplarda geçen 23.551
 * lemma'nın **sıfırı** sözlükte eksik. Yani sorun sözlük değil, cihazdaki
 * kural tabanlı lemmatizer'ın yanlış kök üretmesi (ADR-008).
 *
 * Aday üretimi tek bir yerde — `tokenizer.js`'teki `lemmaCandidates` —
 * çünkü kitap sözlüğü (WordSheet) ve buradaki genel sözlük AYNI adayları
 * denemeli; iki ayrı liste tutmak, birini düzeltip diğerini unutmak
 * demekti. Burada yalnızca hesaplanan lemma da ekleniyor: çağıran taraf
 * yüzey biçimini veremiyorsa (eski çağrılar) yine çalışsın.
 */
function lookupCandidates(lemma: string, surface: string | null): string[] {
  const normalizedLemma = lemma.toLowerCase().trim();
  const candidates: string[] = [];

  for (const candidate of lemmaCandidates(surface?.trim() || normalizedLemma)) {
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }
  if (normalizedLemma && !candidates.includes(normalizedLemma)) {
    candidates.push(normalizedLemma);
  }

  return candidates;
}

async function fetchGlobalLemma(
  lemma: string,
  surface: string | null,
): Promise<BookLemmaEntry | null> {
  const candidates = lookupCandidates(lemma, surface);

  const { data, error } = await supabase
    .from("lemma_canonical")
    .select("lemma, pos, cefr_level, tr_gloss, ipa, audio_url, is_phrasal, false_friend_note_tr, senses")
    .in("lemma", candidates);
  if (error) throw error;

  const rows = (data ?? []) as (RawCanonicalRow & { lemma: string })[];
  // Aday sırası bir önceliktir: önce hesaplanan kök, sonra yüzey biçimi.
  for (const candidate of candidates) {
    const match = rows.find((row) => row.lemma === candidate);
    if (match) return toEntry(match);
  }
  return null;
}

/**
 * Point lookup against `lemma_canonical` for a single lemma that missed the
 * current book's prefetched `useBookLemmaDictionary` (see that hook's doc
 * comment for why `book_lemmas` deliberately excludes trivial function
 * words like "the"/"and"/"my" — this hook is the fallback that still
 * resolves those, and any other lemma present in the global table but not
 * tracked as "vocabulary worth learning" for this specific book).
 *
 * Deliberately NOT a re-fetch of the whole book dictionary: `lemma_canonical`
 * is a large global table, so this only ever fetches the single missed
 * lemma. `staleTime: Infinity` mirrors useBookLemmaDictionary.ts's
 * reasoning -- `lemma_canonical` rows are static content once published,
 * and the query key includes the lemma so repeated taps on the same missed
 * word are served from cache instead of re-hitting the network.
 */
export function useGlobalLemmaLookup(lemma: string | null, surface: string | null = null) {
  return useQuery({
    queryKey: readerQueryKeys.globalLemmaLookup(`${lemma ?? ""}|${surface ?? ""}`),
    queryFn: () => fetchGlobalLemma(lemma as string, surface),
    enabled: lemma !== null && lemma.length > 0,
    staleTime: Infinity,
  });
}
