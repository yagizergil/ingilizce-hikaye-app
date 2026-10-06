import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { gateOnLanguagePair, useActiveLanguagePairQuery } from "@/features/languagePair";

import type {
  BookQuizLevel,
  BookQuizQuestion,
  QuizBook,
  QuizLevel,
  QuizQuestionKind,
} from "@/features/quiz/types";

export const quizQueryKeys = {
  all: ["quiz"] as const,
  books: (language: string) => [...quizQueryKeys.all, "books", language] as const,
  book: (bookId: string) => [...quizQueryKeys.all, "book", bookId] as const,
  questions: (quizId: string) => [...quizQueryKeys.all, "questions", quizId] as const,
};

/** Quiz rafında gösterilen en fazla kitap (okunanlar önce). */
const SHELF_LIMIT = 30;

interface QuizRow {
  id: string;
  level: number;
  question_count: number;
  user_quiz_results: { best_correct: number }[] | null;
}

interface BookRow {
  id: string;
  title: string;
  cover_url: string | null;
  cefr_level: string | null;
  popularity_score: number | null;
  book_quizzes: QuizRow[];
  user_book_progress: { last_read_at: string | null }[] | null;
}

const BOOK_SELECT =
  "id, title, cover_url, cefr_level, popularity_score, " +
  "book_quizzes!inner(id, level, question_count, user_quiz_results(best_correct)), " +
  "user_book_progress(last_read_at)";

/** Satırı ayrıştırır (saf, testli). `user_quiz_results`/`user_book_progress` RLS ile yalnızca kullanıcının kendi satırları. */
export function mapQuizBook(row: BookRow): QuizBook {
  const levels: BookQuizLevel[] = [...row.book_quizzes]
    .sort((a, b) => a.level - b.level)
    .map((quiz) => ({
      quizId: quiz.id,
      level: quiz.level as QuizLevel,
      questionCount: quiz.question_count,
      bestCorrect: quiz.user_quiz_results?.[0]?.best_correct ?? null,
    }));
  return {
    bookId: row.id,
    title: row.title,
    coverUrl: row.cover_url,
    cefrLevel: row.cefr_level,
    lastReadAt: row.user_book_progress?.[0]?.last_read_at ?? null,
    levels,
  };
}

/** Okunan kitaplar (son okunan önce), sonra popülerlik. */
export function sortQuizBooks(books: QuizBook[], popularity: Map<string, number>): QuizBook[] {
  return [...books].sort((a, b) => {
    if (a.lastReadAt && b.lastReadAt) return b.lastReadAt.localeCompare(a.lastReadAt);
    if (a.lastReadAt) return -1;
    if (b.lastReadAt) return 1;
    return (popularity.get(b.bookId) ?? 0) - (popularity.get(a.bookId) ?? 0);
  });
}

async function fetchQuizBooks(language: string): Promise<QuizBook[]> {
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("status", "published")
    .eq("target_language", language)
    .limit(200)
    .returns<BookRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const popularity = new Map(rows.map((row) => [row.id, row.popularity_score ?? 0]));
  return sortQuizBooks(rows.map(mapQuizBook), popularity).slice(0, SHELF_LIMIT);
}

export function useQuizBooksQuery() {
  const pairQuery = useActiveLanguagePairQuery();
  const language = pairQuery.data?.targetLanguage ?? null;
  const query = useQuery({
    queryKey: quizQueryKeys.books(language ?? ""),
    queryFn: () => fetchQuizBooks(language as string),
    enabled: language !== null,
  });
  return gateOnLanguagePair(query, pairQuery);
}

export function useBookQuizQuery(bookId: string | undefined) {
  return useQuery({
    queryKey: quizQueryKeys.book(bookId ?? ""),
    enabled: Boolean(bookId),
    queryFn: async (): Promise<QuizBook | null> => {
      const { data, error } = await supabase
        .from("books")
        .select(BOOK_SELECT)
        .eq("id", bookId as string)
        .returns<BookRow[]>();
      if (error) throw error;
      const row = data?.[0];
      return row ? mapQuizBook(row) : null;
    },
  });
}

interface QuestionRow {
  id: string;
  kind: QuizQuestionKind;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

/**
 * Soruları çeker. Premium basamakta ücretsiz kullanıcıya RLS boş liste
 * döndürür; ekran bunu "erişim yok" diye ele alır (hata değil).
 */
export function useQuizQuestionsQuery(quizId: string | undefined) {
  return useQuery({
    queryKey: quizQueryKeys.questions(quizId ?? ""),
    enabled: Boolean(quizId),
    queryFn: async (): Promise<BookQuizQuestion[]> => {
      const { data, error } = await supabase
        .from("book_quiz_questions")
        .select("id, kind, prompt, options, correct_index, explanation")
        .eq("quiz_id", quizId as string)
        .order("order_index")
        .returns<QuestionRow[]>();
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        prompt: row.prompt,
        options: row.options,
        correctIndex: row.correct_index,
        explanation: row.explanation,
      }));
    },
  });
}

export function useSubmitQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quizId, correct }: { quizId: string; correct: number }) => {
      const { error } = await supabase.rpc("submit_book_quiz", {
        p_quiz_id: quizId,
        p_correct: correct,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quizQueryKeys.all }),
  });
}
