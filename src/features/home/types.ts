import type { Book, LevelGroup } from "@/features/library/types";

/** Where a `CategoryTagCard` navigates on tap. `library` filters the
 * library screen via query params (genre/author free-text/level group);
 * `book` pushes straight to a book's detail screen — used by series cards,
 * since the library search doesn't match series/collection membership
 * (see useFilteredBooks.ts, title/author/genre/theme text only) so there
 * is no library filter that would show "just this series". */
export type CategoryTagNavTarget =
  | { kind: "library"; genre?: string; q?: string; levelGroup?: LevelGroup }
  | { kind: "book"; bookId: string };

/** One card in the "Türler ve Konular" or "Yazarlar ve Seriler" shelves —
 * a label + count, not a book cover (see CategoryTagCard.tsx). */
export interface CategoryTag {
  key: string;
  /** Hazır metin (yazar adı, seri adı — çevrilmez). `labelKey` varsa
   * yok sayılır. */
  label: string;
  /**
   * "Türler ve Konular" kartlarının i18n anahtarı. Bu kartların etiketi
   * veritabanındaki ham `genres`/`themes` değerinden geliyordu ve Türk
   * kullanıcıya "slice-of-life", "kindness" gibi İngilizce metinler
   * gösteriyordu — CLAUDE.md'nin "hardcoded string yok, her metin t()"
   * kuralının ihlali. Artık etiket `categoryRegistry.ts`'teki küratörlü
   * anahtardan geliyor ve kartta çevriliyor.
   */
  labelKey?: string;
  count: number;
  navTarget: CategoryTagNavTarget;
  /** A representative book cover for this tag (e.g. one of the author's
   * books, or a series' first book) -- used by `CategoryTagCard` when
   * present instead of its flat-color fallback. `null`/absent for genre
   * and theme tags, which have no single representative cover. */
  coverUrl?: string | null;
}

export type LevelGroupCounts = Record<LevelGroup, number>;

export interface FavoritesReadCounts {
  favoritesCount: number;
  /** "Okunanlar" = books with ANY `user_book_progress` row, not just
   * finished ones — see useHomeExtrasQuery.ts's fetchFavoritesReadCounts
   * doc comment for the reasoning. */
  readCount: number;
}

/** Everything the redesigned home screen needs: the "Yeni Kitaplar" shelf,
 * the two category-tag shelves, the always-shown level-group counts, and
 * the favorites/read counts for the bottom card. ("Kaldığın yer"/currently
 * reading now lives entirely on `useCurrentlyReadingQuery` — the old
 * single-book "Kaldığın yer" hero card was removed as redundant once the
 * "Şu An Okunuyor" shelf shows every in-progress book.) */
export interface HomeExtras {
  newBooks: Book[];
  categoryTags: CategoryTag[];
  authorSeriesTags: CategoryTag[];
  levelGroupCounts: LevelGroupCounts;
  favoritesReadCounts: FavoritesReadCounts;
}
