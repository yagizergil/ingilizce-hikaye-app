import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { detailColors, homeMetrics, homeSpace, mascotSize } from "@/theme";
import { trackEvent } from "@/lib/analytics";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  MascotAnim,
  SkyHeader,
  useToast,
} from "@/components/ui";
import {
  HomeBookCard,
  useFavoritedBookIdsQuery,
  useFinishedBookIdsQuery,
  useToggleFavoriteMutation,
} from "@/features/home";
import { useLibraryBooksQuery, useLocalBookFilter, prefetchBookDetail } from "@/features/library";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";

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
export default function BrowseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    levelGroup?: string;
    genre?: string;
    q?: string;
    popular?: string;
    hasAudio?: string;
    maxMinutes?: string;
    level?: string;
  }>();
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useLibraryBooksQuery();
  const books = useLocalBookFilter(data, {
    query: params.q,
    levelGroup: params.levelGroup as LevelGroup | undefined,
    maxMinutes: params.maxMinutes ? Number(params.maxMinutes) : undefined,
    level: params.level,
    genre: params.genre,
    popular: params.popular === "true",
    hasAudio: params.hasAudio === "true",
  });
  const { data: favoritedBookIds } = useFavoritedBookIdsQuery();
  const { data: finishedBookIds } = useFinishedBookIdsQuery();
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

  useRefetchOnFocusIfStale([{ dataUpdatedAt, refetch }]);

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("browse_book_opened", { bookId: book.id });
      prefetchBookDetail(book.id);
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
          // DENETİM BULGUSU (2026-09-19): `onError` hiç yoktu. Sunucu
          // hatasında `onSettled` sorguları geçersiz kılıyor, kalp eski
          // hâline geri dönüyor ve kullanıcı dokunuşunun neden hiçbir şey
          // yapmadığını ÖĞRENEMİYOR -- arıza gibi görünüyor.
          onError: () => {
            showToast(t("favorites.toast.failed"));
          },
        },
      );
    },
    [favoritedBookIds, toggleFavoriteMutation, showToast, t],
  );

  const renderBook: ListRenderItem<Book> = useCallback(
    ({ item }) => (
      <View style={styles.cell}>
        <HomeBookCard
          book={item}
          finished={finishedBookIds?.has(item.id) ?? false}
          onPress={handleOpenBook}
          onLongPress={handleToggleFavorite}
          fluid
        />
      </View>
    ),
    [finishedBookIds, handleOpenBook, handleToggleFavorite],
  );

  const fallbackTitle = params.levelGroup
    ? t(`browse.fallbackTitle.${params.levelGroup}`)
    : t("tabs.search");
  const title = params.title ?? fallbackTitle;

  const header = (
    <SkyHeader
      title={title}
      subtitle={t("categoriesScreen.count", { count: books.length })}
      onBack={() => router.back()}
      art={<MascotAnim name="search" width={mascotSize.header} />}
    />
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <>
          {header}
          <LoadingState message={t("browse.loading")} />
        </>
      ) : isError ? (
        <>
          {header}
          <ErrorState message={t("browse.error")} onRetry={() => void refetch()} />
        </>
      ) : books.length === 0 ? (
        <>
          {header}
          <EmptyState title={t("browse.empty.title")} description={t("browse.empty.description")} />
        </>
      ) : (
        <FlashList
          data={books}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: detailColors.circle,
  },
  listContent: {
    paddingHorizontal: homeMetrics.gutter - homeSpace.sm,
    paddingBottom: homeSpace.xl * 3,
  },
  cell: {
    flex: 1,
    paddingHorizontal: homeSpace.sm,
    paddingBottom: homeSpace.xl,
  },
});
