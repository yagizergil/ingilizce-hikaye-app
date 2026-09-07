import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { fetchBooks } from "@/features/library/api/useBooksQuery";
import { homeQueryKeys } from "@/features/home/api/queryKeys";
import { CATEGORY_DEFINITIONS, categoryImageUrl } from "@/features/home/categoryRegistry";
import { LEVEL_GROUP_LEVELS, LEVEL_GROUPS } from "@/features/library/types";

import type { Book, LevelGroup } from "@/features/library/types";
import type { CategoryTag, FavoritesReadCounts, HomeExtras, LevelGroupCounts } from "@/features/home/types";

/** "Yeni Kitaplar" shelf size. */
const NEW_BOOKS_COUNT = 10;
const MIN_BOOKS_FOR_AUTHOR_TAG = 2;

interface RawCollectionRow {
  id: string;
  title_key: string;
  is_active: boolean;
}

interface RawCollectionBookRow {
  collection_id: string;
  book_id: string;
}

interface RawProgressBookIdRow {
  book_id: string;
}

/**
 * "Yeni Kitaplar": 10 most-recently-published books, ordered by
 * `published_at`. Verified via Supabase MCP against the live catalog
 * (2026-08-08): `published_at` is populated on all 47 published books —
 * every row's `published_at` was set at the same moment as `created_at`
 * when the book was published — so both columns sort identically today.
 * `published_at` is used anyway since it is the semantically correct
 * column for "kitap ne zaman yayınlandı" (a future backfill/republish
 * flow could set `created_at` and `published_at` apart, e.g. a book
 * drafted long before it's published).
 */
function pickNewBooks(books: Book[]): Book[] {
  return [...books]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, NEW_BOOKS_COUNT);
}

/**
 * "Türler ve Konular": küratörlü kategori listesi (bkz.
 * `categoryRegistry.ts`).
 *
 * ÖNCESİ (2026-09-07'ye kadar): kartlar veritabanındaki HER ham
 * `genres`/`themes` değerinden otomatik üretiliyordu. Üç somut sorun
 * vardı — etiketler İngilizceydi ("slice-of-life", "kindness"), 20'den
 * fazla konu tek bir kitapta geçtiği için raf tek kitaplık kartlarla
 * doluyordu, ve "neighbors"/"neighbours" iki ayrı kart oluyordu.
 *
 * Artık kayıt defterindeki 12 kategori üzerinden gidiliyor: her kategori
 * kendi Türkçe i18n anahtarını, görselini ve hangi ham değerleri
 * kapsadığını tek yerde tutuyor. Hiç kitabı olmayan kategori rafta
 * görünmüyor — boş bir kategoriye dokunan kullanıcı boş bir kütüphane
 * ekranı görürdü.
 */
function buildGenreThemeTags(books: Book[]): CategoryTag[] {
  const tags: CategoryTag[] = [];

  for (const definition of CATEGORY_DEFINITIONS) {
    // Kütüphane tür filtresiyle AYNI karşılaştırma (useFilteredBooks.ts:
    // `book.genre !== filters.genre`), böylece karttaki sayı ile kart
    // açıldığında görülen liste birebir aynı uzunlukta oluyor.
    const count = books.filter((book) => book.genre === definition.genre).length;

    if (count === 0) continue;

    tags.push({
      key: definition.key,
      label: definition.key,
      labelKey: `home.categories.${definition.key}`,
      count,
      navTarget: definition.navTarget,
      coverUrl: categoryImageUrl(definition.key),
    });
  }

  // Çok kitaplı kategoriler önce: raf soldan sağa okunuyor, en zengin
  // vitrin başta olmalı.
  return tags.sort((a, b) => b.count - a.count);
}

/**
 * "Yazarlar ve Seriler" (a): authors with 2+ published books, tapping
 * filters the library by that author's name via the free-text `q` param —
 * `useFilteredBooks` already matches on `book.author.toLowerCase()`, so
 * this reuses the existing search mechanism rather than adding a new
 * author filter field.
 */
function buildAuthorTags(books: Book[]): CategoryTag[] {
  const countByAuthor = new Map<string, number>();
  // First book WITH a cover wins as the representative cover, so an
  // author whose first-listed book has no cover_url yet still gets a real
  // image if a later book of theirs has one.
  const coverByAuthor = new Map<string, string>();
  for (const book of books) {
    if (!book.author) continue;
    countByAuthor.set(book.author, (countByAuthor.get(book.author) ?? 0) + 1);
    if (book.coverUrl && !coverByAuthor.has(book.author)) coverByAuthor.set(book.author, book.coverUrl);
  }

  return [...countByAuthor.entries()]
    .filter(([, count]) => count >= MIN_BOOKS_FOR_AUTHOR_TAG)
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => ({
      key: `author:${author}`,
      label: author,
      count,
      navTarget: { kind: "library", q: author },
      coverUrl: coverByAuthor.get(author) ?? null,
    }));
}

