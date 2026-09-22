import { libraryQueryKeys } from "@/features/library/api/queryKeys";

/**
 * ÇÖZÜLEN HATA (2026-09-22, kullanıcı bulgusu): `books()`/
 * `booksWithChapterCounts()` hiç parametre almıyordu, yani kataloğun
 * hangi dilde çekildiği önbellek anahtarının bir parçası değildi. Dil
 * çifti değişince bu sorguları elle `invalidateQueries` ile
 * geçersiz kılmayı HATIRLAMAK gerekiyordu -- ve gerçekten bir tüketici
 * bunu unutmuştu. Bu test, iki farklı dil için üretilen anahtarların
 * GERÇEKTEN farklı olduğunu kilitliyor; aynı kalırlarsa (biri "dil artık
 * anahtarın parçası değil" diye bir regresyon yaparsa) bu test kırmızıya
 * döner.
 */
describe("libraryQueryKeys", () => {
  it("books() farklı diller için farklı anahtarlar üretir", () => {
    const en = libraryQueryKeys.books("en");
    const de = libraryQueryKeys.books("de");
    expect(en).not.toEqual(de);
  });

  it("booksWithChapterCounts() farklı diller için farklı anahtarlar üretir", () => {
    const en = libraryQueryKeys.booksWithChapterCounts("en");
    const de = libraryQueryKeys.booksWithChapterCounts("de");
    expect(en).not.toEqual(de);
  });

  it("aynı dil için aynı anahtarı üretir (önbellek isabetinin gerçekten çalışması için)", () => {
    expect(libraryQueryKeys.books("en")).toEqual(libraryQueryKeys.books("en"));
  });
});
