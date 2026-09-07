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
  in: jest.Mock;
}

function makeBookLemmasBuilder(result: { data: unknown; error: unknown }): QueryBuilderMock {
  const builder: Partial<QueryBuilderMock> = {};
  builder.select = jest.fn(() => builder as QueryBuilderMock);
  builder.eq = jest.fn(() => Promise.resolve(result));
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
      makeBookLemmasBuilder({ data: [{ lemma: "distinguished" }, { lemma: "genevese" }], error: null }),
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
    mockFrom.mockImplementationOnce(() => makeBookLemmasBuilder({ data: [], error: null }));

    const { result } = renderHookWithClient(() => useBookLemmaDictionary("book-empty"));
    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toBeInstanceOf(Map);
    expect((result.current.data as Map<string, unknown>).size).toBe(0);
    // Only the book_lemmas query should have run.
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("book_lemmas");
  });
});
