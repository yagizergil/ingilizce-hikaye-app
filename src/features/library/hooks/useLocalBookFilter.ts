import { useMemo } from "react";

import { LEVEL_GROUP_LEVELS } from "@/features/library/types";

import type { Book, LevelGroup } from "@/features/library/types";

export interface LocalBookFilter {
  query?: string;
  levelGroup?: LevelGroup;
  genre?: string;
}

/** Same matching rules as `useFilteredBooks`, but reads its criteria from
 * plain arguments instead of the shared `useLibraryFiltersStore` singleton.
 * Used by standalone tag/level-group destinations (see app/browse.tsx) so
 * that browsing from a home tag never reads or writes the Library tab's
 * own filter state — the two screens must stay fully independent. */
export function useLocalBookFilter(books: Book[] | undefined, filter: LocalBookFilter): Book[] {
  return useMemo(() => {
    if (!books) return [];
    const query = filter.query?.trim().toLowerCase() ?? "";

    return books.filter((book) => {
      if (query) {
        const matchesQuery =
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.genre.toLowerCase().includes(query) ||
          book.themes.some((theme) => theme.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }
      if (filter.levelGroup && !LEVEL_GROUP_LEVELS[filter.levelGroup].includes(book.level)) return false;
      if (filter.genre && book.genre !== filter.genre) return false;
      return true;
    });
  }, [books, filter.query, filter.levelGroup, filter.genre]);
}
