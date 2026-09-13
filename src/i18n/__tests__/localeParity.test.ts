import en from "@/i18n/locales/en.json";
import tr from "@/i18n/locales/tr.json";
import de from "@/i18n/locales/de.json";
import fr from "@/i18n/locales/fr.json";
// NEDEN "itLocale": `import it from ...` Jest'in global `it()` test
// fonksiyonunu bu dosyanın kapsamında GÖLGELER -- İtalyanca dil kodu
// tesadüfen Jest'in test bildirimi anahtar kelimesiyle aynı harfleri
// taşıyor. Bu tam olarak böyle bir hataya yol açtı: `it.each(...)`
// çağrıları modülün kendi `it` (İtalyanca JSON) importuna gidip
// "it.each is not a function" ile patladı.
import itLocale from "@/i18n/locales/it.json";
import es from "@/i18n/locales/es.json";
import ru from "@/i18n/locales/ru.json";
import uk from "@/i18n/locales/uk.json";
import ar from "@/i18n/locales/ar.json";
import zh from "@/i18n/locales/zh.json";
import ja from "@/i18n/locales/ja.json";

/**
 * Çeviri dosyalarının bütünlük testleri.
 *
 * NEDEN BU TESTLER VAR: CLAUDE.md'nin "ASLA YAPMA" listesinde ilk madde
 * hardcoded string. Kural kod incelemesiyle korunuyordu ama çeviri
 * dosyalarının KENDİSİNİ hiçbir şey kontrol etmiyordu — bir anahtarı
 * yalnızca `tr.json`'a eklemek (ki konvansiyon önce oraya eklemeyi
 * söylüyor, yani en olası hata bu) sessizce geçiyordu. Sonuç, İngilizce
 * arayüzde ham anahtar metninin görünmesi: "paywall.legal.autoRenew".
 *
 * GENELLEŞTİRME (v2, 2026-09-13 — dil çiftleri): eskiden yalnızca tr/en
 * kontrol ediliyordu. Uygulama artık 11 arayüz dili taşıyor (bkz.
 * src/lib/languages.ts, src/i18n/index.ts); bu test dosyası da genellendi
 * ki yeni dillerin HİÇBİRİ "sessizce eksik anahtar" durumuna düşmesin --
 * tam da yukarıdaki paragrafın anlattığı hatanın 9 dilde tekrarı olurdu.
 *
 * Dört şey doğrulanıyor (her locale, `en` referans alınarak):
 *  1. Anahtar kümeleri (çoğul soneki hariç) birebir aynı.
 *  2. Hiçbir değer boş değil.
 *  3. `en`'de çoğullu olan her anahtarın o locale'de en az `_other` hâli var
 *     (i18next her zaman `_other`'a düşüyor -- diller arası ORTAK payda bu;
 *     Rusça/Arapça gibi dillerin ekstra `_few`/`_many`/`_zero` kategorileri
 *     BULUNMAMASI hata değil, `_other`'ın eksik olması hata).
 *  4. İnterpolasyon değişkenleri `en` ile aynı.
 */

type Json = { [key: string]: string | Json };

const LOCALES: Record<string, Json> = {
  tr: tr as unknown as Json,
  en: en as unknown as Json,
  de: de as unknown as Json,
  fr: fr as unknown as Json,
  it: itLocale as unknown as Json,
  es: es as unknown as Json,
  ru: ru as unknown as Json,
  uk: uk as unknown as Json,
  ar: ar as unknown as Json,
  zh: zh as unknown as Json,
  ja: ja as unknown as Json,
};

const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

function flatten(node: Json, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(path, value);
    } else {
      for (const [nested, nestedValue] of flatten(value, path)) {
        out.set(nested, nestedValue);
      }
    }
  }
  return out;
}

/** Çoğul sonekini atıp taban anahtarı döner (yoksa anahtarın kendisi). */
function baseKeyOf(key: string): string {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return key;
}

const FLAT: Record<string, Map<string, string>> = Object.fromEntries(
  Object.entries(LOCALES).map(([code, json]) => [code, flatten(json)]),
);

const ENGLISH_BASE_KEYS = new Set([...FLAT.en!.keys()].map(baseKeyOf));

/**
 * Bilerek boş bırakılmış anahtarlar.
 *
 * `reader.wordSheet.pos.other`: sözlükteki `pos` alanı serbest metin ve
 * tanınmayan her değer "other" kovasına düşüyor (bkz. migration 013'ün
 * `else 8` catch-all'ı). O kova için bir etiket göstermek — "(diğer)" gibi —
 * kullanıcıya hiçbir şey anlatmaz, yalnızca gürültü ekler. Boşluk burada
 * "etiket gösterme" demek, eksik çeviri değil.
 */
const INTENTIONALLY_EMPTY = new Set(["reader.wordSheet.pos.other"]);

const LOCALE_CODES = Object.keys(LOCALES);

