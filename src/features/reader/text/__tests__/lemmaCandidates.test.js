const { lemmatize, lemmaCandidates, inflectionHint } = require("../tokenizer");

/**
 * Kelime çözümlemesinin gerileme testleri.
 *
 * NEDEN BU TESTLER VAR (2026-09-07): kullanıcı "expressed kelimesinin
 * çevirisi yok" diye bildirdi. Kök neden bir sözlük boşluğu değildi —
 * ölçüldü: yayındaki kitaplarda geçen 23.551 lemma'nın SIFIRI sözlükte
 * eksik. Cihazdaki kural tabanlı gövdeleyici (ADR-008) yanlış kök
 * üretiyordu ve bütün bir kelime sınıfı sessizce çözümsüz kalıyordu.
 *
 * Bu tür hatalar gözle fark edilmiyor: uygulama çökmüyor, sadece o kelimede
 * "karşılık bulunamadı" yazıyor. Aşağıdaki durumların hepsi gerçekte
 * yaşanmış hatalar, uydurma örnekler değil.
 */

describe("lemmatize — ünsüz ikizi düzeltmesi", () => {
  // "ss"/"ll"/"ff"/"zz" kökün kendi yazımının parçasıdır, çekim ekinden
  // doğan bir ikizlenme değildir; açılmaları kelimeyi bozuyordu.
  it.each([
    ["expressed", "express"],
    ["expressing", "express"],
    ["spelled", "spell"],
    ["staffed", "staff"],
    ["buzzed", "buzz"],
  ])("%s -> %s (kök ikizi açılmamalı)", (surface, expected) => {
    expect(lemmatize(surface)).toBe(expected);
  });

  // Gerçek çekim ikizlenmesi açılmaya devam etmeli.
  it.each([
    ["stopped", "stop"],
    ["running", "run"],
    ["planned", "plan"],
  ])("%s -> %s (çekim ikizi açılmalı)", (surface, expected) => {
    expect(lemmatize(surface)).toBe(expected);
  });
});

describe("lemmaCandidates", () => {
  it("aşırı kırpılmış kökün doğrusunu aday olarak taşır", () => {
    // Kural "hott"/"happi"/"believ" üretiyor; doğru kök adaylar arasında
    // olmalı ki sözlük onu bulabilsin.
    expect(lemmaCandidates("hotter")).toContain("hot");
    expect(lemmaCandidates("happier")).toContain("happy");
    expect(lemmaCandidates("believed")).toContain("believe");
    expect(lemmaCandidates("agreed")).toContain("agree");
    expect(lemmaCandidates("freed")).toContain("free");
  });

  it("düşük güvenli kuralda yüzey biçimini kökten ÖNCE dener", () => {
    // "-er" kuralı sıradan isimleri kırpıyor: "butter" -> "butt" ("kıç"),
    // "letter" -> "lett". Yüzey biçimi sözlükte olduğu için önce
    // denenmeli, yoksa kullanıcı yanlış kelimenin çevirisini görür.
    const butter = lemmaCandidates("butter");
    expect(butter.indexOf("butter")).toBeLessThan(butter.indexOf("butt"));

    // Üç harften kısa kök de aşırı kırpma göstergesi: "dying" -> "dy".
    const dying = lemmaCandidates("dying");
    expect(dying.indexOf("dying")).toBeLessThan(dying.indexOf("dy"));
  });

  it("yüksek güvenli kuralda kökü yüzey biçiminden ÖNCE dener", () => {
    // "watched" -> "watch" doğru; sözlükteki "watched" (sıfat) kaydı değil.
    const watched = lemmaCandidates("watched");
    expect(watched.indexOf("watch")).toBeLessThan(watched.indexOf("watched"));

    // Düzensiz tablo yüksek güvenli: "saw" yüzeyi sözlükte "testere" olarak
    // da var ama kastedilen "see".
    const saw = lemmaCandidates("saw");
    expect(saw.indexOf("see")).toBeLessThan(saw.indexOf("saw"));
  });

  it("boş girdide çökmez", () => {
    expect(lemmaCandidates("")).toEqual([]);
    expect(lemmaCandidates(null)).toEqual([]);
  });
});

describe("inflectionHint", () => {
  // Sözlükte 2.345 kelimenin hem isim hem fiil anlamı var ve view her
  // zaman ismi ana karşılık seçiyor. Ek, hangisinin kastedildiğini
  // söylüyor: "watched" fiildir, gösterilecek anlam "izlemek".
  it.each([
    ["watched", "verb"],
    ["watching", "verb"],
    ["expressed", "verb"],
    ["saw", "verb"],
    ["hotter", "adjective"],
    ["biggest", "adjective"],
  ])("%s -> %s", (surface, expected) => {
    expect(inflectionHint(surface)).toBe(expected);
  });

  it("belirsiz durumlarda ipucu vermez", () => {
    // "-s" hem çoğul isim hem üçüncü tekil fiil olabilir; yanlış ipucu,
    // ipucu olmamasından kötüdür.
    expect(inflectionHint("cities")).toBeNull();
    // Çekim eki almamış kelime.
    expect(inflectionHint("watch")).toBeNull();
    // "-ing" ile biten ama fiil olmayan kelimeler istisna listesinde.
    expect(inflectionHint("king")).toBeNull();
    expect(inflectionHint("during")).toBeNull();
  });
});