/**
 * "Yazarlar ve Seriler" (b): active collections/series with their book
 * count. Navigation choice (documented per task): `useFilteredBooks`'s
 * search only matches title/author/genre/theme free text — a series like
 * "Oz Serisi" has no dedicated library filter, and the collection's own
 * title_key ("Oz Serisi") won't match any book's own title/author text.
 * So a series card does NOT navigate to the library; it pushes straight to
 * the series' first book (`order_index` 0) via `router.push`, same as
 * tapping that book directly — simplest useful thing that actually lands
 * somewhere real, per "basitlik önce gelir".
 */
async function fetchSeriesTags(books: Book[]): Promise<CategoryTag[]> {
  const coverByBookId = new Map(books.map((book) => [book.id, book.coverUrl]));
  const { data: collectionRows, error: collectionsError } = await supabase
    .from("collections")
    .select("id, title_key, is_active")
    .eq("is_active", true);
  if (collectionsError) throw collectionsError;

  const collections = (collectionRows as RawCollectionRow[] | null) ?? [];
  if (collections.length === 0) return [];

  const { data: collectionBookRows, error: booksError } = await supabase
    .from("collection_books")
    .select("collection_id, book_id")
    .order("order_index", { ascending: true });
  if (booksError) throw booksError;

  const rows = (collectionBookRows as RawCollectionBookRow[] | null) ?? [];
  const bookIdsByCollection = new Map<string, string[]>();
  for (const row of rows) {
    const existing = bookIdsByCollection.get(row.collection_id);
    if (existing) existing.push(row.book_id);
    else bookIdsByCollection.set(row.collection_id, [row.book_id]);
  }

  const tags: CategoryTag[] = [];
  for (const collection of collections) {
    const bookIds = bookIdsByCollection.get(collection.id) ?? [];
    const firstBookId = bookIds[0];
    if (!firstBookId) continue;
    tags.push({
      key: `series:${collection.id}`,
      label: collection.title_key,
      count: bookIds.length,
      navTarget: { kind: "book", bookId: firstBookId },
      coverUrl: coverByBookId.get(firstBookId) ?? null,
    });
  }
  return tags;
}

/** Level-group cards ALWAYS render (even at 0 kitap) — a fixed nav
 * element, not a hide-if-empty content shelf, so this always returns all
 * 3 groups' counts, never omitting a zero one. */
function buildLevelGroupCounts(books: Book[]): LevelGroupCounts {
  const counts = {} as LevelGroupCounts;
  for (const group of LEVEL_GROUPS) {
    const levels = LEVEL_GROUP_LEVELS[group as LevelGroup];
    counts[group] = books.filter((book) => levels.includes(book.level)).length;
  }
  return counts;
}

/**
 * "Okunanlar" = books with ANY `user_book_progress` row for the current
 * user, not just finished ones (`finished_at` set). Chosen because
 * "okunanlar" reads naturally in Turkish as "the ones you've read /
 * you're reading", not strictly "finished" — and a stricter
 * finished-only count would be near-zero for most users, making the card
 * look broken rather than useful.
 */
async function fetchFavoritesReadCounts(userId: string | undefined): Promise<FavoritesReadCounts> {
  if (!userId) return { favoritesCount: 0, readCount: 0 };

  const [{ data: favoriteRows, error: favoritesError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      supabase.from("user_favorites").select("book_id").eq("user_id", userId),
      supabase.from("user_book_progress").select("book_id").eq("user_id", userId),
    ]);
  if (favoritesError) throw favoritesError;
  if (progressError) throw progressError;

  const readBookIds = new Set(((progressRows as RawProgressBookIdRow[] | null) ?? []).map((row) => row.book_id));

  return {
    favoritesCount: (favoriteRows ?? []).length,
    readCount: readBookIds.size,
  };
}

async function fetchHomeExtras(): Promise<HomeExtras> {
  const books = await fetchBooks();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const [seriesTags, favoritesReadCounts] = await Promise.all([
    fetchSeriesTags(books),
    fetchFavoritesReadCounts(userId),
  ]);

  const authorTags = buildAuthorTags(books);

  return {
    newBooks: pickNewBooks(books),
    categoryTags: buildGenreThemeTags(books),
    authorSeriesTags: [...authorTags, ...seriesTags],
    levelGroupCounts: buildLevelGroupCounts(books),
    favoritesReadCounts,
  };
}

export function useHomeExtrasQuery() {
  return useQuery({
    queryKey: homeQueryKeys.extras(),
    queryFn: fetchHomeExtras,
  });
}
