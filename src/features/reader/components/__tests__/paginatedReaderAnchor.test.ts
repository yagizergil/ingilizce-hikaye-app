import { paginate } from "@/features/reader/pagination/paginate";
import {
  findPageForPosition,
  nextPageContainerSize,
} from "@/features/reader/components/PaginatedReaderView";

import type { PageContainerSize } from "@/features/reader/components/PaginatedReaderView";
import type { MeasuredLine, MeasuredParagraph } from "@/features/reader/pagination/types";

// `PaginatedReaderView` -> `useChapterPagination` -> `pageCache` zinciri
// modul yuklenirken expo-sqlite'i aciyor; jest-expo Platform.OS'u "ios"
// bildirdigi icin modulun kendi web guard'i devreye girmiyor. Bu dosya
// yalnizca saf `findPageForPosition` fonksiyonunu test ediyor, onbellegin
// davranisiyla ilgisi yok -- acilisi no-op'a cevirmek yeterli.
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({
    execSync: jest.fn(),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(),
  }),
}));

/**
 * OKUMA KONUMU, YENIDEN SAYFALAMADAN SAG CIKMALI (2026-09-19).
 *
 * `PaginatedReaderView` gorunen sayfayi artik bir index olarak degil,
 * metne bagli bir CIPA (paragraphId + charOffset) olarak tutuyor; index
 * ondan turetiliyor. Bu dosya o sozlesmenin regresyon testi.
 *
 * Neden gerekiyordu: okuma yuzeyinin yuksekligi mesru sebeplerle
 * degisebiliyor (yazi tipi/satir araligi/kenar boslugu ayari, ekran
 * dondurme, premium ses cubugunun sunucu yaniti gelince belirmesi). Her
 * boyut degisimi butun bolumu yeniden sayfaliyor. Eskiden index oldugu
 * yerde kaliyordu, yani ayni numara ARTIK BASKA BIR METNE denk geliyordu:
 * kullanici parmagini surmeden okudugu cumle bir baskasiyla degisiyordu.
 */

const LINE_HEIGHT = 20;
const CHARS_PER_LINE = 10;

function makeParagraph(
  paragraphId: string,
  paragraphIndex: number,
  lineCount: number,
): MeasuredParagraph {
  const lines: MeasuredLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const charStart = i * CHARS_PER_LINE;
    lines.push({
      text: `${paragraphId}-line-${i}`,
      charStart,
      charEnd: charStart + CHARS_PER_LINE,
      height: LINE_HEIGHT,
    });
  }
  return { paragraphId, paragraphIndex, lines };
}

const CHAPTER: MeasuredParagraph[] = [
  makeParagraph("p1", 0, 5),
  makeParagraph("p2", 1, 6),
  makeParagraph("p3", 2, 4),
  makeParagraph("p4", 3, 7),
  makeParagraph("p5", 4, 3),
];

describe("anchor survives repagination", () => {
  it("keeps the reader on the same text when the reading surface shrinks", () => {
    // Ayni bolum, iki farkli yukseklikte: ses cubugu belirdiginde olan sey.
    const tall = paginate(CHAPTER, 200, 20);
    const short = paginate(CHAPTER, 140, 20);

    expect(tall.length).not.toBe(short.length);

    for (let pageIndex = 0; pageIndex < tall.length; pageIndex++) {
      const anchorSegment = tall[pageIndex]?.segments[0];
      expect(anchorSegment).toBeDefined();
      const anchor = anchorSegment as NonNullable<typeof anchorSegment>;

      const resolved = findPageForPosition(short, anchor.paragraphId, anchor.charStart);
      expect(resolved).not.toBeNull();

      // Cipanin dustugu sayfa, cipanin isaret ettigi metni GERCEKTEN
      // iceriyor olmali -- "ayni index" degil, "ayni metin".
      const landedOn = short[resolved as number];
      expect(landedOn).toBeDefined();
      const contains = (landedOn as NonNullable<typeof landedOn>).segments.some(
        (segment) =>
          segment.paragraphId === anchor.paragraphId &&
          anchor.charStart >= segment.charStart &&
          anchor.charStart < segment.charEnd,
      );
      expect(contains).toBe(true);
    }
  });

  it("would have been wrong to keep the raw page index", () => {
    // Eski davranisin neden bozuk oldugunu acikca kilitliyor: en az bir
    // sayfa numarasi, yeniden sayfalamadan sonra baska bir metne denk
    // geliyor. Bu test kirmiziya donerse iki sayfalama ayrismiyordur ve
    // yukaridaki test de bir sey kanitlamiyordur.
    const tall = paginate(CHAPTER, 200, 20);
    const short = paginate(CHAPTER, 140, 20);

    const driftedPages = tall.filter((page, index) => {
      const anchor = page.segments[0];
      const sameIndexPage = short[index];
      if (!anchor || !sameIndexPage) return true;
      return !sameIndexPage.segments.some(
        (segment) =>
          segment.paragraphId === anchor.paragraphId &&
          anchor.charStart >= segment.charStart &&
          anchor.charStart < segment.charEnd,
      );
    });

    expect(driftedPages.length).toBeGreaterThan(0);
  });

  it("falls back to the first page for an anchor that no longer exists", () => {
    const pages = paginate(CHAPTER, 140, 20);
    expect(findPageForPosition(pages, "silinmis-paragraf", 0)).toBeNull();
  });
});

