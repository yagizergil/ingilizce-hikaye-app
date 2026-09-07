import type { TFunction } from "i18next";

/**
 * profile.html `.stat-cell .n.mono` — "4 sa 12 dk" for the "this week
 * reading time" stat. Drops the hours segment entirely under an hour
 * (matching how the mockup number reads as a compact duration, not a
 * zero-padded clock).
 */
export function formatReadingTime(t: TFunction, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return t("profile.stats.readingTime.minutesOnly", { minutes });
  }

  return t("profile.stats.readingTime.hoursMinutes", { hours, minutes });
}
