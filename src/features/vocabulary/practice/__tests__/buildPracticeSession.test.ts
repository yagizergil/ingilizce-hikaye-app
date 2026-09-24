import {
  CLOZE_BLANK,
  blankOut,
  buildPracticeSession,
  isTypedAnswerCorrect,
} from "@/features/vocabulary/practice/buildPracticeSession";

import type { VocabularyWord } from "@/features/vocabulary/types";

function word(lemma: string, extra: Partial<VocabularyWord> = {}): VocabularyWord {
  return {
    id: `id-${lemma}`,
    lemma,
    gloss: `${lemma}-tr`,
    pos: null,
    cefrLevel: null,
    sourceTitle: null,
    dueAt: null,
    state: "learning",
    createdAt: "2026-09-01T00:00:00Z",
    surface: lemma,
    contextText: null,
    bookId: null,
    ...extra,
  };
}

/** Belirlenebilir sözde-rastgele üreteç. */
function seeded(seed = 42) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const NOW = new Date("2026-09-24T12:00:00Z").getTime();

describe("blankOut", () => {
  it("kelimeyi tam kelime olarak boşlukla değiştiriyor", () => {
    expect(blankOut("She went home early.", "went")).toBe(`She ${CLOZE_BLANK} home early.`);
  });

  it("başka bir kelimenin parçasını boşaltmıyor", () => {
    expect(blankOut("The cat sat on the category.", "cat")).toBe(
      `The ${CLOZE_BLANK} sat on the category.`,
    );
  });

  it("boşluksuz dillerde (Çince) de çalışıyor", () => {
    expect(blankOut("我喜欢猫。", "猫")).toBe(`我喜欢${CLOZE_BLANK}。`);
  });

  it("cümlede yoksa null", () => {
    expect(blankOut("Nothing here.", "went")).toBeNull();
  });
});

describe("buildPracticeSession", () => {
  it("4'ten az anlamlı kelimede oturum kurmuyor", () => {
    const words = [word("a"), word("b"), word("c"), word("d", { gloss: null })];
    expect(buildPracticeSession(words, NOW, seeded())).toEqual([]);
  });

  it("her çoktan seçmeli soruda doğru cevap seçeneklerde ve 4 farklı seçenek var", () => {
    const words = ["go", "run", "eat", "sleep", "read", "walk"].map((lemma) => word(lemma));
    const session = buildPracticeSession(words, NOW, seeded());
    expect(session.length).toBe(6);
    for (const exercise of session) {
      if (exercise.kind === "typing") continue;
      expect(exercise.options).toContain(exercise.answer);
      expect(new Set(exercise.options).size).toBe(4);
    }
  });

  it("okunan cümle varsa boşluk doldurma kuruyor", () => {
    const words = [
      word("go", { surface: "went", contextText: "She went home early." }),
      word("run"),
      word("eat"),
      word("sleep"),
    ];
    const session = buildPracticeSession(words, NOW, seeded());
    const cloze = session.find((exercise) => exercise.kind === "cloze");
    expect(cloze).toBeDefined();
    expect(cloze?.prompt).toContain(CLOZE_BLANK);
    expect(cloze?.kind === "cloze" && cloze.answer).toBe("went");
  });

  it("dinleme sorusu kelimeyi seslendirip anlamını soruyor", () => {
    const words = ["go", "run", "eat", "sleep", "read", "walk"].map((lemma) => word(lemma));
    const listening = buildPracticeSession(words, NOW, seeded()).find(
      (exercise) => exercise.kind === "listening",
    );
    expect(listening).toBeDefined();
    expect(listening?.kind === "listening" && listening.answer).toBe(`${listening?.lemma}-tr`);
  });

  it("vadesi gelmiş kelimeleri öne alıyor", () => {
    const words = [
      ...["a", "b", "c", "d", "e"].map((lemma) => word(lemma, { state: "known" })),
      word("due", { dueAt: "2026-09-20T00:00:00Z" }),
    ];
    const session = buildPracticeSession(words, NOW, seeded(), 2);
    expect(session[0]?.lemma).toBe("due");
  });
});

describe("isTypedAnswerCorrect", () => {
  it("büyük/küçük harf ve boşluk farkını yok sayıyor", () => {
    expect(isTypedAnswerCorrect("  Go ", "go", "en")).toBe(true);
    expect(isTypedAnswerCorrect("goes", "go", "en")).toBe(false);
  });
});
