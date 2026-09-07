import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { homeQueryKeys } from "@/features/home/api/queryKeys";

interface RawFavoriteRow {
  book_id: string;
}

async function fetchFavoritedBookIds(): Promise<Set<string>> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return new Set();

  const { data, error } = await supabase.from("user_favorites").select("book_id").eq("user_id", userId);
  if (error) throw error;

  return new Set((data as RawFavoriteRow[]).map((row) => row.book_id));
}

/** Set of the current user's favorited book ids — used by screens that
 * need a per-book favorited/not-favorited flag (library list long-press,
 * book-detail heart icon) without querying per row. */
export function useFavoritedBookIdsQuery() {
  return useQuery({
    queryKey: homeQueryKeys.favoritedBookIds(),
    queryFn: fetchFavoritedBookIds,
  });
}
