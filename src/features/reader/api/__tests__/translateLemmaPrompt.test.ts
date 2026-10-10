import {
  buildGlossPrompt,
  normalizeSentence,
  normalizeSurface,
  parseGlossResponse,
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
