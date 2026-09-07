import { Alert } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@/lib/storage";

interface ReadingProgressInput {
  bookId: string;
  chapterId: string;
  paragraphIndex: number;
  percent: number;
  /** Set only when this save should mark the whole book as finished (the
   * reader just completed the book's last chapter). Omitted/false leaves
   * any existing `finished_at` untouched — this call isn't a "the book is
   * no longer finished" signal, just a normal position update. */
  finished?: boolean;
}

const PENDING_PROGRESS_KEY = "reader.pendingProgress";

async function queuePendingProgress(input: ReadingProgressInput): Promise<void> {
  await AsyncStorage.setItem(PENDING_PROGRESS_KEY, JSON.stringify(input));
}

export async function flushPendingProgress(): Promise<void> {
  const raw = await AsyncStorage.getItem(PENDING_PROGRESS_KEY);
  if (!raw) return;

  const pending = JSON.parse(raw) as ReadingProgressInput;
  const result = await saveReadingProgress(pending);
  if (result.ok) await AsyncStorage.removeItem(PENDING_PROGRESS_KEY);
}

async function saveReadingProgress(input: ReadingProgressInput): Promise<{ ok: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false };

  const { error } = await supabase.from("user_book_progress").upsert({
    user_id: userData.user.id,
    book_id: input.bookId,
    section_id: input.chapterId,
    paragraph_index: input.paragraphIndex,
    percent: input.percent,
    last_read_at: new Date().toISOString(),
    ...(input.finished ? { finished_at: new Date().toISOString() } : {}),
  });

  return { ok: !error };
}

interface StoredReadingProgress {
  paragraphIndex: number;
}

/**
 * Reads the single current position `user_book_progress` stores for this
 * book (schema note: one row per book, not per chapter — see
 * useBookDetailQuery.ts). Only returns a paragraph index when the stored
 * position is actually for `chapterId` — a saved position for a different
 * chapter of the same book isn't a valid restore point for this chapter.
 * Cross-session resume is paragraph-granularity only (no `char_offset`
 * column exists yet), so callers derive `charOffset: 0` from this.
 */
export function useInitialReadingProgress(bookId: string, chapterId: string) {
  return useQuery({
    queryKey: ["reader", "initialProgress", bookId, chapterId],
    queryFn: async (): Promise<StoredReadingProgress | null> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return null;

      const { data, error } = await supabase
        .from("user_book_progress")
        .select("section_id, paragraph_index")
        .eq("user_id", userData.user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.section_id !== chapterId || data.paragraph_index === null) return null;

      return { paragraphIndex: data.paragraph_index };
    },
    staleTime: 60 * 1000,
  });
}

export function useReadingProgressMutation() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: saveReadingProgress,
    onError: (_error, input) => {
      void queuePendingProgress(input);
      Alert.alert(t("common.errorTitle"), t("reader.error.progressNotSaved"));
    },
    onSuccess: (result, input) => {
      if (!result.ok) {
        void queuePendingProgress(input);
        Alert.alert(t("common.errorTitle"), t("reader.error.progressNotSaved"));
      }
    },
  });
}
