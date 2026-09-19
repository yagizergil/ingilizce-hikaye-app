import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { readerQueryKeys } from "@/features/reader/api/queryKeys";
import { getCachedChapter, setCachedChapter } from "@/features/reader/api/chapterCache";
import type { ReaderChapter, ReaderParagraph } from "@/features/reader/types";

interface RawParagraph {
  id: string;
  order_index: number;
  text: string;
}

interface RawSection {
  id: string;
  book_id: string;
  order_index: number;
  title: string | null;
  word_count: number | null;
  audio_url: string | null;
  audio_timings_url: string | null;
  book_paragraphs: RawParagraph[];
}

/**
 * Bölümün KENDİ alanları. Paragraflar bilerek burada DEĞİL -- gerekçe
 * `fetchAllParagraphs`ta.
 */
const SECTION_SELECT = `id, book_id, order_index, title, word_count,
  audio_url, audio_timings_url`;

/**
 * PostgREST'in tek istekte döndürdüğü en fazla satır sayısı (bu projede
 * `max-rows` = 1000). Tam dolu bir sayfa "devamı olabilir" demektir.
 */
const POSTGREST_MAX_ROWS = 1000;

/**
 * Bölümün TÜM paragraflarını, sayfalayarak çeker.
 *
 * DENETİM BULGUSU (2026-09-19): paragraflar `book_sections` sorgusunun
 * içine GÖMÜLÜ olarak çekiliyordu (`book_paragraphs ( ... )`). Gömülü
 * kaynaklar da PostgREST'in 1000 satır sınırına tabi ve fazlası SESSİZCE
 * kesiliyor. Yayında 1000 paragrafı aşan dört bölüm var (`book-25128-zh`
 * üçü, en uzunu 1.473 paragraf; `book-25271-zh` biri) -- o bölümleri okuyan
 * kullanıcı metnin SONUNU hiç görmüyordu, hata da almıyordu. Arşivdeki
 * katalogda 62 bölüm daha bu eşiğin üstünde, yani daha uzun kitaplar
 * yayınlandıkça yeniden ısırırdı.
 *
 * Aynı 1000 satır kesintisi bu turda `book_lemmas` üzerinde de bulundu
 * (bkz. `useBookLemmaDictionary`'deki `fetchAllBookLemmas`) ve daha önce
 * `book_sections` üzerinde migration 025'te. Üçüncü kez aynı sınıf.
 *
 * Kısmi sayfa = son sayfa. Tam dolu sayfada döngü devam ediyor, yani
 * kesinti bir daha sessizce geri gelemez.
 */
async function fetchAllParagraphs(sectionId: string): Promise<RawParagraph[]> {
  const paragraphs: RawParagraph[] = [];

  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await supabase
      .from("book_paragraphs")
      .select("id, order_index, text")
      .eq("section_id", sectionId)
      .order("order_index")
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    if (error) throw error;

    const page = (data ?? []) as RawParagraph[];
    paragraphs.push(...page);
    if (page.length < POSTGREST_MAX_ROWS) break;
  }

  return paragraphs;
}

function toReaderChapter(
  raw: Omit<RawSection, "book_paragraphs">,
  rawParagraphs: RawParagraph[],
  nextChapterId: string | null,
): ReaderChapter {
  // Sıralama sunucuda yapılıyor (`order("order_index")`), ama sayfalar
  // birleştirildiği için burada da garanti altına alınıyor.
  const paragraphs: ReaderParagraph[] = [...rawParagraphs]
    .sort((a, b) => a.order_index - b.order_index)
    .map((paragraph) => ({
      id: paragraph.id,
      paragraphIndex: paragraph.order_index,
      text: paragraph.text,
    }));

  return {
    id: raw.id,
    bookId: raw.book_id,
    sectionIndex: raw.order_index,
    title: raw.title,
    wordCount: raw.word_count,
    paragraphs,
    nextChapterId,
    audioUrl: raw.audio_url,
    audioTimingsUrl: raw.audio_timings_url,
  };
}

export async function fetchChapter(chapterId: string): Promise<ReaderChapter> {
  const [{ data, error }, paragraphs] = await Promise.all([
    supabase
      .from("book_sections")
      .select(SECTION_SELECT)
      .eq("id", chapterId)
      .single<Omit<RawSection, "book_paragraphs">>(),
    fetchAllParagraphs(chapterId),
  ]);

  if (error) throw error;

  const { data: nextSection } = await supabase
    .from("book_sections")
    .select("id")
    .eq("book_id", data.book_id)
    .eq("order_index", data.order_index + 1)
    .maybeSingle();

  const chapter = toReaderChapter(data, paragraphs, nextSection?.id ?? null);
  setCachedChapter(chapter);
  return chapter;
}

export function useChapterQuery(chapterId: string) {
  return useQuery({
    queryKey: readerQueryKeys.chapter(chapterId),
    queryFn: async () => {
      try {
        return await fetchChapter(chapterId);
      } catch (error) {
        const cached = getCachedChapter(chapterId);
        if (cached) return cached;
        throw error;
      }
    },
    initialData: () => getCachedChapter(chapterId) ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
}
