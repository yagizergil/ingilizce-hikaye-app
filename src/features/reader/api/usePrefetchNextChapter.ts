import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readerQueryKeys } from "@/features/reader/api/queryKeys";
import { fetchChapter } from "@/features/reader/api/useChapterQuery";

export function usePrefetchNextChapter(nextChapterId: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!nextChapterId) return;

    void queryClient.prefetchQuery({
      queryKey: readerQueryKeys.chapter(nextChapterId),
      queryFn: () => fetchChapter(nextChapterId),
      staleTime: 5 * 60 * 1000,
    });
  }, [nextChapterId, queryClient]);
}
