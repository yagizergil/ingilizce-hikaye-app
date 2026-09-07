import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";

import { badgePadding, coverColumnHeight, coverColumnWidth, monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, LevelBadge, SectionHeader } from "@/components/ui";

import type { Book } from "@/features/library/types";

interface ShelfBookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  /** e.g. "2/5" — the "continuing series" shelf's series-position badge.
   * Undefined for every other shelf, which renders no badge at all. */
  progressLabel?: string;
}

/**
 * Compact vertical card for a horizontal shelf: `BookCover` (2:3, same
 * dimensions/asset as `BookListRow`'s cover) + `LevelBadge` + Fraunces
 * title + mono author, at a fixed card width — the same badge/title/author
 * stack `BookListRow` (src/features/library/components/BookListRow.tsx)
 * uses, just laid out vertically instead of next to a horizontal row.
 */
function ShelfBookCard({ book, onPress, progressLabel }: ShelfBookCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={t("library.book.accessibilityLabel", {
        title: book.title,
        author: book.author,
        level: book.level,
      })}
    >
      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        width={coverColumnWidth.shelf}
        height={coverColumnHeight.shelf}
      />
      <View style={styles.cardInfo}>
        <View style={styles.badgeRow}>
          <LevelBadge level={book.level} />
          {progressLabel ? (
            <View
              style={[styles.seriesBadge, { borderColor: theme.border.strong }]}
              accessibilityRole="text"
              accessibilityLabel={t("home.seriesCard.progress", {
                current: progressLabel.split("/")[0],
                total: progressLabel.split("/")[1],
              })}
            >
              <Text style={[monoType.badge, { color: theme.text.primary }]}>{progressLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[type.bookTitleMd, styles.cardTitle, { color: theme.text.primary }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[monoType.author, { color: theme.text.secondary }]} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
}

interface BookShelfProps {
  title: string;
  moreLabel?: string;
  onPressMore?: () => void;
  books: Book[];
  onPressBook: (book: Book) => void;
  /** e.g. "2/5" per book id — only the "continuing series" shelf passes
   * this today. */
  progressLabels?: Record<string, string>;
}

/** Reusable horizontal shelf: `SectionHeader` (Fraunces title + mono
 * "Tümü" link) above a horizontal `FlashList` of book covers. Callers are
 * responsible for not rendering this at all when `books` is empty — see
 * `HomeScreen`, which filters shelves before mapping them to this
 * component (component-level hide, not an empty-array render). */
export function BookShelf({ title, moreLabel, onPressMore, books, onPressBook, progressLabels }: BookShelfProps) {
  const renderItem: ListRenderItem<Book> = ({ item }) => (
    <ShelfBookCard book={item} onPress={onPressBook} progressLabel={progressLabels?.[item.id]} />
  );

  return (
    <View style={styles.container}>
      <SectionHeader title={title} moreLabel={moreLabel} onPressMore={onPressMore} style={styles.head} />
      <FlashList
        horizontal
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// Matches coverColumnWidth.shelf exactly -- the cover fills the card's
// full width edge-to-edge, no dead space beside it (see that token's doc
// comment for why this changed from a fixed 132px).
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
  cardInfo: {
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
  seriesBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: badgePadding.vertical,
    paddingHorizontal: badgePadding.horizontal,
    alignSelf: "flex-start",
  },
  cardTitle: {
    marginTop: spacing.xxs,
  },
});
