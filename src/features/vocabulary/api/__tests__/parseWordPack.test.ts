import { parseWordPack } from "@/features/vocabulary/api/useWordPackQuery";
import { parseBookWordOverlap } from "@/features/library/api/useBookWordOverlapQuery";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/languagePair", () => ({ useActiveLanguagePairQuery: jest.fn() }));

describe("parseWordPack", () => {
  it("ücretsiz önizlemeyi ve kilidi okur", () => {
    expect(
      parseWordPack({ isPremium: false, total: 40, locked: true, words: ["a1", "b2", 3] }),
    ).toEqual({ isPremium: false, total: 40, locked: true, lemmas: ["a1", "b2"] });
  });

  it("bozuk yanıtta güvenli varsayılana düşer", () => {
    expect(parseWordPack(null)).toEqual({ isPremium: false, total: 0, locked: false, lemmas: [] });
  });
});

describe("parseBookWordOverlap", () => {
  it("sayıyı ve örnekleri okur", () => {
    expect(parseBookWordOverlap({ count: 3, sample: ["x", "y"] })).toEqual({
      count: 3,
      sample: ["x", "y"],
    });
  });

  it("bozuk yanıtta sıfır döner", () => {
    expect(parseBookWordOverlap(undefined)).toEqual({ count: 0, sample: [] });
  });
});
