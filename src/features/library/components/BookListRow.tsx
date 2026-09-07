import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  coverColumnHeight,
  coverColumnWidth,
  levelAccent,
  monoType,
  motion,
  radius,
  spacing,
  type,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { BookCover, LevelBadge, StatCell } from "@/components/ui";

import type { Book } from "@/features/library/types";

interface BookListRowProps {
  book: Book;
  onPress: (book: Book) => void;
  /** Optional long-press quick action (used by app/(tabs)/library.tsx to
   * toggle favorite status) — no mockup/prior usage of long-press on this
   * row, so this is additive and doesn't conflict with anything. */
  onLongPress?: (book: Book) => void;
}

/**
 * library.html `.book` — 64px cover + flex content column: bordered level
 * badge, Fraunces title, mono author, then a row of three `StatCell`s
 * (word count / chapter count / duration). No card/box — the hairline
 * divider between rows is drawn by the screen's `FlashList`
 * `ItemSeparatorComponent`, not by this row itself.
 */
export function BookListRow({ book, onPress, onLongPress }: BookListRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Seviye rengi artık yalnızca rozette değil, satırın sol kenarında da bir
  // şerit olarak duruyor: kullanıcı listeyi kaydırırken seviyeyi okumadan,
  // renkten tarayabiliyor. Rakiplerin hiçbiri seviyeyi görsel bir sisteme
  // çevirmiyor (bkz. docs/aso/01-rakipler.md).
  const stripe =
    book.level in levelAccent
      ? levelAccent[book.level as keyof typeof levelAccent]
      : theme.border.hairline;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
        pressed ? { opacity: motion.pressed.opacity } : null,
      ]}
      onPress={() => onPress(book)}
      onLongPress={onLongPress ? () => onLongPress(book) : undefined}
      accessibilityRole="button"
      accessibilityLabel={t("library.book.accessibilityLabel", {
        title: book.title,
        author: book.author,
        level: book.level,
      })}
    >
      <View style={[styles.stripe, { backgroundColor: stripe }]} />

      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        width={coverColumnWidth.md}
        height={coverColumnHeight.md}
      />
      <View style={styles.content}>
        <View>
          <LevelBadge level={book.level} />
          <Text style={[type.bookTitleLg, styles.title, { color: theme.text.primary }]} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={[monoType.author, styles.author, { color: theme.text.secondary }]} numberOfLines={1}>
            {book.author}
          </Text>
        </View>
        <View style={styles.stats}>
          <StatCell value={book.wordCount.toLocaleString("tr-TR")} label={t("library.stats.words")} />
          <StatCell value={String(book.chapters.length)} label={t("library.stats.chapters")} />
          <StatCell value={String(book.estimatedMinutes)} label={t("library.stats.minutes")} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  stripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    marginTop: spacing.xs,
  },
  author: {
    marginTop: spacing.xxs,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
