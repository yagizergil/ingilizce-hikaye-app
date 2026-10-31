import { shouldShowHomeOffer } from "@/features/home/homeOffer";

const HOUR = 60 * 60 * 1000;
const base = { isPremium: false, trialDays: 3, lastShownAt: null };

describe("home offer card rule", () => {
  it("does not show before the first chapter is finished", () => {
    expect(shouldShowHomeOffer({ ...base, now: 50 * HOUR, firstChapterFinishedAt: null })).toBe(
      false,
    );
  });

  it("shows once the first chapter is finished", () => {
    expect(shouldShowHomeOffer({ ...base, now: 2 * HOUR, firstChapterFinishedAt: HOUR })).toBe(
      true,
    );
  });

  it("waits 72 hours after the last show or dismissal", () => {
    const finished = { firstChapterFinishedAt: 0 };
    expect(
      shouldShowHomeOffer({ ...base, ...finished, now: 100 * HOUR, lastShownAt: 40 * HOUR }),
    ).toBe(false);
    expect(
      shouldShowHomeOffer({ ...base, ...finished, now: 113 * HOUR, lastShownAt: 40 * HOUR }),
    ).toBe(true);
  });

  it("never shows to premium users or without an eligible trial", () => {
    const finished = { firstChapterFinishedAt: 0, now: 50 * HOUR };
    expect(shouldShowHomeOffer({ ...base, ...finished, isPremium: true })).toBe(false);
    expect(shouldShowHomeOffer({ ...base, ...finished, trialDays: null })).toBe(false);
  });

  it("uses the server-managed cooldown when given (paywall_rules.home_offer)", () => {
    const finished = { firstChapterFinishedAt: 0, lastShownAt: 40 * HOUR };
    const cooldownMs = 24 * HOUR;
    expect(shouldShowHomeOffer({ ...base, ...finished, now: 63 * HOUR, cooldownMs })).toBe(false);
    expect(shouldShowHomeOffer({ ...base, ...finished, now: 64 * HOUR, cooldownMs })).toBe(true);
  });
});
