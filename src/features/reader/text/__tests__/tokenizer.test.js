const { tokenize, lemmatize, splitSentences } = require("../tokenizer");

describe("tokenize", () => {
  it("keeps contractions as single word tokens", () => {
    const words = tokenize("I don't know.").filter((t) => t.type === "word");
    expect(words.map((t) => t.text)).toEqual(["I", "don't", "know"]);
  });

  it("keeps possessives as single word tokens", () => {
    const words = tokenize("Frankenstein's monster").filter((t) => t.type === "word");
    expect(words.map((t) => t.text)).toEqual(["Frankenstein's", "monster"]);
  });

  it("keeps multi-apostrophe contractions as a single word token", () => {
    const words = tokenize("wouldn't've gone").filter((t) => t.type === "word");
    expect(words.map((t) => t.text)).toEqual(["wouldn't've", "gone"]);
  });

  it("round-trips exactly by concatenating all tokens, on a multi-sentence paragraph", () => {
    const text =
      "I am by birth a Genevese; and my family is one of the most " +
      "distinguished of that republic. My ancestors had been for many years " +
      "counsellors and syndics; and my father's reputation was well known.";
    const tokens = tokenize(text);
    const reconstructed = tokens.map((t) => t.text).join("");
    expect(reconstructed).toBe(text);
    // offsets are internally consistent too
    tokens.forEach((t) => {
      expect(text.slice(t.start, t.end)).toBe(t.text);
    });
  });

  it("returns an empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles a pure punctuation string without throwing", () => {
    const tokens = tokenize("... !? --");
    expect(tokens.every((t) => t.type === "other")).toBe(true);
    expect(tokens.map((t) => t.text).join("")).toBe("... !? --");
  });
});

describe("lemmatize", () => {
  it("resolves irregular verbs via the exact-match table", () => {
    expect(lemmatize("went")).toBe("go");
    expect(lemmatize("gone")).toBe("go");
    expect(lemmatize("was")).toBe("be");
    expect(lemmatize("were")).toBe("be");
    expect(lemmatize("been")).toBe("be");
  });

  it("resolves irregular plural nouns", () => {
    expect(lemmatize("children")).toBe("child");
    expect(lemmatize("mice")).toBe("mouse");
  });

  it("resolves irregular comparatives", () => {
    expect(lemmatize("better")).toBe("good");
    expect(lemmatize("worst")).toBe("bad");
  });

  it("applies the -ing consonant-doubling undo", () => {
    expect(lemmatize("running")).toBe("run");
  });

  it("applies the -ed consonant-doubling undo", () => {
    expect(lemmatize("stopped")).toBe("stop");
    expect(lemmatize("loved")).toBe("love");
  });

  it("applies the -ies -> y rule", () => {
    expect(lemmatize("flies")).toBe("fly");
  });

  it("produces the cascade's actual (imperfect) output for 'distinguished'", () => {
    // "distinguished" -ed stem is "distinguish" (ends in consonant "h"
    // preceded by consonant "s", so no e-restoration and no doubling
    // undo fires) -> the rule cascade correctly yields the true lemma here.
    expect(lemmatize("distinguished")).toBe("distinguish");
  });

  it("returns the lowercased surface unchanged on a full miss", () => {
    expect(lemmatize("Genevese")).toBe("genevese");
    expect(lemmatize("XYZQPR")).toBe("xyzqpr");
  });

  it("never returns empty string and never throws on empty input", () => {
    expect(() => lemmatize("")).not.toThrow();
    expect(lemmatize("")).toBe("");
  });

  it("guards common -er base nouns from being stripped", () => {
    expect(lemmatize("father")).toBe("father");
    expect(lemmatize("mother")).toBe("mother");
    expect(lemmatize("brother")).toBe("brother");
  });

  it("still strips -er on a genuine regular comparative", () => {
    expect(lemmatize("faster")).toBe("fast");
    expect(lemmatize("smaller")).toBe("small");
  });

  it("does not mis-strip 'after' as a comparative", () => {
    expect(lemmatize("after")).toBe("after");
  });

  it("does not mis-strip 'other' as a comparative", () => {
    expect(lemmatize("other")).toBe("other");
  });

  it("does not mis-strip 'never' as a comparative", () => {
    expect(lemmatize("never")).toBe("never");
  });

  it("does not mis-strip 'during' as a gerund", () => {
    expect(lemmatize("during")).toBe("during");
  });

  it("does not over-apply e-restoration to a long -er-ending -ed stem", () => {
    expect(lemmatize("discovered")).toBe("discover");
  });

  it("does not mis-strip 'indeed' as a past-tense -ed form", () => {
    expect(lemmatize("indeed")).toBe("indeed");
  });

  it("does not mis-strip other real words ending in 'eed'", () => {
    expect(lemmatize("need")).toBe("need");
    expect(lemmatize("speed")).toBe("speed");
    expect(lemmatize("proceed")).toBe("proceed");
  });
});

describe("splitSentences", () => {
  const paragraph =
    "I am by birth a Genevese; and my family is one of the most " +
    "distinguished of that republic. My ancestors had been for many years " +
    "counsellors and syndics; and my father had filled several public " +
    "situations with honour and reputation. He was respected by all who knew " +
    "him, for his integrity and indefatigable attention to public business.";

  it("splits the real Frankenstein Chapter I mockup paragraph into three sentences", () => {
    const sentences = splitSentences(paragraph);
    expect(sentences.length).toBe(3);
    expect(sentences[0].text.endsWith("republic.")).toBe(true);
    expect(sentences[1].text.trim().startsWith("My ancestors")).toBe(true);
    expect(sentences[2].text.trim().endsWith("business.")).toBe(true);
  });

  it("does not split after an abbreviation like 'Dr.'", () => {
    const sentences = splitSentences("Dr. Frankenstein began his work. He worked all night.");
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toBe("Dr. Frankenstein began his work.");
  });

  it("keeps a quoted exclamation and its attribution as one sentence", () => {
    const sentences = splitSentences('"Stop!" she cried. He did not listen.');
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toBe('"Stop!" she cried.');
  });

  it("returns an empty array for empty string", () => {
    expect(splitSentences("")).toEqual([]);
  });

  it("does not throw on pure punctuation", () => {
    expect(() => splitSentences("... !!! ???")).not.toThrow();
  });
});
