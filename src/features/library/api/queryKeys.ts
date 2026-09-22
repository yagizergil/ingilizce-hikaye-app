/**
 * DENETİM BULGUSU (2026-09-22, kullanıcı bulgusu): `books()` ve
 * `booksWithChapterCounts()` daha önce hiçbir parametre almıyordu -- yani
 * kataloğun HANGİ dilde çekildiği anahtarın bir parçası DEĞİLDİ. Kitap
 * listesi sunucuda aktif dil çiftine göre filtreleniyor
 * (`fetchBooks`teki `target_language` eşleşmesi), yani bu tek önbellek
 * girdisinin içeriği görünmez bir sunucu durumuna (aktif çift) bağlıydı.
 * Dil çifti değişince ekranların yeniden çekmesi TAMAMEN elle
 * `invalidateQueries` çağırmayı HATIRLAMAYA bağlıydı
 * (`useSetLanguagePairMutation`) -- ve gerçekten de bir tüketici
 * (`useLibraryBooksQuery`) bunu unutmuştu, ayrıca `ensureQueryData` ile
 * paylaşılan önbellek zincirindeki herhangi bir halka atlanırsa aynı hata
 * sessizce geri geliyordu. Artık dil, anahtarın kendisinin bir parçası:
 * dil değişince bu doğal olarak FARKLI bir önbellek girdisi oluyor, hiçbir
 * yerde elle invalidate etmeyi hatırlamaya gerek kalmıyor -- bütün bir
 * hata sınıfı yapısal olarak imkânsız hale geliyor.
 */
export const libraryQueryKeys = {
  all: ["library"] as const,
  books: (targetLanguage: string) => [...libraryQueryKeys.all, "books", targetLanguage] as const,
  book: (id: string) => [...libraryQueryKeys.all, "book", id] as const,
  booksWithChapterCounts: (targetLanguage: string) =>
    [...libraryQueryKeys.all, "books", "with-chapter-counts", targetLanguage] as const,
  bookDetail: (id: string) => [...libraryQueryKeys.all, "book-detail", id] as const,
  bookSeries: (id: string) => [...libraryQueryKeys.all, "book-series", id] as const,
};
