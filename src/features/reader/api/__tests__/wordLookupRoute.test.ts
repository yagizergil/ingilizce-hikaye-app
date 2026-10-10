import { wordLookupRoute } from "@/features/reader/api/wordLookupRoute";
import {
  buildContextualGlossRequest,
  contextualGlossQueryKey,
} from "@/features/reader/api/useContextualWordGloss";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("wordLookupRoute", () => {
  it("uses the English-Turkish dictionary only for en -> tr", () => {
    expect(wordLookupRoute({ targetLanguage: "en", nativeLanguage: "tr" })).toBe(
      "en-tr-dictionary",
    );
  });

  it.each(["fr", "de", "es", "it", "ru", "ja", "zh", "ar", "tr"])(
    "never routes a %s book to the English dictionary for a Turkish reader",
    (target) => {
      expect(wordLookupRoute({ targetLanguage: target, nativeLanguage: "tr" })).toBe("contextual");
    },
  );

  it("routes English books for non-Turkish readers to the contextual translator", () => {
    expect(wordLookupRoute({ targetLanguage: "en", nativeLanguage: "de" })).toBe("contextual");
  });

  it("waits while the pair is unknown", () => {
    expect(wordLookupRoute(undefined)).toBe("pending");
    expect(wordLookupRoute(null)).toBe("pending");
  });
});

describe("contextual gloss request", () => {
  const params = { surface: "au", lemma: "au", sentence: "Il va au marché." };
  const pair = { targetLanguage: "fr", nativeLanguage: "tr" };

  it("always sends both languages and the sentence", () => {
    expect(buildContextualGlossRequest(params, pair)).toEqual({
      surface: "au",
      lemma: "au",
      contextSentence: "Il va au marché.",
      nativeLanguage: "tr",
      targetLanguage: "fr",
    });
  });

  it("keys the cache by language pair and sentence", () => {
    const fr = contextualGlossQueryKey(params, pair);
    const es = contextualGlossQueryKey(params, { targetLanguage: "es", nativeLanguage: "tr" });
    const other = contextualGlossQueryKey({ ...params, sentence: "Au revoir." }, pair);
    expect(fr).not.toEqual(es);
    expect(fr).not.toEqual(other);
  });
});
