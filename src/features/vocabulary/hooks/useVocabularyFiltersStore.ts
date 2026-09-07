import { create } from "zustand";

import type { VocabularyFilter } from "@/features/vocabulary/types";

interface VocabularyFiltersState {
  filter: VocabularyFilter;
  setFilter: (filter: VocabularyFilter) => void;
}

/** UI-only state (active filter tab) — ADR-003: screen state lives in
 * Zustand, server data (the word list itself) lives in TanStack Query. */
export const useVocabularyFiltersStore = create<VocabularyFiltersState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));
