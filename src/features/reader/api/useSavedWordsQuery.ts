import { useCallback } from "react";
import { Alert } from "react-native";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";

import {
  enqueueWordAction,
  flushPendingWordActions,
  isLikelyOfflineError,
  type PendingWordAction,
  type WordActionType,
} from "@/features/reader/api/offlineWordActionsQueue";

/** Mirrors `user_lemma_state.state`'s CHECK constraint (see
 * supabase/migrations/20260805084609_002_user.sql), minus `ignored` which
 * this feature doesn't drive yet. A lemma with no `user_lemma_state` row at
 * all is treated as `"new"` — see `readLemmaStates`. */
export type LemmaState = "new" | "learning" | "known";

const lemmaStatesQueryKey = ["reader", "lemmaStates"] as const;

/** Postgres unique-violation error code (see `user_saved_words` UNIQUE
 * (user_id, lemma) and `srs_cards` UNIQUE(user_id, lemma, card_type)).
 * Supabase/postgrest surfaces this as `error.code`. */
const POSTGRES_UNIQUE_VIOLATION = "23505";

interface RawLemmaStateRow {
  lemma: string;
  state: string;
}

function isTrackedState(state: string): state is Exclude<LemmaState, "new"> {
  return state === "learning" || state === "known";
}

/** Fetches every non-"new" `user_lemma_state` row for the current user into
 * a `Map<lemma, state>`. A lemma absent from the map is implicitly `"new"`
 * — this is the single source of truth the whole Save/Know button matrix
 * reads from (see WordSheet.tsx), replacing the old two-independent-
 * booleans model (`isSaved` + a separate "known" concept that didn't
 * actually exist client-side). */
async function fetchLemmaStates(): Promise<Map<string, LemmaState>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");

  const { data, error } = await supabase.from("user_lemma_state").select("lemma, state");
  if (error) throw error;

  const map = new Map<string, LemmaState>();
  for (const row of (data ?? []) as RawLemmaStateRow[]) {
    if (isTrackedState(row.state)) map.set(row.lemma, row.state);
  }
  return map;
}

export function useLemmaStates() {
  return useQuery({
    queryKey: lemmaStatesQueryKey,
    queryFn: fetchLemmaStates,
    staleTime: 60 * 1000,
  });
}

function readLemmaStates(queryClient: QueryClient): Map<string, LemmaState> {
  return queryClient.getQueryData<Map<string, LemmaState>>(lemmaStatesQueryKey) ?? new Map();
}

/** Convenience reader for a single lemma, used by WordSheet's button matrix
 * and by ReaderScreen's `savedLemmas` set (still needed by
 * PaginatedReaderView for in-text highlighting). */
export function useLemmaState(): (lemma: string | null) => LemmaState {
  const { data } = useLemmaStates();
  return useCallback((lemma) => (lemma ? (data?.get(lemma) ?? "new") : "new"), [data]);
}

/** Back-compat set view (`state === "learning"`) for callers that only
 * need a boolean "is this lemma saved" (e.g. PaginatedReaderView's saved-
 * word highlighting), so they don't need to know about the 3-state model. */
export function useSavedLemmas() {
  const query = useLemmaStates();
  const data =
    query.data === undefined
      ? undefined
      : new Set(Array.from(query.data.entries()).filter(([, s]) => s === "learning").map(([l]) => l));
  return { ...query, data };
}

export function useIsLemmaSaved(): (lemma: string | null) => boolean {
  const getState = useLemmaState();
  return useCallback((lemma) => getState(lemma) === "learning", [getState]);
}

interface WordActionInput {
  lemma: string;
  pos: string;
  surface: string;
  paragraphId: string;
  contextText: string;
  bookId: string;
}

async function getUserIdOrThrow(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("no_session");
  return userData.user.id;
}

/** Inserts the saved-word row + srs card and marks the lemma "learning".
 * Relies on `user_saved_words`'s real UNIQUE(user_id, lemma) constraint
 * (see supabase/migrations/20260807120000_016_user_saved_words_unique_lemma.sql)
 * so a second save of an already-"learning" or already-"known" lemma is a
 * genuine idempotent no-op at the DB level, never a user-visible error. */
