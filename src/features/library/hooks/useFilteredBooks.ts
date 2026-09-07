import { useMemo } from "react";
import { useLibraryFiltersStore } from "@/features/library/hooks/useLibraryFiltersStore";
import { LEVEL_GROUP_LEVELS } from "@/features/library/types";
import type { Book } from "@/features/library/types";

function sortBooks(books: Book[], sort: string): Book[] {
  const sorted = [...books];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "popular":
      return sorted.sort((a, b) => Number(b.isPopular) - Number(a.isPopular));
    case "shortest":
      return sorted.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    default:
      return sorted;
  }
}

export function useFilteredBooks(books: Book[] | undefined): Book[] {
  const filters = useLibraryFiltersStore();

  return useMemo(() => {
    if (!books) return [];

    const query = filters.query.trim().toLowerCase();
    const filtered = books.filter((book) => {
      if (query) {
        const matchesQuery =
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.genre.toLowerCase().includes(query) ||
          book.themes.some((theme) => theme.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }
      if (filters.levelGroup !== "all" && !LEVEL_GROUP_LEVELS[filters.levelGroup].includes(book.level)) {
        return false;
      }
      if (filters.genre !== "all" && book.genre !== filters.genre) return false;
      if (filters.audioOnly && !book.hasAudio) return false;
      if (filters.maxMinutes !== null && book.estimatedMinutes > filters.maxMinutes) return false;
      if (book.comprehensionPercent < filters.minComprehension) return false;
      return true;
    });

    return sortBooks(filtered, filters.sort);
  }, [books, filters]);
}
