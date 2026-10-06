/**
 * Günlük hedef ve meydan okuma (2026-10-07). Veri sunucuda türetiliyor
 * (`get_goal_progress`, migration 054); burada yalnızca gösterim kuralları.
 *
 * Meydan okuma HEDEFİN TUTTURULDUĞU günleri sayar (okunan günleri değil) ve
 * basamaklıdır: 7 -> 30 -> 120. Uzak bir "0 / 120" motivasyonu kırar; bir
 * sonraki yakın basamak gösterilir (hedef gradyanı etkisi).
 */
export const GOAL_OPTIONS = [5, 10, 15, 20, 30] as const;
export const CHALLENGE_MILESTONES = [7, 30, 120] as const;
/** Basamağa ulaşınca kazanılan bonus XP (migration 054 ile aynı). */
export const MILESTONE_BONUS: Record<number, number> = { 7: 100, 30: 300, 120: 1000 };

export interface GoalProgress {
  goal: number;
  today: number;
  goalDays: number;
  streak: number;
}

export interface ChallengeState {
  /** Hedeflenen basamak (hepsi geçildiyse sonuncusu). */
  milestone: number;
  /** Önceki basamak (çubuğun başlangıcı). */
  from: number;
  fraction: number;
  completedAll: boolean;
}

export function challengeState(goalDays: number): ChallengeState {
  const next = CHALLENGE_MILESTONES.find((m) => goalDays < m);
  if (next === undefined) {
    const last = CHALLENGE_MILESTONES[CHALLENGE_MILESTONES.length - 1]!;
    return { milestone: last, from: last, fraction: 1, completedAll: true };
  }
  const index = CHALLENGE_MILESTONES.indexOf(next);
  const from = index > 0 ? CHALLENGE_MILESTONES[index - 1]! : 0;
  return {
    milestone: next,
    from,
    fraction: (goalDays - from) / (next - from),
    completedAll: false,
  };
}

export function goalFraction(progress: GoalProgress): number {
  return progress.goal > 0 ? Math.min(1, progress.today / progress.goal) : 0;
}
