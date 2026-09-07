import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { homeQueryKeys } from "@/features/home/api/queryKeys";
import {
  enqueueFavoriteAction,
  isLikelyOfflineError,
  type PendingFavoriteAction,
} from "@/features/home/api/offlineFavoriteActionsQueue";

interface ToggleFavoriteInput {
  bookId: string;
  /** Current favorited state before the toggle — the mutation flips it. */
  isFavorited: boolean;
}

async function writeFavorite(action: PendingFavoriteAction): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("home.toggleFavorite: not signed in");

  if (action.type === "favorite") {
    const { error } = await supabase
      .from("user_favorites")
      .upsert({ user_id: userId, book_id: action.bookId }, { onConflict: "user_id,book_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", action.bookId);
    if (error) throw error;
  }
}

/**
 * Toggles a book's favorite state, falling back to
 * `offlineFavoriteActionsQueue` on a network failure — same
 * optimistic-then-queue-on-offline shape the reader feature's word-save
 * mutations use, adapted to this feature's own query caches.
 *
 * No optimistic cache patch here (unlike the pre-redesign version, which
 * patched a "favorites" shelf entry directly): favorited state is now
 * spread across three different query caches (`favoritedBookIds`,
 * `extras`'s `favoritesReadCounts.favoritesCount`, and
 * `favoritesReadLists`'s `favorites` list) with no single shape worth
 * hand-patching — `onSettled` invalidating all three is the simpler,
 * still-correct choice per CLAUDE.md's "basitlik önce gelir".
 *
 * Placed in `features/home/api` rather than `features/library/api`: the
 * library's book-detail screen and `BookListRow`'s long-press both reach
 * this through home's barrel (`@/features/home`), allowed under
 * CLAUDE.md's "only via that feature's index.ts barrel" rule.
 */
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, isFavorited }: ToggleFavoriteInput) => {
      const action: PendingFavoriteAction = {
        type: isFavorited ? "unfavorite" : "favorite",
        bookId,
        queuedAt: Date.now(),
      };

      try {
        await writeFavorite(action);
      } catch (error) {
        if (isLikelyOfflineError(error)) {
          await enqueueFavoriteAction(action);
          return;
        }
        throw error;
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.extras() });
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.favoritedBookIds() });
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.favoritesReadLists() });
    },
  });
}
