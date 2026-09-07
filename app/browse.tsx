import { useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { LoadingState, ErrorState, EmptyState, useToast } from "@/components/ui";
import { useFavoritedBookIdsQuery, useToggleFavoriteMutation } from "@/features/home";
import { BookListRow, useLibraryBooksQuery, useLocalBookFilter } from "@/features/library";

import type { Book, LevelGroup } from "@/features/library";

/**
 * Stack-pushed screen (not a tab) for a single home-driven tag/level-group
 * destination — "Yazarlar ve Seriler", "Türler ve Konular", and the
 * Başlangıç/Orta/Gelişmiş level cards all land here instead of the Library
 * tab. Deliberately does NOT read or write `useLibraryFiltersStore`: that
 * store belongs to the Library tab's own filter UI, and routing a home tag
 * through it was exactly what caused the Library tab to appear "stuck"
 * filtered after visiting a tag. This screen keeps its filter criteria
 * entirely in the route params (see useLocalBookFilter).
 */
function RowGap() {
  return <View style={{ height: spacing.sm }} />;
}

export default function BrowseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ title?: string; levelGroup?: string; genre?: string; q?: string }>();
  const { data, isLoading, isError, refetch } = useLibraryBooksQuery();
  const books = useLocalBookFilter(data, {
    query: params.q,
    levelGroup: params.levelGroup as LevelGroup | undefined,
    genre: params.genre,
  });
  const { data: favoritedBookIds } = useFavoritedBookIdsQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const { show: showToast } = useToast();

  useEffect(() => {
    trackEvent("browse_viewed", {
      levelGroup: params.levelGroup ?? "none",
      genre: params.genre ?? "none",
      q: params.q ?? "none",
    });
    // Only re-fire on an actual param change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.levelGroup, params.genre, params.q]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("browse_book_opened", { bookId: book.id });
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const handleToggleFavorite = useCallback(
    (book: Book) => {
      const isFavorited = favoritedBookIds?.has(book.id) ?? false;
      trackEvent("browse_book_favorite_toggled", { bookId: book.id, isFavorited: !isFavorited });
      toggleFavoriteMutation.mutate(
        { bookId: book.id, isFavorited },
        {
          onSuccess: () => {
            if (!isFavorited) showToast(t("favorites.toast.added"));
          },
        },
      );
    },
    [favoritedBookIds, toggleFavoriteMutation, showToast, t],
  );

  const renderBook: ListRenderItem<Book> = useCallback(
    ({ item }) => <BookListRow book={item} onPress={handleOpenBook} onLongPress={handleToggleFavorite} />,
    [handleOpenBook, handleToggleFavorite],
  );

  const fallbackTitle = params.levelGroup
    ? t(`browse.fallbackTitle.${params.levelGroup}`)
    : t("tabs.library");
  const title = params.title ?? fallbackTitle;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>{title}</Text>
      </View>

      {isLoading ? (
        <LoadingState message={t("browse.loading")} />
      ) : isError ? (
        <ErrorState message={t("browse.error")} onRetry={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState title={t("browse.empty.title")} description={t("browse.empty.description")} />
      ) : (
        <FlashList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={RowGap}
          showsVerticalScrollIndicator={false}
        />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.section,
  },
});
