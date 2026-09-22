import { homeQueryKeys } from "@/features/home/api/queryKeys";

/**
 * Aynı regresyon sınıfına karşı -- bkz.
 * `src/features/library/api/__tests__/queryKeys.test.ts`in doc comment'i.
 * Ana sayfadaki "Yeni Kitaplar" vb. raflar da aktif dil çiftine göre
 * değişen bir katalogdan türediği için aynı kurala tabi.
 */
describe("homeQueryKeys", () => {
  it("extras() farklı diller için farklı anahtarlar üretir", () => {
    expect(homeQueryKeys.extras("en")).not.toEqual(homeQueryKeys.extras("de"));
  });

  it("currentlyReading() farklı diller için farklı anahtarlar üretir", () => {
    expect(homeQueryKeys.currentlyReading("en")).not.toEqual(homeQueryKeys.currentlyReading("de"));
  });

  it("favoritesReadLists() farklı diller için farklı anahtarlar üretir", () => {
    expect(homeQueryKeys.favoritesReadLists("en")).not.toEqual(
      homeQueryKeys.favoritesReadLists("de"),
    );
  });
});
