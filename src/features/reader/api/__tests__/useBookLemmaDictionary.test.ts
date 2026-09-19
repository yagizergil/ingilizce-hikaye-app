import { act } from "react-test-renderer";

import { renderHookWithClient } from "@/test-utils/renderHookWithClient";
import { useBookLemmaDictionary } from "@/features/reader/api/useBookLemmaDictionary";

// expo-sqlite has no jsdom/node implementation; the hook module itself
// guards this with `Platform.OS === "web"`, but jest-expo's default test
// environment reports Platform.OS as "ios", so the module would still try
// to `require("expo-sqlite")` and call `openDatabaseSync` for real. Mock
// it so the cache reads/writes in the hook are no-ops in this suite (the
// dictionary-merge behavior under test doesn't depend on the SQLite
// cache).
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

interface QueryBuilderMock {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  in: jest.Mock;
}

/**
 * `book_lemmas` artık SAYFALANARAK okunuyor (PostgREST bu projede en fazla
 * 1000 satır döndürüp fazlasını sessizce kesiyordu -- bkz. kaynaktaki
 * `fetchAllBookLemmas` notu). Mock bu yüzden `.order().range()` zincirini
 * ve sayfa sayfa yanıt vermeyi desteklemek zorunda.
 *
 * `pages`: her `.range()` çağrısı için sırayla dönecek satır dizileri.
 */
function makeBookLemmasBuilder(
  pages: { data: unknown; error: unknown }[],
  onRange?: (from: number, to: number) => void,
): QueryBuilderMock {
  const builder: Partial<QueryBuilderMock> = {};
  let call = 0;
  builder.select = jest.fn(() => builder as QueryBuilderMock);
  builder.eq = jest.fn(() => builder as QueryBuilderMock);
  builder.order = jest.fn(() => builder as QueryBuilderMock);
  builder.range = jest.fn((from: number, to: number) => {
    onRange?.(from, to);
    const page = pages[call] ?? { data: [], error: null };
    call += 1;
    return Promise.resolve(page);
  });
  return builder as QueryBuilderMock;
}

function makeCanonicalBuilder(result: { data: unknown; error: unknown }): QueryBuilderMock {
  const builder: Partial<QueryBuilderMock> = {};
  builder.select = jest.fn(() => builder as QueryBuilderMock);
  builder.in = jest.fn(() => Promise.resolve(result));
  return builder as QueryBuilderMock;
}

/**
 * A fixed number of microtask ticks isn't reliable here: the queryFn goes
 * through several chained `await`s (book_lemmas select -> canonical
 * select -> setCachedDictionary) before React Query settles the query and
 * re-renders. Poll instead, wrapping each check in `act` so React Query's
 * internal state updates are flushed, until the condition passes or a
 * generous ceiling is hit (fails loudly rather than hanging).
 */
async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  for (;;) {
    let passed = false;
    await act(async () => {
      await Promise.resolve();
      passed = condition();
    });
    if (passed) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor: condition did not become true in time");
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

describe("useBookLemmaDictionary", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("merges book_lemmas with lemma_canonical rows into a Map keyed by lemma", async () => {
    mockFrom.mockImplementationOnce(() =>
      makeBookLemmasBuilder([
        { data: [{ lemma: "distinguished" }, { lemma: "genevese" }], error: null },
      ]),
    );
    mockFrom.mockImplementationOnce(() =>
      makeCanonicalBuilder({
        data: [
          {
            lemma: "distinguished",
            pos: "adj",
            cefr_level: "B1",
            tr_gloss: "seçkin",
            ipa: "/dɪˈstɪŋɡwɪʃt/",
            audio_url: null,
            is_phrasal: false,
            false_friend_note_tr: null,
          },
        ],
        error: null,
      }),
    );

    const { result } = renderHookWithClient(() => useBookLemmaDictionary("book-1"));
    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toBeInstanceOf(Map);
    const dict = result.current.data as Map<string, unknown>;
    expect(dict.get("distinguished")).toEqual({
      pos: "adj",
      cefrLevel: "B1",
      trGloss: "seçkin",
      ipa: "/dɪˈstɪŋɡwɪʃt/",
      audioUrl: null,
      isPhrasal: false,
      falseFriendNoteTr: null,
      // migration 027 ile eklendi: satirda `senses` yoksa toDictionary
      // bos dizi yaziyor, alan hicbir zaman undefined kalmiyor.
      senses: [],
    });

    // "genevese" is present in book_lemmas but missing from the
    // lemma_canonical response — the merge must not crash, and the
    // real behavior (per toDictionary in the source) is that it's
    // simply absent from the resulting Map rather than getting a
    // partial/undefined entry.
    expect(dict.has("genevese")).toBe(false);
    expect(dict.size).toBe(1);
  });

  it("returns an empty Map without querying lemma_canonical when book_lemmas is empty", async () => {
    mockFrom.mockImplementationOnce(() => makeBookLemmasBuilder([{ data: [], error: null }]));

    const { result } = renderHookWithClient(() => useBookLemmaDictionary("book-empty"));
    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toBeInstanceOf(Map);
    expect((result.current.data as Map<string, unknown>).size).toBe(0);
    // Only the book_lemmas query should have run.
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("book_lemmas");
  });
  /**
   * ÇÖZÜLEN HATA (2026-09-19): `book_lemmas` sayfalanmadan çekiliyordu.
   * PostgREST bu projede en fazla 1000 satır döndürüp fazlasını SESSİZCE
   * kesiyor (HTTP 206). Yayındaki 529 kitabın 194'ünde kelime sayısı
   * 1000'in üstünde, yani o kitaplarda çevrimdışı sözlük dağarcığın
   * yalnızca bir kısmını içeriyordu; eksik her kelime dokunulduğunda ağ
   * turuna düşüyordu. Bu test tam dolu bir sayfanın ARDINDAN devam
   * gelmesini zorunlu kılıyor.
   */
  it("1000 satırlık sayfa sınırının ötesindeki kelimeleri de çeker", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ lemma: `w${i}` }));
    const secondPage = [{ lemma: "sonuncu" }];
    const pages = [
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ];
    const ranges: [number, number][] = [];
    const askedFor: string[] = [];

    // Sayfalama HER SAYFA İÇİN `from("book_lemmas")` çağırıyor, yani çağrı
    // sırasına göre kurulmuş bir mock yetmez -- tabloya göre yönlendiriyoruz.
    let pageIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "book_lemmas") {
        const page = pages[pageIndex] ?? { data: [], error: null };
        pageIndex += 1;
        return makeBookLemmasBuilder([page], (from, to) => ranges.push([from, to]));
      }
      const builder = makeCanonicalBuilder({ data: [], error: null });
      builder.in = jest.fn((_column: string, values: string[]) => {
        askedFor.push(...values);
        return Promise.resolve({ data: [], error: null });
      });
      return builder;
    });

    const { result } = renderHookWithClient(() => useBookLemmaDictionary("book-buyuk"));
    await waitFor(() => result.current.isSuccess);

    // İlk sayfa TAM DOLU geldiği için döngü ikinci sayfayı da istedi.
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    // Ve 1000. sınırın ötesindeki kelime gerçekten sorulanlar arasında.
    expect(askedFor).toContain("sonuncu");
    expect(askedFor).toHaveLength(1001);
  });
});
