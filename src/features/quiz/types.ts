export type QuizLevel = 1 | 2 | 3;

export type QuizQuestionKind = "vocabulary" | "fact" | "inference" | "sequence" | "motive";

export interface BookQuizQuestion {
  id: string;
  kind: QuizQuestionKind;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

export interface BookQuizLevel {
  quizId: string;
  level: QuizLevel;
  questionCount: number;
  /** Kullanıcının en iyi skoru; hiç çözmediyse null. */
  bestCorrect: number | null;
}

/** Bir basamağın kullanıcıya göre durumu (bkz. `levelState`). */
export type QuizLevelState = "done" | "open" | "locked" | "premium";

export interface QuizBook {
  bookId: string;
  title: string;
  coverUrl: string | null;
  cefrLevel: string | null;
  lastReadAt: string | null;
  levels: BookQuizLevel[];
}
