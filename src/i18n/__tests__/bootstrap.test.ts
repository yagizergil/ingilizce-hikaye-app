import { UI_LANGUAGE_CODES } from "@/lib/languages";
import i18n from "@/i18n/index";

/**
 * `localeParity.test.ts` yalnızca JSON dosyalarını birbirleriyle
 * karşılaştırıyor -- `src/i18n/index.ts`'in i18next'i GERÇEKTEN doğru
 * kurup kurmadığını test etmiyor. Bu dosyanın varlık sebebi tam olarak bu
 * boşluk: `resources` nesnesindeki `{ translation: ... }` sarmalaması
 * düşmüştü (bkz. index.ts'teki yorum) ve bu, TÜM dillerde `t()`'nin ham
 * anahtarı (`"app.name"` gibi) döndürmesine yol açan bir regresyondu.
 * localeParity hâlâ yeşil kalırdı çünkü JSON dosyalarının kendisi
 * bozulmamıştı -- bozulan yalnızca i18next'e VERİLİŞ şekliydi.
 *
 * Bu yüzden burada gerçek modül import ediliyor ve gerçek `t()` çağrılıyor.
 */
describe("i18n bootstrap (src/i18n/index.ts)", () => {
  it("resolves a real translation, not the raw key, for every UI language", async () => {
    for (const lng of UI_LANGUAGE_CODES) {
      await i18n.changeLanguage(lng);

      const appName = i18n.t("app.name");
      const emptyTitle = i18n.t("home.empty.title");

      expect(appName).not.toBe("app.name");
      expect(emptyTitle).not.toBe("home.empty.title");
      expect(appName.length).toBeGreaterThan(0);
      expect(emptyTitle.length).toBeGreaterThan(0);
    }
  });
});
