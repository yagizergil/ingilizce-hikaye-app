import {
  buildGlossPrompt,
  FALLBACK_PROMPT_VERSIONS,
  glossMatchesNativeScript,
  normalizeSentence,
  normalizeSurface,
  parseGlossResponse,
  PROMPT_VERSION,
} from "../../../../../supabase/functions/translate-lemma/prompt";

describe("buildGlossPrompt", () => {
  const prompt = buildGlossPrompt({
    surface: "Sa",
    lemma: "sa",
    contextSentence: 'Sa grand-mère dit "bonjour".\nFin',
    targetLanguage: "fr",
    nativeLanguage: "tr",
  });

  it("names source and native language and includes the sentence", () => {
    expect(prompt).toContain("Source language: French");
    expect(prompt).toContain("in Turkish AS USED IN THIS SENTENCE");
    expect(prompt).toContain('Tapped word (exact form): "Sa"');
    expect(prompt).toContain("Sa grand-mère dit 'bonjour'. Fin");
  });

  it("covers contractions and possessives and asks for alternatives", () => {
    expect(prompt).toContain("à + le");
    expect(prompt).toContain("onun (dişil iyelik)");
    expect(prompt).toContain("zum");
    expect(prompt).toContain('"alternatives"');
    expect(prompt).toContain('"context_dependent"');
  });

  it("forbids reading the word as English", () => {
    expect(prompt).toMatch(/Never read it as an English word/);
  });
});

describe("parseGlossResponse", () => {
  it("parses a valid answer, even inside fences", () => {
    const parsed = parseGlossResponse(
      '```json\n{"gloss":"-e / -a (à + le)","lemma":"au","pos":"contraction","alternatives":["-de"],"context_dependent":false}\n```',
    );
    expect(parsed).toEqual({
      gloss: "-e / -a (à + le)",
      lemma: "au",
      pos: "contraction",
      alternatives: ["-de"],
      contextDependent: false,
    });
  });

  it("rejects empty or overlong glosses and garbage", () => {
    expect(parseGlossResponse('{"gloss":""}')).toBeNull();
    expect(parseGlossResponse(`{"gloss":"${"x".repeat(200)}"}`)).toBeNull();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(parseGlossResponse("not json")).toBeNull();
  });

  it("falls back to 'other' for unknown pos", () => {
    expect(parseGlossResponse('{"gloss":"onun","pos":"weird"}')?.pos).toBe("other");
  });
});

describe("normalizers", () => {
  it("normalizes surface and sentence", () => {
    expect(normalizeSurface("«Sa,")).toBe("sa");
    expect(normalizeSentence("  Il  va\nau marché ")).toBe("il va au marché");
  });
});

describe("prompt v3", () => {
  const base = {
    surface: "Deniz",
    lemma: "deniz",
    contextSentence: "Deniz dedi ki: geliyorum.",
    targetLanguage: "tr",
    nativeLanguage: "it",
  };

  it("bumps the version and keeps v2 as cache fallback", () => {
    expect(PROMPT_VERSION).toBe(3);
    expect(FALLBACK_PROMPT_VERSIONS).toEqual([2]);
  });

  it("covers role-first, proper nouns and CJK chunks", () => {
    const prompt = buildGlossPrompt(base);
    expect(prompt).toContain("ROLE FIRST");
    expect(prompt).toContain("PROPER NOUNS");
    expect(prompt).toContain("Japanese/Chinese");
    expect(prompt).not.toContain("previous answer");
  });

  it("adds a stricter instruction on retry", () => {
    expect(buildGlossPrompt({ ...base, strict: true })).toContain(
      "previous answer was not in Italian",
    );
  });
});

describe("glossMatchesNativeScript", () => {
  it("requires the native script for non-Latin natives", () => {
    expect(glossMatchesNativeScript("見る", "ja")).toBe(true);
    expect(glossMatchesNativeScript("to see", "ja")).toBe(false);
    expect(glossMatchesNativeScript("смотреть", "ru")).toBe(true);
    expect(glossMatchesNativeScript("watch", "ar")).toBe(false);
    expect(glossMatchesNativeScript("看", "zh")).toBe(true);
  });

  it("rejects foreign-only glosses for Latin natives but allows notes in parentheses", () => {
    expect(glossMatchesNativeScript("görmek", "tr")).toBe(true);
    expect(glossMatchesNativeScript("見る", "tr")).toBe(false);
    expect(glossMatchesNativeScript("смотреть", "de")).toBe(false);
    expect(glossMatchesNativeScript("bazı (des)", "tr")).toBe(true);
    expect(glossMatchesNativeScript("-(irgend)jemand (кто-то)", "de")).toBe(true);
  });
});
