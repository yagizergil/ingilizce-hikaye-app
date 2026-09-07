import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { coverColumnHeight, coverColumnWidth, monoType, onLevelAccent, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, SectionHeader } from "@/components/ui";

import type { CurrentlyReadingBook } from "@/features/home/api/useCurrentlyReadingQuery";
import type { Book } from "@/features/library/types";

interface CurrentlyReadingCardProps {
  entry: CurrentlyReadingBook;
  onPress: (book: Book) => void;
  onRemove: (book: Book) => void;
}

function CurrentlyReadingCard({ entry, onPress, onRemove }: CurrentlyReadingCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { book, progressPercent } = entry;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPress(book)} accessibilityRole="button" accessibilityLabel={book.title}>
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          width={coverColumnWidth.shelf}
          height={coverColumnHeight.shelf}
        />
      </Pressable>
      <Pressable
        onPress={() => onRemove(book)}
        style={[styles.removeButton, { backgroundColor: theme.overlay }]}
        accessibilityRole="button"
        accessibilityLabel={t("home.currentlyReading.removeAccessibilityLabel", { title: book.title })}
        hitSlop={spacing.xs}
      >
        <Ionicons name="close" size={14} color={onLevelAccent} />
      </Pressable>
      <Text style={[monoType.percent, styles.percent, { color: theme.text.secondary }]}>
        {t("home.currentlyReading.percent", { percent: progressPercent })}
      </Text>
    </View>
  );
}

interface CurrentlyReadingShelfProps {
  books: CurrentlyReadingBook[];
  onPressBook: (book: Book) => void;
  onRemoveBook: (book: Book) => void;
}

/**
 * "Şu an okunuyor" home shelf -- every in-progress book with its own
 * percent below the cover and a small "x" dismiss overlay, matching the
 * reference app. Distinct from `ContinueReadingCard` (the single-book
 * "Kaldığın yer" hero at the top of the screen) -- this shows ALL
 * in-progress books, not just the most recent one.
 */
export function CurrentlyReadingShelf({ books, onPressBook, onRemoveBook }: CurrentlyReadingShelfProps) {
  const { t } = useTranslation();
  if (books.length === 0) return null;

  const renderItem: ListRenderItem<CurrentlyReadingBook> = ({ item }) => (
    <CurrentlyReadingCard entry={item} onPress={onPressBook} onRemove={onRemoveBook} />
  );

  return (
    <View style={styles.container}>
      <SectionHeader title={t("home.currentlyReading.title")} style={styles.head} />
      <FlashList
        horizontal
        data={books}
        keyExtractor={(item) => item.book.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const CARD_WIDTH = coverColumnWidth.shelf;

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xxxxl,
  },
  head: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  removeButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
