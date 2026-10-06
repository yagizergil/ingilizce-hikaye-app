import { challengeState, goalFraction } from "@/features/profile/goal";

describe("challengeState", () => {
  it("starts at the first milestone", () => {
    expect(challengeState(0)).toEqual({ milestone: 7, from: 0, fraction: 0, completedAll: false });
  });

  it("moves to the next milestone once one is reached", () => {
    expect(challengeState(7)).toMatchObject({ milestone: 30, from: 7, fraction: 0 });
    expect(challengeState(30)).toMatchObject({ milestone: 120, from: 30 });
  });

  it("marks everything complete after the last milestone", () => {
    expect(challengeState(150)).toMatchObject({ milestone: 120, fraction: 1, completedAll: true });
  });
});

describe("goalFraction", () => {
  it("caps at 1 and handles a zero goal", () => {
    expect(goalFraction({ goal: 10, today: 4, goalDays: 0, streak: 0 })).toBe(0.4);
    expect(goalFraction({ goal: 10, today: 25, goalDays: 0, streak: 0 })).toBe(1);
    expect(goalFraction({ goal: 0, today: 5, goalDays: 0, streak: 0 })).toBe(0);
  });
});
