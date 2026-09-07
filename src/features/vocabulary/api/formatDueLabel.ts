import type { TFunction } from "i18next";

/**
 * vocabulary.html `.word .due.mono` — "Bugün" / "Yarın" / "3 gün" /
 * "1 hafta" etc. Buckets a `srs_cards.due_at` timestamp relative to the
 * start of today (not a raw ms diff) so a card due at 23:59 today and one
 * due at 00:01 today both read "Bugün", matching how a user thinks about
 * "today's reviews" rather than exact 24h windows.
 */
export function formatDueLabel(t: TFunction, dueAt: string | null): string | null {
  if (dueAt === null) {
    return null;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const due = new Date(dueAt);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();

  const diffDays = Math.round((dueStart - todayStart) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return t("vocabulary.due.today");
  }
  if (diffDays === 1) {
    return t("vocabulary.due.tomorrow");
  }
  if (diffDays < 7) {
    return t("vocabulary.due.days", { count: diffDays });
  }

  const weeks = Math.round(diffDays / 7);
  return t("vocabulary.due.weeks", { count: weeks });
}
