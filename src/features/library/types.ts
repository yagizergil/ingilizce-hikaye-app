export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** The 3-way CEFR grouping used by both the library's level tabs and
 * home's level-group cards (see app/(tabs)/library.tsx and
 * src/features/home/components/LevelGroupCard.tsx). Kept here, in
 * `library`, as the single source of truth — `home` reaches it through
 * this feature's barrel. */
export type LevelGroup = "beginner" | "intermediate" | "advanced";

export const LEVEL_GROUP_LEVELS: Record<LevelGroup, Level[]> = {
  beginner: ["A1", "A2"],
  intermediate: ["B1", "B2"],
  advanced: ["C1", "C2"],
};

export const LEVEL_GROUPS: LevelGroup[] = ["beginner", "intermediate", "advanced"];

export type SortOption = "recommended" | "newest" | "popular" | "shortest";

export type ViewMode = "grid" | "list";

export interface Chapter {
  id: string;
  index: number;
  title: string;
  progressPercent: number;
  /** Estimated reading duration in minutes for this chapter. Optional
   * because most existing callers (useLibraryBooksQuery, useHomeDataQuery
   * placeholders) only need a chapter count, not per-chapter duration —
   * only useBookDetailQuery populates this. */
  estimatedMinutes?: number;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  level: Level;
  genre: string;
  genreTags: string[];
  /** Sourced from books.themes (text[]). Currently empty for all 51 books
   * in production data — see mapBookRow.ts's RawBookRow doc comment. */
  themes: string[];
  contentWarnings: string[];
  wordCount: number;
  estimatedMinutes: number;
  comprehensionPercent: number;
  hasAudio: boolean;
  isNew: boolean;
  isPopular: boolean;
  summaryTr: string;
  newWordsForUser: number;
  license: string;
  sourceName: string;
  sourceUrl: string;
  chapters: Chapter[];
  createdAt: string;
}

export interface LibraryFilters {
  query: string;
  levelGroup: LevelGroup | "all";
  maxMinutes: number | null;
  genre: string | "all";
  audioOnly: boolean;
  minComprehension: number;
  sort: SortOption;
  viewMode: ViewMode;
}