async function saveWord(input: WordActionInput): Promise<void> {
  const userId = await getUserIdOrThrow();

  const { error: insertError } = await supabase.from("user_saved_words").upsert(
    {
      user_id: userId,
      lemma: input.lemma,
      surface: input.surface,
      paragraph_id: input.paragraphId,
      context_text: input.contextText,
      book_id: input.bookId,
    },
    { onConflict: "user_id,lemma", ignoreDuplicates: true },
  );
  if (insertError) throw insertError;

  const { error: upsertError } = await supabase.from("user_lemma_state").upsert(
    {
      user_id: userId,
      lemma: input.lemma,
      pos: input.pos,
      state: "learning",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lemma,pos" },
  );
  if (upsertError) throw upsertError;

  const { error: srsError } = await supabase.from("srs_cards").insert({
    user_id: userId,
    lemma: input.lemma,
    card_type: "recognition",
    due_at: new Date().toISOString(),
  });
  if (srsError && srsError.code !== POSTGRES_UNIQUE_VIOLATION) throw srsError;
}

/** Removes the saved-word row + its srs card(s) and reverts the lemma to
 * "new". Deleting rows that don't exist is a no-op, so this is also safely
 * reused by `markLemmaKnown` regardless of the lemma's prior state. */
async function removeSavedWordAndCards(userId: string, lemma: string): Promise<void> {
  const { error: deleteWordError } = await supabase
    .from("user_saved_words")
    .delete()
    .eq("user_id", userId)
    .eq("lemma", lemma);
  if (deleteWordError) throw deleteWordError;

  const { error: deleteCardsError } = await supabase
    .from("srs_cards")
    .delete()
    .eq("user_id", userId)
    .eq("lemma", lemma);
  if (deleteCardsError) throw deleteCardsError;
}

async function unsaveWord(input: WordActionInput): Promise<void> {
  const userId = await getUserIdOrThrow();
  await removeSavedWordAndCards(userId, input.lemma);

  const { error } = await supabase.from("user_lemma_state").upsert(
    {
      user_id: userId,
      lemma: input.lemma,
      pos: input.pos,
      state: "new",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lemma,pos" },
  );
  if (error) throw error;
}

async function markLemmaKnown(input: WordActionInput): Promise<void> {
  const userId = await getUserIdOrThrow();
  // Harmless no-op when there was nothing to remove (state was "new").
  await removeSavedWordAndCards(userId, input.lemma);

  const { error } = await supabase.from("user_lemma_state").upsert(
    {
      user_id: userId,
      lemma: input.lemma,
      pos: input.pos,
      state: "known",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lemma,pos" },
  );
  if (error) throw error;
}

async function unmarkLemmaKnown(input: WordActionInput): Promise<void> {
  const userId = await getUserIdOrThrow();

  const { error } = await supabase.from("user_lemma_state").upsert(
    {
      user_id: userId,
      lemma: input.lemma,
      pos: input.pos,
      state: "new",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lemma,pos" },
  );
  if (error) throw error;
}

const ACTION_FN: Record<WordActionType, (input: WordActionInput) => Promise<void>> = {
  save: saveWord,
  unsave: unsaveWord,
  know: markLemmaKnown,
  unknow: unmarkLemmaKnown,
};

const OPTIMISTIC_NEXT_STATE: Record<WordActionType, LemmaState> = {
  save: "learning",
  unsave: "new",
  know: "known",
  unknow: "new",
};

interface OnErrorContext {
  previousStates: Map<string, LemmaState>;
}

/** True when `error` looks like the user is signed out (as opposed to a
 * network problem or a real server rejection) — this must never be queued
 * offline, since a logged-out session will never successfully replay; the
 * user needs to know to sign back in. */
function isAuthLossError(error: unknown): boolean {
  if (error instanceof Error) return error.message === "no_session";
  return false;
}

/**
 * Ücretsiz katmanın kayıtlı kelime sınırına takılındı mı
 * (migration 024'teki `enforce_saved_word_limit` tetikleyicisi).
 *
 * Bu hatanın mesajı BİLEREK nötr: kelime kaydetme okuma ekranının içinde
 * gerçekleşiyor ve ürün ilkesi #1 orada yükseltme çağrısı yasaklıyor.
 * Premium teklifi Kelimelerim ve Profil ekranlarında duruyor.
 */
function isSavedWordLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("saved_word_limit_reached");
}

function useWordActionMutation(type: WordActionType, errorMessageKey: string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: WordActionInput) => ACTION_FN[type](input),
    onMutate: async (input: WordActionInput): Promise<OnErrorContext> => {
      await queryClient.cancelQueries({ queryKey: lemmaStatesQueryKey });
      const previousStates = readLemmaStates(queryClient);

      const nextStates = new Map(previousStates);
      const nextState = OPTIMISTIC_NEXT_STATE[type];
      if (nextState === "new") nextStates.delete(input.lemma);
      else nextStates.set(input.lemma, nextState);
      queryClient.setQueryData(lemmaStatesQueryKey, nextStates);

      return { previousStates };
    },
    onError: (error, input, context) => {
      if (context) queryClient.setQueryData(lemmaStatesQueryKey, context.previousStates);

      if (isAuthLossError(error)) {
        Alert.alert(t("common.errorTitle"), t("reader.error.notSignedIn"));
        return;
      }

      // Sınıra takıldıysa çevrimdışı kuyruğa ALINMAZ: tekrar denemek de
      // aynı hatayı verir, kuyruk sonsuza kadar dolu kalır.
      if (isSavedWordLimitError(error)) {
        Alert.alert(t("reader.error.savedWordLimitTitle"), t("reader.error.savedWordLimitBody"));
        return;
      }

      if (isLikelyOfflineError(error)) {
        const pending: PendingWordAction = {
          type,
          lemma: input.lemma,
          pos: input.pos,
          surface: input.surface,
          paragraphId: input.paragraphId,
          contextText: input.contextText,
          bookId: input.bookId,
          queuedAt: Date.now(),
        };
        // Offline must be silent to the user (no Alert) but never an empty
        // catch: the queueing itself is awaited and any storage failure
        // still surfaces as a thrown/logged error, not a swallowed one.
        void enqueueWordAction(pending);
        // Keep the optimistic state applied: the action WILL eventually
        // succeed once the queue flushes, so reverting it here would just
        // flicker the UI back and forth.
        queryClient.setQueryData(lemmaStatesQueryKey, (current: Map<string, LemmaState> | undefined) => {
          const base = current ?? readLemmaStates(queryClient);
          const nextStates = new Map(base);
          const nextState = OPTIMISTIC_NEXT_STATE[type];
          if (nextState === "new") nextStates.delete(input.lemma);
          else nextStates.set(input.lemma, nextState);
          return nextStates;
        });
        return;
      }

      Alert.alert(t("common.errorTitle"), t(errorMessageKey));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lemmaStatesQueryKey });
    },
  });
}

export function useSaveWordMutation() {
  return useWordActionMutation("save", "reader.error.saveWordFailed");
}

export function useUnsaveWordMutation() {
  return useWordActionMutation("unsave", "reader.error.unsaveWordFailed");
}

export function useMarkLemmaKnownMutation() {
  return useWordActionMutation("know", "reader.error.markKnownFailed");
}

export function useUnmarkKnownMutation() {
  return useWordActionMutation("unknow", "reader.error.unmarkKnownFailed");
}

/** Call once on mount (mirrors `flushPendingProgress`'s call-on-mount
 * pattern, see useReadingProgressMutation.ts) to replay any word actions
 * that were queued while offline, oldest first. */
export async function flushPendingWordActionsQueue(): Promise<void> {
  await flushPendingWordActions(async (action) => {
    await ACTION_FN[action.type]({
      lemma: action.lemma,
      pos: action.pos,
      surface: action.surface ?? "",
      paragraphId: action.paragraphId ?? "",
      contextText: action.contextText ?? "",
      bookId: action.bookId ?? "",
    });
  });
}
