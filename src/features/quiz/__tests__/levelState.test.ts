import { levelState, nextLevelIndex } from "@/features/quiz/levelState";

import type { BookQuizLevel } from "@/features/quiz/types";

function levels(scores: (number | null)[]): BookQuizLevel[] {
  return scores.map((bestCorrect, i) => ({
    quizId: `q${i + 1}`,
    level: (i + 1) as 1 | 2 | 3,
    questionCount: i === 0 ? 6 : 8,
    bestCorrect,
  }));
}

describe("levelState", () => {
  it("opens only the first level for a new reader", () => {
    const l = levels([null, null, null]);
    expect(levelState(l, 0, false)).toBe("open");
    expect(levelState(l, 1, false)).toBe("locked");
    expect(levelState(l, 2, true)).toBe("locked");
  });

  it("requires 60% on the previous level", () => {
    expect(levelState(levels([3, null, null]), 1, true)).toBe("locked");
    expect(levelState(levels([4, null, null]), 1, true)).toBe("open");
  });

  it("asks a free reader for premium only when the level is next in line", () => {
    expect(levelState(levels([6, null, null]), 1, false)).toBe("premium");
    expect(levelState(levels([6, null, null]), 2, false)).toBe("locked");
  });

  it("shows a lapsed premium user's passed level as premium, not done", () => {
    expect(levelState(levels([6, 7, null]), 1, false)).toBe("premium");
    expect(levelState(levels([6, 7, null]), 0, false)).toBe("done");
  });

  it("marks passed levels as done and finds the next one", () => {
    const l = levels([6, 7, null]);
    expect(levelState(l, 1, true)).toBe("done");
    expect(nextLevelIndex(l)).toBe(2);
    expect(nextLevelIndex(levels([6, 8, 8]))).toBeNull();
  });
});
