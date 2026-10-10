import {
  classifyLaunchError,
  LAUNCH_TOTAL_TIMEOUT_MS,
  LaunchTimeoutError,
  resolveLaunchError,
  withTimeout,
} from "@/lib/launchFailure";
import { useLaunchStore } from "@/lib/launchState";

describe("classifyLaunchError", () => {
  it("treats 5xx responses as server errors", () => {
    expect(classifyLaunchError({ status: 503, message: "x" })).toBe("server");
  });

  it("treats fetch failures, timeouts and status 0 as offline", () => {
    expect(classifyLaunchError(new TypeError("Network request failed"))).toBe("offline");
    expect(classifyLaunchError(new LaunchTimeoutError("getSession"))).toBe("offline");
    expect(classifyLaunchError({ status: 0 })).toBe("offline");
    expect(classifyLaunchError(null)).toBe("offline");
  });
});

describe("resolveLaunchError", () => {
  it("never shows an error once ready", () => {
    expect(resolveLaunchError({ ready: true, elapsedMs: 60_000, failure: "server" })).toBeNull();
  });

  it("shows an explicit failure immediately", () => {
    expect(resolveLaunchError({ ready: false, elapsedMs: 0, failure: "server" })).toBe("server");
  });

  it("waits until the total timeout, then reports offline", () => {
    expect(
      resolveLaunchError({ ready: false, elapsedMs: LAUNCH_TOTAL_TIMEOUT_MS - 1, failure: null }),
    ).toBeNull();
    expect(
      resolveLaunchError({ ready: false, elapsedMs: LAUNCH_TOTAL_TIMEOUT_MS, failure: null }),
    ).toBe("offline");
  });
});

describe("withTimeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("rejects a promise that never settles", async () => {
    const pending = withTimeout(new Promise<never>(() => undefined), 1000, "hang");
    jest.advanceTimersByTime(1000);
    await expect(pending).rejects.toBeInstanceOf(LaunchTimeoutError);
  });

  it("passes through values and errors that arrive in time", async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, "ok")).resolves.toBe(7);
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000, "err")).rejects.toThrow(
      "boom",
    );
  });
});

describe("launch store retry", () => {
  it("clears the failure and readiness and bumps the attempt", () => {
    const store = useLaunchStore.getState();
    store.markReady("auth");
    store.fail("offline");
    const before = useLaunchStore.getState().attempt;
    useLaunchStore.getState().retry();
    const after = useLaunchStore.getState();
    expect(after.failure).toBeNull();
    expect(after.auth).toBe(false);
    expect(after.onboarding).toBe(false);
    expect(after.attempt).toBe(before + 1);
  });
});
