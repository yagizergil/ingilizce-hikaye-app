import { levelFromXp, rankForLevel, totalXp, xpForNextLevel } from "@/features/profile/xp";

describe("levelFromXp", () => {
  it("starts everyone at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, needed: 100, fraction: 0 });
  });

  it("levels up exactly at the threshold", () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toMatchObject({ level: 2, intoLevel: 0, needed: 150 });
    expect(levelFromXp(250)).toMatchObject({ level: 3, intoLevel: 0 });
  });

  it("each level costs 50 XP more than the previous one", () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(10)).toBe(550);
  });

  it("never returns a fraction above 1 or a negative level", () => {
    expect(levelFromXp(-50).level).toBe(1);
    expect(levelFromXp(10_000_000).fraction).toBeLessThanOrEqual(1);
  });
});

describe("rankForLevel", () => {
  it("maps level ranges to titles", () => {
    expect(rankForLevel(1)).toBe("newcomer");
    expect(rankForLevel(5)).toBe("curious");
    expect(rankForLevel(14)).toBe("bookworm");
    expect(rankForLevel(45)).toBe("legend");
  });
});

it("totalXp sums sources but not today's subtotal", () => {
  expect(totalXp({ reading: 10, words: 6, reviews: 4, quiz: 5, books: 100, today: 999 })).toBe(125);
});
