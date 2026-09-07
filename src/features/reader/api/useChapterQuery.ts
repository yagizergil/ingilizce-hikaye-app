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
  book_paragraphs: RawParagraph[];
}

const SECTION_SELECT = `id, book_id, order_index, title, word_count,
  book_paragraphs ( id, order_index, text )`;

function toReaderChapter(raw: RawSection, nextChapterId: string | null): ReaderChapter {
  const paragraphs: ReaderParagraph[] = [...raw.book_paragraphs]
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
  };
}

export async function fetchChapter(chapterId: string): Promise<ReaderChapter> {
  const { data, error } = await supabase
    .from("book_sections")
    .select(SECTION_SELECT)
    .eq("id", chapterId)
    .single<RawSection>();

  if (error) throw error;

  const { data: nextSection } = await supabase
    .from("book_sections")
    .select("id")
    .eq("book_id", data.book_id)
    .eq("order_index", data.order_index + 1)
    .maybeSingle();

  const chapter = toReaderChapter(data, nextSection?.id ?? null);
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
