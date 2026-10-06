import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { searchColors, searchMetrics, searchType } from "@/theme";

import type { Book } from "@/features/library/types";

interface SearchBookRowProps {
  book: Book;
  onPress: (book: Book) => void;
}

/** Arama sonucu satırı: 32 pt yuvarlak kapak + 17 pt başlık; basılınca açık yeşil hap. */
// memo: her tuş vuruşunda 40 satırın tamamı yeniden çiziliyordu.
export const SearchBookRow = memo(function SearchBookRow({ book, onPress }: SearchBookRowProps) {
  return (
    <Pressable
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.author}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={styles.avatar}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.avatar} />
      )}
      <View style={styles.texts}>
        <Text style={[searchType.row, styles.title]} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={[searchType.rowSub, styles.author]} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: searchMetrics.rowHeight,
    marginBottom: searchMetrics.rowPitch - searchMetrics.rowHeight,
    marginHorizontal: searchMetrics.gutter,
    paddingHorizontal: searchMetrics.gutter - 1,
    borderRadius: searchMetrics.rowRadius,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: searchMetrics.rowTextLeft,
  },
  rowPressed: {
    backgroundColor: searchColors.rowPressed,
    borderColor: searchColors.rowPressedBorder,
  },
  avatar: {
    width: searchMetrics.rowAvatar,
    height: searchMetrics.rowAvatar,
    borderRadius: searchMetrics.rowAvatar / 2,
    backgroundColor: searchColors.field,
  },
  texts: {
    flex: 1,
  },
  title: {
    color: searchColors.rowText,
  },
  author: {
    color: searchColors.subtitle,
  },
});
