import {
  findWordIndexAtTime,
  mapTimingsToPage,
  type RawWordTiming,
  type TimedWord,
} from "@/features/reader/tts/chapterAudioTimings";
import { wordKey } from "@/features/reader/tts/ttsPlan";

import type { SpeechSegment } from "@/features/reader/tts/ttsPlan";

/**
 * Bulut sesinin kelime vurgusuna çevrilmesi.
 *
 * NEDEN TEST EDİLİYOR: bu dönüşüm iki farklı koordinat sistemi arasında
 * köprü kuruyor — zamanlama dosyası PARAGRAF koordinatlarında, ekrandaki
 * vurgu SAYFA PARÇASI koordinatlarında. Aradaki çeviri yanlış olursa
 * uygulama çökmez, sadece yanlış kelime vurgulanır ya da hiç vurgulanmaz;
 * gözle fark edilmesi zor, sessizce bozulan türden bir hata.
 */

/** Metinden kelime aralıklarını çıkaran küçük yardımcı. */
function words(text: string) {
  const result: { start: number; end: number }[] = [];
  const re = /[A-Za-z']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) result.push({ start: m.index, end: m.index + m[0].length });
  return result;
}

function segment(paragraphId: string, segmentCharStart: number, text: string): SpeechSegment {
  return { paragraphId, segmentCharStart, text, words: words(text) };
}

describe("mapTimingsToPage", () => {
  it("paragraf koordinatlarını sayfa parçası anahtarına çevirir", () => {
    // Paragrafın tamamı tek sayfada: parça 0'dan başlıyor.
    const segments = [segment("p1", 0, "The cat sat")];
    const paragraphIndex = new Map([["p1", 3]]);

    const timings: RawWordTiming[] = [
      { p: 3, s: 0, e: 3, t: 0.0 }, // The
      { p: 3, s: 4, e: 7, t: 0.4 }, // cat
      { p: 3, s: 8, e: 11, t: 0.9 }, // sat
    ];

    const mapped = mapTimingsToPage(timings, segments, paragraphIndex);

    expect(mapped).toEqual([
      { key: wordKey("p1", 0, 0), time: 0.0 },
      { key: wordKey("p1", 0, 4), time: 0.4 },
      { key: wordKey("p1", 0, 8), time: 0.9 },
    ]);
  });

  it("paragraf iki sayfaya bölündüğünde her kelimeyi doğru parçaya yazar", () => {
    // "The cat sat on the mat" ikiye bölünmüş: ikinci parça 12. karakterden
    // başlıyor, yani kendi içinde 0'dan sayıyor.
    const segments = [segment("p1", 0, "The cat sat"), segment("p1", 12, "on the mat")];
    const paragraphIndex = new Map([["p1", 0]]);

    const timings: RawWordTiming[] = [
      { p: 0, s: 4, e: 7, t: 0.4 }, // "cat"  -> ilk parça, token 4
      { p: 0, s: 15, e: 18, t: 1.5 }, // "the" -> ikinci parça, token 3
    ];

    const mapped = mapTimingsToPage(timings, segments, paragraphIndex);

    expect(mapped).toEqual([
      { key: wordKey("p1", 0, 4), time: 0.4 },
      { key: wordKey("p1", 12, 3), time: 1.5 },
    ]);
  });

  it("ekranda olmayan paragrafın kelimelerini sessizce atar", () => {
    // Sayfada yalnızca 0. paragraf var; ses ise bölümün tamamını okuyor.
    const segments = [segment("p1", 0, "The cat sat")];
    const paragraphIndex = new Map([["p1", 0]]);

    const timings: RawWordTiming[] = [
      { p: 0, s: 0, e: 3, t: 0.0 },
      { p: 7, s: 0, e: 5, t: 30.0 }, // baska bir paragraf
    ];

    const mapped = mapTimingsToPage(timings, segments, paragraphIndex);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]!.time).toBe(0.0);
  });

  it("parçada gerçekten kelime başlangıcı olmayan konumu eşleştirmez", () => {
    // s=5 "cat"in ortasina denk geliyor; boyle bir token yok.
    const segments = [segment("p1", 0, "The cat sat")];
    const paragraphIndex = new Map([["p1", 0]]);

    const mapped = mapTimingsToPage([{ p: 0, s: 5, e: 7, t: 0.4 }], segments, paragraphIndex);

    expect(mapped).toEqual([]);
  });

  it("sonucu her zaman zaman sırasına dizer", () => {
    const segments = [segment("p1", 0, "The cat sat")];
    const paragraphIndex = new Map([["p1", 0]]);

    const mapped = mapTimingsToPage(
      [
        { p: 0, s: 8, e: 11, t: 0.9 },
        { p: 0, s: 0, e: 3, t: 0.0 },
        { p: 0, s: 4, e: 7, t: 0.4 },
      ],
      segments,
      paragraphIndex,
    );

    expect(mapped.map((w) => w.time)).toEqual([0.0, 0.4, 0.9]);
  });

  it("boş girdide çökmez", () => {
    expect(mapTimingsToPage([], [], new Map())).toEqual([]);
  });
});

describe("findWordIndexAtTime", () => {
  const list: TimedWord[] = [
    { key: "a", time: 0.0 },
    { key: "b", time: 0.5 },
    { key: "c", time: 1.2 },
    { key: "d", time: 2.0 },
  ];

  it("verilen ana ait son kelimeyi bulur", () => {
    expect(findWordIndexAtTime(list, 0.0)).toBe(0);
    expect(findWordIndexAtTime(list, 0.4)).toBe(0);
    expect(findWordIndexAtTime(list, 0.5)).toBe(1);
    expect(findWordIndexAtTime(list, 1.9)).toBe(2);
    expect(findWordIndexAtTime(list, 99)).toBe(3);
  });

  it("hiçbir kelime başlamadıysa -1 döner", () => {
    expect(findWordIndexAtTime(list, -0.1)).toBe(-1);
  });

  it("boş listede -1 döner", () => {
    expect(findWordIndexAtTime([], 5)).toBe(-1);
  });
});
