import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
} from "@/theme";

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
      <View style={[styles.index, isDone ? styles.indexDone : null]}>
        {isDone ? (
          <Ionicons name="checkmark" size={16} color={detailColors.amberInk} />
        ) : (
          <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>{indexLabel}</Text>
        )}
      </View>
      <Text
        style={[
          detailType.statLabel,
          styles.title,
          { color: isDone ? detailColors.muted : detailColors.title },
        ]}
        numberOfLines={1}
      >
        {chapter.title}
      </Text>
      <Text style={[homeType.cardSub, { color: detailColors.muted }]}>
        {t("bookDetail.chapterRow.duration", { minutes: chapter.estimatedMinutes ?? 0 })}
      </Text>
    </Pressable>
  );
}

const INDEX_SIZE = 34;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingHorizontal: detailMetrics.gutter,
    paddingVertical: homeSpace.md,
    minHeight: homeMetrics.rowIcon + homeSpace.lg,
  },
  index: {
    width: INDEX_SIZE,
    height: INDEX_SIZE,
    borderRadius: INDEX_SIZE / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  indexDone: {
    backgroundColor: detailColors.amber,
  },
  title: {
    flex: 1,
  },
});