/**
 * OKUMA ALANININ YÜKSEKLİĞİ ASLA BÜYÜMEZ.
 *
 * Kullanıcının bildirdiği "son sayfada git-gel" hatasının altındaki geri
 * besleme döngüsü: footer'ın görünümü "son sayfada mıyız" sorusuna bağlı,
 * o soru sayfa sayısına, sayfa sayısı okuma alanının yüksekliğine, o da
 * footer'ın boyuna. A -> B -> A.
 *
 * Footer'ın kendisi ayrıca sabit yüksekliğe çekildi (bkz. ReaderFooter),
 * ama asıl koruma bu: kabul edilen yükseklik ZAMANLA AZALAN bir dizi.
 * Azalan bir dizi eski bir değerine asla dönemez, yani döngü kurulamaz --
 * gelecekte hangi kardeş bileşen boy değiştirirse değiştirsin.
 */
describe("nextPageContainerSize", () => {
  const W = 390;

  it("ilk ölçümü olduğu gibi kabul eder", () => {
    expect(nextPageContainerSize({ width: 0, height: 0 }, { width: W, height: 700 })).toEqual({
      width: W,
      height: 700,
    });
  });

  it("küçülmeyi kabul eder (içerik asla taşmasın)", () => {
    expect(nextPageContainerSize({ width: W, height: 700 }, { width: W, height: 677 })).toEqual({
      width: W,
      height: 677,
    });
  });

  it("büyümeyi YOK SAYAR -- döngünün geri dönüş ayağı budur", () => {
    expect(nextPageContainerSize({ width: W, height: 677 }, { width: W, height: 700 })).toEqual({
      width: W,
      height: 677,
    });
  });

  it("alt piksel gürültüsünü yeniden sayfalama sebebi saymaz", () => {
    const previous = { width: W, height: 677 };
    expect(nextPageContainerSize(previous, { width: W, height: 676.8 })).toBe(previous);
    expect(nextPageContainerSize(previous, { width: W + 0.2, height: 677 })).toBe(previous);
  });

  it("genişlik değişince (ekran döndürme) yüksekliği yeniden öğrenir", () => {
    expect(nextPageContainerSize({ width: W, height: 677 }, { width: 844, height: 300 })).toEqual({
      width: 844,
      height: 300,
    });
  });

  it("footer'ın git-gelini besleyen ölçüm dizisi tek bir değerde durulur", () => {
    // Gerçek senaryo: footer yüzde (700) <-> düğme (677) arasında salınıyor.
    const measurements = [700, 677, 700, 677, 700, 677, 700];
    let size: PageContainerSize = { width: 0, height: 0 };
    const accepted: number[] = [];

    for (const height of measurements) {
      const next = nextPageContainerSize(size, { width: W, height });
      if (next !== size) accepted.push(next.height);
      size = next;
    }

    // İki kabul: ilk ölçüm, sonra tek bir küçülme. Sonrası sessiz.
    expect(accepted).toEqual([700, 677]);
    expect(size.height).toBe(677);
  });
});
