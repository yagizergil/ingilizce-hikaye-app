import {
  isReadableProse,
  pickPassageParagraphs,
} from "@/features/onboarding/api/useOnboardingContentQuery";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const PROSE =
  "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare. I am already far north of London.";

describe("isReadableProse", () => {
  it("rejects letter headers and dates (Frankenstein bug)", () => {
    expect(isReadableProse("To Mrs. Saville, England")).toBe(false);
    expect(isReadableProse("St. Petersburgh, Dec. 11th, 17—")).toBe(false);
    expect(isReadableProse("Letter 1")).toBe(false);
  });

  it("accepts a long prose paragraph", () => {
    expect(isReadableProse(PROSE)).toBe(true);
  });
});

describe("pickPassageParagraphs", () => {
  it("skips the header lines and returns real prose", () => {
    const picked = pickPassageParagraphs([
      "To Mrs. Saville, England",
      "St. Petersburgh, Dec. 11th, 17—",
      PROSE,
      PROSE,
    ]);
    expect(picked).toEqual([PROSE, PROSE]);
  });

  it("returns nothing when no prose exists", () => {
    expect(pickPassageParagraphs(["Chapter 1", "Short line."])).toEqual([]);
  });
});
