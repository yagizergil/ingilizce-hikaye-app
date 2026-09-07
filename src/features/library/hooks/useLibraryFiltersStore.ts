import { create } from "zustand";
import type { LibraryFilters } from "@/features/library/types";

interface LibraryFiltersState extends LibraryFilters {
  setQuery: (query: string) => void;
  setLevelGroup: (levelGroup: LibraryFilters["levelGroup"]) => void;
  setMaxMinutes: (maxMinutes: LibraryFilters["maxMinutes"]) => void;
  setGenre: (genre: LibraryFilters["genre"]) => void;
  setAudioOnly: (audioOnly: boolean) => void;
  setMinComprehension: (minComprehension: number) => void;
  setSort: (sort: LibraryFilters["sort"]) => void;
  setViewMode: (viewMode: LibraryFilters["viewMode"]) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: LibraryFilters = {
  query: "",
  levelGroup: "all",
  maxMinutes: null,
  genre: "all",
  audioOnly: false,
  minComprehension: 0,
  sort: "recommended",
  viewMode: "grid",
};

export const useLibraryFiltersStore = create<LibraryFiltersState>((set) => ({
  ...DEFAULT_FILTERS,
  setQuery: (query) => set({ query }),
  setLevelGroup: (levelGroup) => set({ levelGroup }),
  setMaxMinutes: (maxMinutes) => set({ maxMinutes }),
  setGenre: (genre) => set({ genre }),
  setAudioOnly: (audioOnly) => set({ audioOnly }),
  setMinComprehension: (minComprehension) => set({ minComprehension }),
  setSort: (sort) => set({ sort }),
  setViewMode: (viewMode) => set({ viewMode }),
  resetFilters: () => set(DEFAULT_FILTERS),
}));
