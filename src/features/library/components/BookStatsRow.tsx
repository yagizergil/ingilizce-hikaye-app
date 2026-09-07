import { StyleSheet, View } from "react-native";

import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { StatCell } from "@/components/ui";

import type { Book } from "@/features/library/types";

interface BookStatsRowProps {
  book: Book;
  /** Book-level reading completion, 0-100 — from useBookDetailQuery's
   * `progressPercent` (there is no separate "comprehension" test in this
   * schema; this is reading-position percent). */
  progressPercent: number;
}

/**
 * book-detail.html `.statline` — four `StatCell`s (word count / chapter
 * count / duration / completion), plain inline (`bordered` left at its
 * default `false` — the mockup's `.statline .stat` has no borders between
 * cells, unlike profile.html's bordered grid), size="md" per StatCell's
 * own doc comment (book-detail.html `.statline .n.mono` is 17px/500),
 * bottom hairline matching `.statline{ border-bottom:1px solid
 * var(--hairline) }`.
 */
export function BookStatsRow({ book, progressPercent }: BookStatsRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border.hairline }]}>
      <StatCell
        size="md"
        value={book.wordCount.toLocaleString("tr-TR")}
        label={t("bookDetail.stats.words")}
        style={styles.cell}
      />
      <StatCell
        size="md"
        value={String(book.chapters.length)}
        label={t("bookDetail.stats.chapters")}
        style={styles.cell}
      />
      <StatCell
        size="md"
        value={String(book.estimatedMinutes)}
        label={t("bookDetail.stats.minutes")}
        style={styles.cell}
      />
      <StatCell
        size="md"
        value={t("bookDetail.stats.completedValue", { percent: progressPercent })}
        label={t("bookDetail.stats.completed")}
        style={styles.cell}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    flex: 1,
  },
});
