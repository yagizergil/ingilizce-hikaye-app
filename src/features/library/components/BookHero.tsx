import { StyleSheet, Text, View } from "react-native";

import { coverColumnHeight, coverColumnWidth, monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, LevelBadge } from "@/components/ui";

import type { Book } from "@/features/library/types";

interface BookHeroProps {
  book: Book;
}

/**
 * book-detail.html `.hero` — asymmetric grid: 104px `BookCover` + info
 * column (bordered mono `LevelBadge`, Fraunces `heroTitle`, mono author),
 * info column uses `justify-content: space-between` per the mockup's
 * `.hero .info` rule.
 */
export function BookHero({ book }: BookHeroProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        width={coverColumnWidth.lg}
        height={coverColumnHeight.lg}
      />
      <View style={styles.info}>
        <LevelBadge level={book.level} />
        <Text style={[type.heroTitle, styles.title, { color: theme.text.primary }]} numberOfLines={3}>
          {book.title}
        </Text>
        <Text style={[monoType.authorLg, { color: theme.text.secondary }]} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.ml,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    marginVertical: spacing.xs,
  },
});
