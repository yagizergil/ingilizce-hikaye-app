import { useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { LoadingState, ErrorState, EmptyState, FilterTab, useToast } from "@/components/ui";
import { useFavoritedBookIdsQuery, useToggleFavoriteMutation } from "@/features/home";
import {
  BookListRow,
  LEVEL_GROUPS,
  useFilteredBooks,
  useLibraryBooksQuery,
  useLibraryFiltersStore,
} from "@/features/library";

import type { Book, LevelGroup } from "@/features/library";

// "Tümü" + the 3 CEFR groups (see LEVEL_GROUP_LEVELS) — replaces the old
// per-CEFR-level tabs (A1..C1, which was also missing C2 entirely).
const LEVEL_TABS: (LevelGroup | "all")[] = ["all", ...LEVEL_GROUPS];

const LEVEL_GROUP_LABEL_KEYS: Record<LevelGroup, string> = {
  beginner: "library.filters.levelGroup.beginner",
  intermediate: "library.filters.levelGroup.intermediate",
  advanced: "library.filters.levelGroup.advanced",
};

function RowGap() {
  return <View style={{ height: spacing.sm }} />;
}

export default function LibraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useLibraryBooksQuery();
  const books = useFilteredBooks(data);
  const levelGroup = useLibraryFiltersStore((state) => state.levelGroup);
  const setLevelGroup = useLibraryFiltersStore((state) => state.setLevelGroup);
  const { data: favoritedBookIds } = useFavoritedBookIdsQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const { show: showToast } = useToast();

  useEffect(() => {
    trackEvent("library_viewed");
  }, []);

  // Expo Router keeps tab screens mounted across tab switches, so a plain
  // mount-effect only fires once ever -- a newly published/updated book
  // (e.g. a new cover_url) would never appear here without navigating away
  // and back, since TanStack Query's cache wouldn't naturally refetch on a
  // tab that's still mounted. Refetch every time this tab actually gains
  // focus instead (same fix already applied to the Vocabulary tab for the
  // same underlying issue).
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleSelectLevelGroup = useCallback(
    (nextLevelGroup: LevelGroup | "all") => {
      trackEvent("library_filter_changed", { levelGroup: nextLevelGroup });
      setLevelGroup(nextLevelGroup);
    },
    [setLevelGroup],
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("library_book_opened", { bookId: book.id });
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const handleToggleFavorite = useCallback(
    (book: Book) => {
      const isFavorited = favoritedBookIds?.has(book.id) ?? false;
      trackEvent("library_book_favorite_toggled", { bookId: book.id, isFavorited: !isFavorited });
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

  const levelTabLabel = (tab: LevelGroup | "all") =>
    tab === "all" ? t("library.filters.levelAll") : t(LEVEL_GROUP_LABEL_KEYS[tab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>{t("library.title")}</Text>
      </View>

      <View style={[styles.filters, { borderBottomColor: theme.border.hairline }]}>
        {LEVEL_TABS.map((tab) => (
          <FilterTab
            key={tab}
            label={levelTabLabel(tab)}
            selected={levelGroup === tab}
            onPress={() => handleSelectLevelGroup(tab)}
          />
        ))}
      </View>

      {isLoading ? (
        <LoadingState message={t("library.loading")} />
      ) : isError ? (
        <ErrorState message={t("library.error")} onRetry={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState title={t("library.empty.title")} description={t("library.empty.description")} />
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
  filters: {
    flexDirection: "row",
    gap: spacing.ml,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.section,
  },
});
