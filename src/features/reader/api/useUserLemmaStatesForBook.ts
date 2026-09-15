import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { readerQueryKeys } from "@/features/reader/api/queryKeys";

interface RawLemmaStateRow {
  lemma: string;
  state: string;
}

/**
 * "Unknown" here means: a lemma the user has never seen before OR has
 * explicitly not progressed past `new` — used to drive the reader's
 * `.unknown` highlight. Scoped to the current user the same way
 * useSavedWordsQuery.ts's mutations do it: `user_lemma_state` also carries
 * RLS, but the existing convention in this codebase (see
 * useSaveWordMutation) is to resolve `supabase.auth.getUser()` and filter
 * explicitly rather than rely on RLS alone, so that's mirrored here.
 */
/** Same URL-length reasoning as useBookLemmaDictionary.ts's LEMMA_CHUNK_SIZE
 * — this hook also receives a whole book's lemma list (up to several
 * thousand for larger books), so its `.in()` call needs the same chunking
 * or it silently fails the same way for exactly the same books. */
const LEMMA_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchUnknownLemmas(lemmas: string[]): Promise<Set<string>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");

  const lemmaChunks = chunk(lemmas, LEMMA_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    lemmaChunks.map(async (lemmaChunk) => {
      const { data, error } = await supabase
        .from("user_lemma_state")
        .select("lemma, state")
        .eq("user_id", userData.user.id)
        .in("lemma", lemmaChunk);
      if (error) throw error;
      return (data ?? []) as RawLemmaStateRow[];
    }),
  );

  const nonNewLemmas = new Set(
    chunkResults
      .flat()
      .filter((row) => row.state !== "new")
      .map((row) => row.lemma),
  );

  const unknown = new Set<string>();
  for (const lemma of lemmas) {
    if (!nonNewLemmas.has(lemma)) unknown.add(lemma);
  }
  return unknown;
}

/**
 * Returns the set-difference: every lemma in `lemmas` minus the ones that
 * have a `user_lemma_state` row whose `state` is not `'new'` (i.e. the
 * user is already learning or already knows it). A lemma with no row at
 * all counts as unknown, same as a lemma explicitly stored as `'new'`.
 */
export function useUserLemmaStatesForBook(lemmas: string[]) {
  return useQuery({
    queryKey: readerQueryKeys.userLemmaStates(lemmas),
    /**
     * BOŞ LİSTE SORGUYU DEVRE DIŞI BIRAKMIYOR, BOŞ KÜME DÖNDÜRÜYOR.
     *
     * ÇÖZÜLEN HATA (2026-09-15): burada `enabled: lemmas.length > 0`
     * vardı. Kelime sözlüğü olmayan bir kitapta (`book_lemmas` boş --
     * yeni eklenen 120 klasiğin hepsi böyleydi) sorgu hiç çalışmıyor,
     * `data` sonsuza kadar `undefined` kalıyordu. `ReaderScreen` ise
     * `!unknownLemmas` iken yükleme ekranını gösteriyor, yani okuyucu
     * ASLA açılmıyordu -- kullanıcı "oku"ya basıyor ve dönen bir
     * göstergeden başka bir şey görmüyordu.
     *
     * Sözlüğü olmayan kitap okunabilir olmalı: kelimeye dokunma zaten
     * genel sözlüğe ve AI'a düşüyor (bkz. WordSheet'in üç katmanlı
     * araması). Eksik sözlük bir eksiklik, okumayı engelleyen bir hata
     * değil.
     */
    queryFn: () => (lemmas.length === 0 ? Promise.resolve(new Set<string>()) : fetchUnknownLemmas(lemmas)),
    staleTime: 60 * 1000,
  });
}
