import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { localDateKey } from "@/lib/localDate";

import { profileQueryKeys } from "@/features/profile/api/queryKeys";

import type { GoalProgress } from "@/features/profile/goal";

function toInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Günlük hedef ilerlemesi (migration 054, `get_goal_progress`). */
export function useGoalProgressQuery() {
  return useQuery({
    queryKey: profileQueryKeys.goal(),
    staleTime: 30_000,
    queryFn: async (): Promise<GoalProgress> => {
      const { data, error } = await supabase.rpc("get_goal_progress", { p_today: localDateKey() });
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      return {
        goal: toInt(row.goal),
        today: toInt(row.today),
        goalDays: toInt(row.goal_days),
        streak: toInt(row.streak),
      };
    },
  });
}

/** Günlük hedefi değiştirir (`profiles.daily_goal_minutes`, RLS: yalnızca kendi satırı). */
export function useUpdateDailyGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (minutes: number) => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;
      if (!userId) throw new Error("no session");
      const { error } = await supabase
        .from("profiles")
        .update({ daily_goal_minutes: minutes })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Hedef değişince ilerleme, seri ve XP bonusu yeniden hesaplanır.
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.goal() });
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.xp() });
    },
  });
}
