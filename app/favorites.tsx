import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { EmptyState, ErrorState, Hairline, LoadingState, SectionHeader } from "@/components/ui";
import { useFavoritesReadListsQuery } from "@/features/home";
import { BookListRow } from "@/features/library";

import type { Book } from "@/features/library";

interface BookSectionProps {
  title: string;
  books: Book[];
  emptyTitle: string;
  emptyDescription: string;
  onPressBook: (book: Book) => void;
}

function BookSection({ title, books, emptyTitle, emptyDescription, onPressBook }: BookSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} style={styles.sectionHead} />
      {books.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        books.map((book, index) => (
          <View key={book.id}>
            <BookListRow book={book} onPress={onPressBook} />
            {index < books.length - 1 ? <Hairline /> : null}
          </View>
        ))
      )}
    </View>
  );
}

/** Stack-pushed screen (not a tab), same pattern as app/book/[id].tsx —
 * reached from home's `FavoritesReadCard`. */
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useFavoritesReadListsQuery();

  useEffect(() => {
    trackEvent("favorites_screen_viewed");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("favorites_screen_book_opened", { bookId: book.id });
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>{t("favorites.screen.title")}</Text>
      </View>

      {isLoading ? (
        <LoadingState message={t("favorites.screen.loading")} />
      ) : isError || !data ? (
        <ErrorState message={t("favorites.screen.error")} onRetry={() => void refetch()} />
      ) : data.favorites.length === 0 && data.read.length === 0 ? (
        <EmptyState
          title={t("favorites.screen.emptyBoth.title")}
          description={t("favorites.screen.emptyBoth.description")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BookSection
            title={t("favorites.screen.favoritesSection")}
            books={data.favorites}
            emptyTitle={t("favorites.screen.emptyFavorites.title")}
            emptyDescription={t("favorites.screen.emptyFavorites.description")}
            onPressBook={handleOpenBook}
          />
          <BookSection
            title={t("favorites.screen.readSection")}
            books={data.read}
            emptyTitle={t("favorites.screen.emptyRead.title")}
            emptyDescription={t("favorites.screen.emptyRead.description")}
            onPressBook={handleOpenBook}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.section,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHead: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
