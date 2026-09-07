import AsyncStorage from "@/lib/storage";
import {
  enqueueWordAction,
  flushPendingWordActions,
  isLikelyOfflineError,
  type PendingWordAction,
} from "@/features/reader/api/offlineWordActionsQueue";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("offlineWordActionsQueue", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("appends actions to a FIFO array under one storage key", async () => {
    const first: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const second: PendingWordAction = { type: "know", lemma: "walk", pos: "verb", queuedAt: 2 };

    await enqueueWordAction(first);
    await enqueueWordAction(second);

    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    expect(JSON.parse(raw as string)).toEqual([first, second]);
  });

  it("replays queued actions in order and removes only the ones that succeeded", async () => {
    const first: PendingWordAction = { type: "save", lemma: "run", pos: "verb", queuedAt: 1 };
    const second: PendingWordAction = { type: "know", lemma: "walk", pos: "verb", queuedAt: 2 };
    await enqueueWordAction(first);
    await enqueueWordAction(second);

    const replayed: PendingWordAction[] = [];
    const replay = jest.fn(async (action: PendingWordAction) => {
      replayed.push(action);
      if (action.lemma === "walk") throw new Error("still offline");
    });

    await flushPendingWordActions(replay);

    expect(replayed).toEqual([first, second]);
    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    // "run" succeeded and was removed; "walk" failed and stays queued.
    expect(JSON.parse(raw as string)).toEqual([second]);
  });

  it("does nothing when the queue is empty", async () => {
    const replay = jest.fn();
    await flushPendingWordActions(replay);
    expect(replay).not.toHaveBeenCalled();
  });

  describe("isLikelyOfflineError", () => {
    it("treats RN's 'Network request failed' TypeError as offline", () => {
      expect(isLikelyOfflineError(new TypeError("Network request failed"))).toBe(true);
    });

    it("treats an unrelated TypeError as a real error", () => {
      expect(isLikelyOfflineError(new TypeError("Cannot read property 'x' of undefined"))).toBe(false);
    });

    it("treats a Postgrest-shaped error object as a real error", () => {
      expect(isLikelyOfflineError({ code: "23505", message: "duplicate key value" })).toBe(false);
    });

    it("treats a timeout-flavored error message as offline", () => {
      expect(isLikelyOfflineError(new Error("The operation timed out"))).toBe(true);
    });
  });
});
