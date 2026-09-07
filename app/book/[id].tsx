import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, EmptyState, ErrorState, Hairline, LoadingState, SectionHeader, useToast } from "@/components/ui";
import { useFavoritedBookIdsQuery, useToggleFavoriteMutation } from "@/features/home";
import {
  BookHero,
  BookSeriesInfo,
  BookStatsRow,
  ChapterListItem,
  useBookDetailQuery,
  useBookSeriesQuery,
} from "@/features/library";

import type { Chapter } from "@/features/library";

function ChapterSeparator() {
  return <Hairline style={styles.chapterSeparator} />;
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useBookDetailQuery(id);
  const { data: series } = useBookSeriesQuery(data?.book?.id);
  const { data: favoritedBookIds } = useFavoritedBookIdsQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const { show: showToast } = useToast();

  useEffect(() => {
    if (data?.book) {
      trackEvent("book_detail_viewed", { bookId: data.book.id });
    }
  }, [data?.book]);

  // Same fix already applied to Home/Library/Vocabulary tabs: this screen
  // can stay mounted in the nav stack while reading progress changes
  // underneath it (e.g. finishing a chapter and going back), so refetch on
  // every focus rather than relying on a mount-only fetch.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleOpenChapter = (chapter: Chapter) => {
    if (!data?.book) return;
    trackEvent("book_chapter_opened", { bookId: data.book.id, chapterId: chapter.id });
    router.push(`/reader/${chapter.id}`);
  };

  const handlePressCta = () => {
    if (!data?.book || !data.continueChapter) return;
    trackEvent(data.hasStarted ? "book_reading_continued" : "book_reading_started", {
      bookId: data.book.id,
      chapterId: data.continueChapter.id,
    });
    router.push(`/reader/${data.continueChapter.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  const handlePressNextBookInSeries = (nextBookId: string) => {
    router.push(`/book/${nextBookId}`);
  };

  const isFavorited = data?.book ? (favoritedBookIds?.has(data.book.id) ?? false) : false;

  const handleToggleFavorite = () => {
    if (!data?.book) return;
    trackEvent("book_detail_favorite_toggled", { bookId: data.book.id, isFavorited: !isFavorited });
    toggleFavoriteMutation.mutate(
      { bookId: data.book.id, isFavorited },
      {
        onSuccess: () => {
          if (!isFavorited) showToast(t("favorites.toast.added"));
        },
      },
    );
  };

  const renderChapter: ListRenderItem<Chapter> = ({ item }) => (
    <ChapterListItem chapter={item} onPress={handleOpenChapter} />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
        <LoadingState message={t("bookDetail.loading")} />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
        <ErrorState message={t("bookDetail.error")} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  const { book, progressPercent, continueChapter, hasStarted } = data;
  const ctaLabel =
    hasStarted && continueChapter
      ? t("bookDetail.cta.continue", { index: continueChapter.index })
      : t("bookDetail.cta.start");

  const ListHeader = (
    <View>
      <View style={styles.topbar}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="link"
          accessibilityLabel={t("bookDetail.backAccessibilityLabel")}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Text style={[monoType.eyebrow, styles.backLabel, { color: theme.text.secondary }]}>
            {t("bookDetail.back")}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={t(isFavorited ? "favorites.action.remove" : "favorites.action.add")}
          hitSlop={{ top: spacing.ml, bottom: spacing.ml, left: spacing.ml, right: spacing.ml }}
          style={styles.favoriteButton}
        >
          <Text style={[type.sectionHeading, { color: isFavorited ? theme.accent : theme.text.secondary }]}>
            {isFavorited ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>

      <BookHero book={book} />
      <BookStatsRow book={book} progressPercent={progressPercent} />
      {series ? <BookSeriesInfo series={series} onPressNextBook={handlePressNextBookInSeries} /> : null}

      <View style={styles.cta}>
        <Button label={ctaLabel} onPress={handlePressCta} disabled={!continueChapter} fullWidth />
      </View>

      <SectionHeader title={t("bookDetail.chapters")} style={styles.sectionHead} />

      {book.chapters.length === 0 ? (
        <EmptyState title={t("bookDetail.empty.title")} description={t("bookDetail.empty.description")} />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <FlashList
        data={book.chapters}
        keyExtractor={(item) => item.id}
        renderItem={renderChapter}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ChapterSeparator}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  backLabel: {
    alignSelf: "flex-start",
  },
  favoriteButton: {
    padding: spacing.xs,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.ml,
  },
  sectionHead: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.section,
  },
  chapterSeparator: {
    marginHorizontal: spacing.lg,
  },
});
