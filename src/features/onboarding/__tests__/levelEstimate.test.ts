import {
  BAND_SIZE,
  CEFR_LEVELS,
  estimateLevel,
  readingLevelFor,
  type CefrLevel,
  type LevelTestItem,
  type WordAnswer,
} from "@/features/onboarding/levelEstimate";

/** Her banttan `perBand` kelimelik sahte bir test seti üretir. */
function buildItems(perBand = 6): LevelTestItem[] {
  return CEFR_LEVELS.flatMap((level) =>
    Array.from({ length: perBand }, (_unused, index) => ({
      lemma: `${level.toLowerCase()}_word_${index}`,
      level,
      trGloss: "karşılık",
    })),
  );
}

/** Verilen bantlara `known`, kalanlara `unknown` cevabı üretir. */
function answersFor(items: LevelTestItem[], knownLevels: CefrLevel[]) {
  const answers: Record<string, WordAnswer> = {};
  for (const item of items) {
    answers[item.lemma] = knownLevels.includes(item.level) ? "known" : "unknown";
  }
  return answers;
}

describe("estimateLevel", () => {
  const items = buildItems();

  it("hiçbir kelimeyi bilmeyeni A1 sayar", () => {
    const result = estimateLevel(items, answersFor(items, []));

    expect(result.level).toBe("A1");
    expect(result.estimatedSize).toBe(0);
  });

  it("yalnızca A1'i bileni A1 sayar", () => {
    const result = estimateLevel(items, answersFor(items, ["A1"]));

    expect(result.level).toBe("A1");
    expect(result.estimatedSize).toBe(BAND_SIZE.A1);
  });

  it("A1-B1 arasını bileni B1 sayar", () => {
    const result = estimateLevel(items, answersFor(items, ["A1", "A2", "B1"]));

    expect(result.level).toBe("B1");
    expect(result.estimatedSize).toBe(BAND_SIZE.A1 + BAND_SIZE.A2 + BAND_SIZE.B1);
  });

  it("hepsini bileni C2 sayar", () => {
    const result = estimateLevel(items, answersFor(items, [...CEFR_LEVELS]));

    expect(result.level).toBe("C2");
  });

  it("ardışık olmayan başarıyı yok sayar", () => {
    // B1'i bilmeyip C2'yi bildiğini iddia eden biri C2 değildir.
    const result = estimateLevel(items, answersFor(items, ["A1", "A2", "C2"]));

    expect(result.level).toBe("A2");
  });

  it("'emin değilim' yarım puan sayılır", () => {
    const answers: Record<string, WordAnswer> = {};
    for (const item of items) {
      answers[item.lemma] = item.level === "A1" ? "unsure" : "unknown";
    }

    const result = estimateLevel(items, answers);
    const a1 = result.bands.find((band) => band.level === "A1");

    expect(a1?.ratio).toBeCloseTo(0.5, 5);
    // %50, %80 eşiğini geçmediği için seviye yükselmiyor.
    expect(result.level).toBe("A1");
    expect(result.estimatedSize).toBe(Math.round(BAND_SIZE.A1 * 0.5));
  });

  it("cevaplanmamış kelimeyi bilinmiyor sayar", () => {
    const result = estimateLevel(items, {});

    expect(result.level).toBe("A1");
    expect(result.estimatedSize).toBe(0);
    expect(result.bands.every((band) => band.score === 0)).toBe(true);
  });

  it("%80 eşiğinin tam üstü bandı geçirir, altı geçirmez", () => {
    const fiveOfSix: Record<string, WordAnswer> = {};
    const fourOfSix: Record<string, WordAnswer> = {};
    for (const item of items) {
      const index = Number(item.lemma.split("_").pop());
      const isA1 = item.level === "A1";
      fiveOfSix[item.lemma] = isA1 && index < 5 ? "known" : "unknown";
      fourOfSix[item.lemma] = isA1 && index < 4 ? "known" : "unknown";
    }

    // 5/6 = %83 -> geçer, 4/6 = %67 -> geçmez.
    expect(estimateLevel(items, fiveOfSix).bands[0]?.ratio).toBeGreaterThan(0.8);
    expect(estimateLevel(items, fourOfSix).bands[0]?.ratio).toBeLessThan(0.8);
  });

  it("her bant için sonuç satırı döndürür", () => {
    const result = estimateLevel(items, answersFor(items, ["A1"]));

    expect(result.bands).toHaveLength(CEFR_LEVELS.length);
    expect(result.bands.map((band) => band.level)).toEqual(CEFR_LEVELS);
    expect(result.bands.every((band) => band.asked === 6)).toBe(true);
  });
});

describe("readingLevelFor", () => {
  it("okuma seviyesi tahminin bir altıdır", () => {
    expect(readingLevelFor("B2")).toBe("B1");
    expect(readingLevelFor("C1")).toBe("B2");
  });

  it("A1'in altına inmez", () => {
    expect(readingLevelFor("A1")).toBe("A1");
  });
});
