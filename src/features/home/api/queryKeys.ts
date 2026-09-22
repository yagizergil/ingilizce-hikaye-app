/**
 * `extras`/`currentlyReading` içeriği aktif dil çiftine göre değişen bir
 * kitap listesinden türetiliyor -- aynı gerekçeyle bunlar da dile göre
 * anahtarlanıyor (bkz. `libraryQueryKeys.books`'un doc comment'i).
 * `favoritesReadLists` de aynı sınıfa giriyor (`fetchBooks()` çağırıyor).
 */
export const homeQueryKeys = {
  all: ["home"] as const,
  extras: (targetLanguage: string) => [...homeQueryKeys.all, "extras", targetLanguage] as const,
  favoritedBookIds: () => [...homeQueryKeys.all, "favoritedBookIds"] as const,
  favoritesReadLists: (targetLanguage: string) =>
    [...homeQueryKeys.all, "favoritesReadLists", targetLanguage] as const,
  currentlyReading: (targetLanguage: string) =>
    [...homeQueryKeys.all, "currentlyReading", targetLanguage] as const,
};