describe("çeviri dosyaları", () => {
  it.each(LOCALE_CODES.filter((code) => code !== "en"))(
    "%s ile en aynı taban anahtarlara sahip (çoğul soneki hariç)",
    (code) => {
      const flat = FLAT[code]!;
      const localeBaseKeys = new Set([...flat.keys()].map(baseKeyOf));

      const missingInLocale = [...ENGLISH_BASE_KEYS]
        .filter((key) => !localeBaseKeys.has(key))
        .sort();
      const missingInEnglish = [...localeBaseKeys]
        .filter((key) => !ENGLISH_BASE_KEYS.has(key))
        .sort();

      expect({ missingInLocale, missingInEnglish }).toEqual({
        missingInLocale: [],
        missingInEnglish: [],
      });
    },
  );

  it.each(LOCALE_CODES)("%s içinde beklenmeyen boş değer yok", (code) => {
    const flat = FLAT[code]!;
    const empty = [...flat.entries()]
      .filter(([key, value]) => value.trim().length === 0 && !INTENTIONALLY_EMPTY.has(key))
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("bilerek boş bırakılmış her anahtar hâlâ mevcut", () => {
    // Liste bayatlamasın: anahtar silinirse ya da doldurulursa bu test
    // düşer ve yukarıdaki gerekçe gözden geçirilir.
    for (const key of INTENTIONALLY_EMPTY) {
      for (const code of LOCALE_CODES) {
        expect(FLAT[code]!.get(key)).toBe("");
      }
    }
  });

  it.each(LOCALE_CODES)(
    "%s içinde en'de çoğullu olan her anahtarın en az _other hâli var",
    (code) => {
      // i18next `count` verildiğinde bulamadığı kategoriyi `_other`'a
      // düşürür -- bu YÜZDEN her dilde garanti olması gereken TEK
      // kategori budur. Bir dilin `_few`/`_many` gibi FAZLADAN kategorileri
      // olması hata değil (Rusça/Ukraynaca/Arapça bilerek daha zengin);
      // eksik olan `_other` ise ham anahtarın ekranda görünmesi demek.
      const englishPluralBases = new Set(
        [...FLAT.en!.keys()].filter((key) => key.endsWith("_other")).map(baseKeyOf),
      );
      const flat = FLAT[code]!;

      const missingOther = [...englishPluralBases]
        .filter((base) => !flat.has(`${base}_other`))
        .sort();

      expect(missingOther).toEqual([]);
    },
  );

  /**
   * `_zero`/`_one`/`_two`: SABİT, bilinen bir miktarı anlatıyorlar --
   * "ilk kitabın", "iki gün" gibi -- ve bir dilde rakamı hiç yazmadan
   * doğal bir cümle kurmak GEÇERLİ bir çeviri kararı (bkz. Arapça
   * `completion.eyebrow_one`: "أنهيت كتابك الأول" -- "birinci kitabını
   * bitirdin", `{{count}}` yok çünkü "1" zaten kelimenin içinde).
   * `_few`/`_many`/`_other` ise AÇIK UÇLU bir aralığı kapsıyor ve
   * gerçek sayıyı göstermek ZORUNDA -- oradaki bir eksiklik gerçek bir
   * hata (sessizce hangi kitap/kaç gün olduğu kaybolur).
   */
  const OPTIONAL_COUNT_SUFFIXES = ["_zero", "_one", "_two"];

  it.each(LOCALE_CODES.filter((code) => code !== "en"))(
    "%s içindeki interpolasyon değişkenleri en ile aynı",
    (code) => {
      // "{{count}} kelime" karşılığına "{{total}} words" yazmak, çalışma
      // zamanında sessizce boş bir değişken bırakır.
      const variablesOf = (value: string) =>
        [...value.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((match) => match[1]).sort();

      const flat = FLAT[code]!;
      const mismatched: string[] = [];
      for (const [key, localeValue] of flat) {
        const enValue = FLAT.en!.get(key);
        if (enValue === undefined) continue;

        const a = variablesOf(localeValue);
        const b = variablesOf(enValue);
        if (a.join(",") === b.join(",")) continue;

        const isOptionalCountCategory = OPTIONAL_COUNT_SUFFIXES.some((suffix) =>
          key.endsWith(suffix),
        );
        // Bu kategorilerde eksik değişken serbest (yukarıdaki gerekçe);
        // FAZLADAN bir değişken (en'de olmayan) hâlâ gerçek bir hata.
        const onlyMissingCount =
          isOptionalCountCategory &&
          b.filter((variable) => !a.includes(variable)).every((variable) => variable === "count") &&
          a.every((variable) => b.includes(variable));
        if (onlyMissingCount) continue;

        mismatched.push(`${key}: ${code}[${a.join(",")}] vs en[${b.join(",")}]`);
      }

      expect(mismatched).toEqual([]);
    },
  );
});
