import { act } from "react-test-renderer";

import { Alert } from "react-native";

import AsyncStorage from "@/lib/storage";
import { renderHookWithClient } from "@/test-utils/renderHookWithClient";
import {
  useSaveWordMutation,
  useUnsaveWordMutation,
  flushPendingWordActionsQueue,
} from "@/features/reader/api/useSavedWordsQuery";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockFrom = jest.fn();
const mockGetUser = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

type UpsertResult = Promise<{ data: unknown; error: unknown }>;

const USER = { id: "user-1" };

function ok<T>(data: T = null as unknown as T) {
  return Promise.resolve({ data, error: null });
}

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  for (;;) {
    let passed = false;
    await act(async () => {
      await Promise.resolve();
      passed = condition();
    });
    if (passed) return;
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

const INPUT = {
  lemma: "run",
  pos: "verb",
  surface: "ran",
  paragraphId: "p1",
  contextText: "She ran fast.",
  bookId: "book-1",
};

describe("useSavedWordsQuery mutations", () => {
  beforeEach(async () => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockAlert.mockReset();
    await AsyncStorage.clear();
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
  });

  it("double-save (already learning) does not surface an error — a real UPSERT with ignoreDuplicates is used", async () => {
    const upsertSavedWord = jest.fn(() => ok());
    const upsertLemmaState = jest.fn(() => ok());
    const insertSrsCard = jest.fn(() => ok());

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_saved_words") return { upsert: upsertSavedWord };
      if (table === "user_lemma_state") return { upsert: upsertLemmaState };
      if (table === "srs_cards") return { insert: insertSrsCard };
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHookWithClient(() => useSaveWordMutation());
    await act(async () => {
      result.current.mutate(INPUT);
    });
    await waitFor(() => result.current.isSuccess || result.current.isError);

    expect(result.current.isError).toBe(false);
    expect(mockAlert).not.toHaveBeenCalled();
    // Real upsert semantics: onConflict + ignoreDuplicates, never a plain insert.
    expect(upsertSavedWord).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", lemma: "run" }),
      { onConflict: "user_id,lemma", ignoreDuplicates: true },
    );
  });

  it("unsave removes the saved-word row + srs card and reverts state to 'new'", async () => {
    const deleteSavedWordEq2 = jest.fn(() => ok());
    const deleteSavedWordEq1 = jest.fn(() => ({ eq: deleteSavedWordEq2 }));
    const deleteSavedWord = jest.fn(() => ({ eq: deleteSavedWordEq1 }));

    const deleteSrsEq2 = jest.fn(() => ok());
    const deleteSrsEq1 = jest.fn(() => ({ eq: deleteSrsEq2 }));
    const deleteSrs = jest.fn(() => ({ eq: deleteSrsEq1 }));

    const upsertLemmaState = jest.fn(() => ok());

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_saved_words") return { delete: deleteSavedWord };
      if (table === "srs_cards") return { delete: deleteSrs };
      if (table === "user_lemma_state") return { upsert: upsertLemmaState };
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHookWithClient(() => useUnsaveWordMutation());
    await act(async () => {
      result.current.mutate(INPUT);
    });
    await waitFor(() => result.current.isSuccess || result.current.isError);

    expect(result.current.isError).toBe(false);
    expect(deleteSavedWord).toHaveBeenCalled();
    expect(deleteSavedWordEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteSavedWordEq2).toHaveBeenCalledWith("lemma", "run");
    expect(deleteSrs).toHaveBeenCalled();
    expect(deleteSrsEq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteSrsEq2).toHaveBeenCalledWith("lemma", "run");
    expect(upsertLemmaState).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", lemma: "run", state: "new" }),
      { onConflict: "user_id,lemma,pos" },
    );
  });

  it("a network failure during save is queued silently (no Alert) and replays successfully on flush", async () => {
    const upsertSavedWord = jest.fn<UpsertResult, unknown[]>(() =>
      Promise.reject(new TypeError("Network request failed")),
    );
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_saved_words") return { upsert: upsertSavedWord };
      return { upsert: jest.fn(() => ok()), insert: jest.fn(() => ok()) };
    });

    const { result } = renderHookWithClient(() => useSaveWordMutation());
    await act(async () => {
      result.current.mutate(INPUT);
    });
    await waitFor(() => result.current.isError);

    expect(mockAlert).not.toHaveBeenCalled();
    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    const queue = JSON.parse(raw as string);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ type: "save", lemma: "run" });

    // Now simulate connectivity returning: subsequent calls succeed.
    upsertSavedWord.mockImplementation(() => ok());
    await flushPendingWordActionsQueue();

    const rawAfter = await AsyncStorage.getItem("reader.pendingWordActions");
    expect(JSON.parse(rawAfter as string)).toEqual([]);
  });

  it("shows a specific 'sign in again' error when the user is logged out, and does not queue it offline", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { result } = renderHookWithClient(() => useSaveWordMutation());
    await act(async () => {
      result.current.mutate(INPUT);
    });
    await waitFor(() => result.current.isError);

    expect(mockAlert).toHaveBeenCalledWith("common.errorTitle", "reader.error.notSignedIn");
    const raw = await AsyncStorage.getItem("reader.pendingWordActions");
    expect(raw).toBeNull();
  });
});
