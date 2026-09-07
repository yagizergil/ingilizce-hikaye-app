import AsyncStorage from "@/lib/storage";

export type WordActionType = "save" | "unsave" | "know" | "unknow";

export interface PendingWordAction {
  type: WordActionType;
  lemma: string;
  pos: string;
  surface?: string;
  paragraphId?: string;
  contextText?: string;
  bookId?: string;
  queuedAt: number;
}

const PENDING_WORD_ACTIONS_KEY = "reader.pendingWordActions";

async function readQueue(): Promise<PendingWordAction[]> {
  const raw = await AsyncStorage.getItem(PENDING_WORD_ACTIONS_KEY);
  if (!raw) return [];
  // A previous app version, a manual edit, or storage corruption could all
  // leave this key holding something that isn't a PendingWordAction[] — an
  // empty catch here would silently drop every queued action with no trace,
  // so a parse failure is logged and treated as an empty queue instead.
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingWordAction[]) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[offlineWordActionsQueue] failed to parse stored queue", error);
    return [];
  }
}

async function writeQueue(queue: PendingWordAction[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_WORD_ACTIONS_KEY, JSON.stringify(queue));
}

/** Appends one pending action to the end of the FIFO queue. */
export async function enqueueWordAction(action: PendingWordAction): Promise<void> {
  const queue = await readQueue();
  queue.push(action);
  await writeQueue(queue);
}

/**
 * Replays the queue in FIFO order, removing each item only once `replay`
 * resolves without throwing. Stops at the first failure (leaving it and
 * everything after it in the queue) instead of dropping the rest of the
 * queue — a still-offline device shouldn't lose actions 2..N just because
 * action 1 also still fails.
 */
export async function flushPendingWordActions(
  replay: (action: PendingWordAction) => Promise<void>,
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
      console.warn("[offlineWordActionsQueue] replay failed, stopping flush", error);
      break;
    }
  }

  if (processed > 0) await writeQueue(queue.slice(processed));
}

/**
 * Heuristic for "this failure means the device is offline / the server is
 * unreachable" as opposed to a real server-side rejection (auth loss,
 * constraint violation, RLS denial). This project has no
 * `@react-native-community/netinfo` dependency (checked package.json), so
 * there is no authoritative connectivity signal to consult — this falls
 * back to inspecting the error shape thrown by the fetch call underneath
 * supabase-js:
 *
 * - React Native's `fetch` throws a `TypeError` with message
 *   "Network request failed" when the request never reaches a server
 *   (no connectivity, DNS failure, timeout at the OS level).
 * - A real Postgrest/Supabase error (auth expired, RLS denial, unique
 *   violation) comes back as a resolved HTTP response with a `code`/
 *   `message` from the server, not a thrown TypeError.
 *
 * Known limitations: this cannot distinguish "no internet" from other
 * TypeError-shaped fetch failures (e.g. a misconfigured URL, a CORS
 * rejection on web) — both get queued as if offline. It also cannot detect
 * "technically connected but the Supabase project is down", which surfaces
 * as a timeout/AbortError depending on RN's fetch polyfill and is treated
 * as offline here too (an intentional choice: retrying later is still the
 * right response to a transient server outage, not a user-visible error).
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
