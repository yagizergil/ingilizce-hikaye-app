import AsyncStorage from "@/lib/storage";

export type FavoriteActionType = "favorite" | "unfavorite";

export interface PendingFavoriteAction {
  type: FavoriteActionType;
  bookId: string;
  queuedAt: number;
}

const PENDING_FAVORITE_ACTIONS_KEY = "home.pendingFavoriteActions";

/**
 * Faithful copy of the reader feature's offline-queue shape
 * (src/features/reader/api/offlineWordActionsQueue.ts) — array-in-
 * AsyncStorage, FIFO flush, same offline-vs-real-error heuristic — kept
 * as a separate file rather than importing that one directly, since
 * CLAUDE.md's feature-slicing rule forbids one feature reaching into
 * another feature's `api/` folder (only barrel imports are allowed, and
 * this internal queue helper is intentionally not barrel-exported by
 * `reader` either).
 */
async function readQueue(): Promise<PendingFavoriteAction[]> {
  const raw = await AsyncStorage.getItem(PENDING_FAVORITE_ACTIONS_KEY);
  if (!raw) return [];
  // See offlineWordActionsQueue.ts's readQueue for why this catch logs
  // and falls back to an empty queue instead of being empty/silent.
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingFavoriteAction[]) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[offlineFavoriteActionsQueue] failed to parse stored queue", error);
    return [];
  }
}

async function writeQueue(queue: PendingFavoriteAction[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_FAVORITE_ACTIONS_KEY, JSON.stringify(queue));
}

/** Appends one pending action to the end of the FIFO queue. */
export async function enqueueFavoriteAction(action: PendingFavoriteAction): Promise<void> {
  const queue = await readQueue();
  queue.push(action);
  await writeQueue(queue);
}

/**
 * Replays the queue in FIFO order, removing each item only once `replay`
 * resolves without throwing. Stops at the first failure (leaving it and
 * everything after it in the queue) so a still-offline device doesn't
 * lose actions 2..N just because action 1 also still fails.
 */
export async function flushPendingFavoriteActions(
  replay: (action: PendingFavoriteAction) => Promise<void>,
): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  let processed = 0;
  for (const action of queue) {
    try {
      await replay(action);
      processed += 1;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[offlineFavoriteActionsQueue] replay failed, stopping flush", error);
      break;
    }
  }

  if (processed > 0) await writeQueue(queue.slice(processed));
}

/**
 * Same offline-vs-real-error heuristic as
 * `offlineWordActionsQueue.isLikelyOfflineError` — duplicated rather than
 * imported for the same feature-isolation reason as above. See that
 * file's doc comment for the full reasoning and known limitations.
 */
export function isLikelyOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return /network request failed/i.test(error.message);
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return /network request failed|failed to fetch|timed? ?out|abort/i.test(message);
    }
  }
  return false;
}
