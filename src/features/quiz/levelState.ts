import type { BookQuizLevel, QuizLevelState } from "@/features/quiz/types";

/** Bir sonraki basamağı açmak için gereken en düşük başarı oranı. */
export const PASS_RATIO = 0.6;

export function hasPassed(level: BookQuizLevel): boolean {
  return level.bestCorrect !== null && level.bestCorrect / level.questionCount >= PASS_RATIO;
}

/**
 * Basamak durumu. Sıra bir ÖĞRENME kuralıdır (kolaydan zora): N. basamak,
 * N-1'den %60 alınmadan açılmaz. Premium kuralı ayrıca sunucuda (migration
 * 052, RLS) zorlanır; burada yalnızca doğru kartı göstermek için.
 *
 * "premium" yalnızca basamak sıra bakımından AÇIK olduğunda döner: henüz
 * sırası gelmemiş bir basamak için ücretsiz kullanıcıya önce kilit (sıra)
 * gösterilir, satış değil.
 */
export function levelState(
  levels: readonly BookQuizLevel[],
  index: number,
  isPremium: boolean,
): QuizLevelState {
  const level = levels[index];
  if (!level) return "locked";
  const previous = levels[index - 1];
  if (previous && !hasPassed(previous) && !hasPassed(level)) return "locked";
  // Premium kontrolü "done"dan ÖNCE: süresi dolmuş bir premium kullanıcı
  // eskiden ✓ işaretli karta basıp hiçbir açıklama olmadan paywall'a
  // düşüyordu (sorular RLS ile boş dönüyor). Kart artık baştan "premium".
  if (level.level > 1 && !isPremium) return "premium";
  if (hasPassed(level)) return "done";
  return "open";
}

/** Kitabın sıradaki çözülecek basamağı (kartın birincil eylemi); hepsi bittiyse null. */
export function nextLevelIndex(levels: readonly BookQuizLevel[]): number | null {
  const index = levels.findIndex((level) => !hasPassed(level));
  return index === -1 ? null : index;
}
