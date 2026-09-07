import { Pressable, StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { Chapter } from "@/features/library/types";

interface ChapterListItemProps {
  chapter: Chapter;
  onPress: (chapter: Chapter) => void;
}

/**
 * book-detail.html `.ch` — mono 2-digit index + Fraunces `chapterRowTitle`
 * + mono duration, one row of an unstyled flex list (the hairline divider
 * between rows is drawn by the screen's `FlashList`
 * `ItemSeparatorComponent`, matching `BookListRow`'s pattern, not by this
 * row itself). Done state (`.ch.done`) mutes the title color and appends
 * a checkmark after the index (`.idx::after{ content:"✓" }`).
 */
export function ChapterListItem({ chapter, onPress }: ChapterListItemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDone = chapter.progressPercent >= 100;
  const indexLabel = String(chapter.index).padStart(2, "0");

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(chapter)}
      accessibilityRole="button"
      accessibilityLabel={t("bookDetail.chapterRow.accessibilityLabel", {
        index: chapter.index,
        title: chapter.title,
        status: isDone ? t("bookDetail.chapterRow.done") : t("bookDetail.chapterRow.notDone"),
      })}
    >
      <Text style={[monoType.chapterIndex, styles.index, { color: theme.text.secondary }]}>
        {indexLabel}
        {isDone ? " ✓" : ""}
      </Text>
      <Text
        style={[type.chapterRowTitle, styles.title, { color: isDone ? theme.text.secondary : theme.text.primary }]}
        numberOfLines={1}
      >
        {chapter.title}
      </Text>
      <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>
        {t("bookDetail.chapterRow.duration", { minutes: chapter.estimatedMinutes ?? 0 })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  index: {
    width: spacing.ml,
    flexShrink: 0,
  },
  title: {
    flex: 1,
  },
});
