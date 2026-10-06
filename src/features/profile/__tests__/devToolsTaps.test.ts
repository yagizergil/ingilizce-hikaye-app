import {
  DEVTOOLS_TAP_COUNT,
  DEVTOOLS_TAP_WINDOW,
  nextTapState,
  type TapState,
} from "@/features/profile/devToolsTaps";

describe("nextTapState", () => {
  it("starts a series at 1", () => {
    expect(nextTapState({ count: 0, last: 0 }, 1000)).toEqual({ count: 1, last: 1000 });
  });

  it("counts taps that arrive inside the window", () => {
    let state: TapState = { count: 0, last: 0 };
    for (let i = 0; i < DEVTOOLS_TAP_COUNT; i += 1) state = nextTapState(state, 1000 + i * 200);
    expect(state.count).toBe(DEVTOOLS_TAP_COUNT);
  });

  it("restarts the series when a pause exceeds the window", () => {
    const state = nextTapState({ count: 5, last: 1000 }, 1000 + DEVTOOLS_TAP_WINDOW + 1);
    expect(state.count).toBe(1);
  });

  it("keeps counting at exactly the window boundary", () => {
    expect(nextTapState({ count: 3, last: 1000 }, 1000 + DEVTOOLS_TAP_WINDOW).count).toBe(4);
  });
});
