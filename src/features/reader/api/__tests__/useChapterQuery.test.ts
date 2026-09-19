import { fetchChapter } from "@/features/reader/api/useChapterQuery";

// expo-sqlite'ın jsdom/node karşılığı yok; bölüm önbelleği bu testte no-op.
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({
    execSync: jest.fn(),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(),
  }),
}));

const mockFrom = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/**
 * ÇÖZÜLEN HATA (2026-09-19): bölüm metni 1000 paragrafta SESSİZCE
 * kırpılıyordu.
 *
 * Paragraflar `book_sections` sorgusuna GÖMÜLÜ çekiliyordu ve gömülü
 * kaynaklar da PostgREST'in 1000 satır sınırına tabi; fazlası hata
 * vermeden kesiliyor. Yayında 1000 paragrafı aşan dört bölüm var (en
 * uzunu 1.473 paragraf) -- o bölümleri okuyan kullanıcı metnin sonunu hiç
 * görmüyordu. Bu test tam dolu bir sayfanın ARDINDAN devam gelmesini
 * zorunlu kılıyor.
 */

interface PageResult {
  data: unknown;
  error: unknown;
}

function makeSectionBuilder(result: PageResult) {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.gt = jest.fn(() => builder);
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.single = jest.fn(() => Promise.resolve(result));
  return builder;
}

function makeParagraphBuilder(page: PageResult, onRange: (from: number, to: number) => void) {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.range = jest.fn((from: number, to: number) => {
    onRange(from, to);
    return Promise.resolve(page);
  });
  return builder;
}

describe("fetchChapter", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("1000 paragraf sınırının ötesindeki metni de çeker", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({
      id: `p${i}`,
      order_index: i,
      text: `paragraf ${i}`,
    }));
    const secondPage = [{ id: "son", order_index: 1000, text: "son paragraf" }];
    const pages: PageResult[] = [
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ];

    const ranges: [number, number][] = [];
    let paragraphCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "book_paragraphs") {
        const page = pages[paragraphCall] ?? { data: [], error: null };
        paragraphCall += 1;
        return makeParagraphBuilder(page, (from, to) => ranges.push([from, to]));
      }
      // book_sections: hem bölümün kendisi hem de "sonraki bölüm" sorgusu.
      return makeSectionBuilder({
        data: {
          id: "s1",
          book_id: "b1",
          order_index: 0,
          title: "Bölüm",
          word_count: 100,
          audio_url: null,
          audio_timings_url: null,
        },
        error: null,
      });
    });

    const chapter = await fetchChapter("s1");

    // İlk sayfa TAM DOLU geldiği için ikinci sayfa da istendi.
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    // Ve sınırın ötesindeki paragraf gerçekten bölümün içinde.
    expect(chapter.paragraphs).toHaveLength(1001);
    expect(chapter.paragraphs[1000]?.text).toBe("son paragraf");
  });

  it("kısmi ilk sayfada ikinci istek atmaz", async () => {
    const ranges: [number, number][] = [];
    let paragraphCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "book_paragraphs") {
        paragraphCall += 1;
        return makeParagraphBuilder(
          { data: [{ id: "p0", order_index: 0, text: "tek paragraf" }], error: null },
          (from, to) => ranges.push([from, to]),
        );
      }
      return makeSectionBuilder({
        data: {
          id: "s1",
          book_id: "b1",
          order_index: 0,
          title: null,
          word_count: null,
          audio_url: null,
          audio_timings_url: null,
        },
        error: null,
      });
    });

    const chapter = await fetchChapter("s1");

    expect(paragraphCall).toBe(1);
    expect(ranges).toEqual([[0, 999]]);
    expect(chapter.paragraphs).toHaveLength(1);
  });
});
