export const libraryQueryKeys = {
  all: ["library"] as const,
  books: () => [...libraryQueryKeys.all, "books"] as const,
  book: (id: string) => [...libraryQueryKeys.all, "book", id] as const,
  booksWithChapterCounts: () => [...libraryQueryKeys.all, "books", "with-chapter-counts"] as const,
  bookDetail: (id: string) => [...libraryQueryKeys.all, "book-detail", id] as const,
  bookSeries: (id: string) => [...libraryQueryKeys.all, "book-series", id] as const,
};
