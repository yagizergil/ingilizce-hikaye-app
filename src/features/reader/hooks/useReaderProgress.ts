import { useEffect, useRef } from "react";
import {
  flushPendingProgress,
  useReadingProgressMutation,
} from "@/features/reader/api/useReadingProgressMutation";

const SAVE_DEBOUNCE_MS = 1500;

export function useReaderProgress(
  bookId: string,
  chapterId: string,
): (paragraphIndex: number, percent: number) => void {
  const { mutate } = useReadingProgressMutation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void flushPendingProgress();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (paragraphIndex: number, percent: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      mutate({ bookId, chapterId, paragraphIndex, percent });
    }, SAVE_DEBOUNCE_MS);
  };
}
