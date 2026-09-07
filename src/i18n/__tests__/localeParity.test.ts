import en from "@/i18n/locales/en.json";
import tr from "@/i18n/locales/tr.json";

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
 * Üç şey doğrulanıyor:
 *  1. İki dosyanın anahtar kümeleri birebir aynı.
 *  2. Hiçbir değer boş değil.
 *  3. Çoğul anahtarlar (`_one`/`_other`) eksiksiz çift hâlinde.
 */

type Json = { [key: string]: string | Json };

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

const trFlat = flatten(tr as unknown as Json);
const enFlat = flatten(en as unknown as Json);

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

describe("çeviri dosyaları", () => {
  it("tr ve en birebir aynı anahtarlara sahip", () => {
    const missingInEn = [...trFlat.keys()].filter((key) => !enFlat.has(key)).sort();
    const missingInTr = [...enFlat.keys()].filter((key) => !trFlat.has(key)).sort();

    expect({ missingInEn, missingInTr }).toEqual({ missingInEn: [], missingInTr: [] });
  });

  it.each([
    ["tr", trFlat],
    ["en", enFlat],
  ])("%s içinde beklenmeyen boş değer yok", (_locale, flat) => {
    const empty = [...flat.entries()]
      .filter(([key, value]) => value.trim().length === 0 && !INTENTIONALLY_EMPTY.has(key))
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("bilerek boş bırakılmış her anahtar hâlâ mevcut", () => {
    // Liste bayatlamasın: anahtar silinirse ya da doldurulursa bu test
    // düşer ve yukarıdaki gerekçe gözden geçirilir.
    for (const key of INTENTIONALLY_EMPTY) {
      expect(trFlat.get(key)).toBe("");
      expect(enFlat.get(key)).toBe("");
    }
  });

  it.each([
    ["tr", trFlat],
    ["en", enFlat],
  ])("%s içinde her çoğul anahtarın hem _one hem _other hâli var", (_locale, flat) => {
    // i18next `count` verildiğinde `_one`/`_other` sonekli anahtarı arıyor.
    // Yalnızca birini tanımlamak, o dilde bazı sayılarda anahtarın ham
    // hâlinin görünmesine yol açar.
    const incomplete: string[] = [];

    for (const key of flat.keys()) {
      if (key.endsWith("_one") && !flat.has(`${key.slice(0, -4)}_other`)) {
        incomplete.push(key);
      }
      if (key.endsWith("_other") && !flat.has(`${key.slice(0, -6)}_one`)) {
        incomplete.push(key);
      }
    }

    expect(incomplete.sort()).toEqual([]);
  });

  it("interpolasyon değişkenleri iki dilde aynı", () => {
    // "{{count}} kelime" karşılığına "{{total}} words" yazmak, çalışma
    // zamanında sessizce boş bir değişken bırakır.
    const variablesOf = (value: string) =>
      [...value.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((match) => match[1]).sort();

    const mismatched: string[] = [];
    for (const [key, trValue] of trFlat) {
      const enValue = enFlat.get(key);
      if (enValue === undefined) continue;
      const a = variablesOf(trValue);
      const b = variablesOf(enValue);
      if (a.join(",") !== b.join(",")) {
        mismatched.push(`${key}: tr[${a.join(",")}] vs en[${b.join(",")}]`);
      }
    }

    expect(mismatched).toEqual([]);
  });
});
