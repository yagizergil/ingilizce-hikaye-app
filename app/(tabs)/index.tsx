import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { ErrorState, Skeleton } from "@/components/ui";
import {
  BookShelf,
  CategoryShelf,
  CollectionShelf,
  CurrentlyReadingShelf,
  EmptyHome,
  LevelGroupCard,
  useCurrentlyReadingQuery,
  useHomeExtrasQuery,
  useRemoveFromCurrentlyReadingMutation,
} from "@/features/home";
import { LEVEL_GROUPS } from "@/features/library";

import type { CategoryTag, CategoryTagNavTarget, CollectionCardData } from "@/features/home";
import type { Book, LevelGroup } from "@/features/library";

/** Loading placeholder: 3 skeleton shelves, never a blank screen while
 * `useHomeExtrasQuery` is in flight. */
function HomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          <Skeleton width={120} height={20} />
          <View style={styles.skeletonCovers}>
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} width={92} height={138} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const {
    data: extras,
    isLoading: isExtrasLoading,
    isError: isExtrasError,
    refetch: refetchExtras,
  } = useHomeExtrasQuery();
  const { data: currentlyReading, refetch: refetchCurrentlyReading } = useCurrentlyReadingQuery();
  const removeFromCurrentlyReadingMutation = useRemoveFromCurrentlyReadingMutation();

  useEffect(() => {
    trackEvent("home_viewed");
  }, []);

  // Same fix as the Library/Vocabulary tabs: Expo Router keeps this screen
  // mounted across tab switches, so a newly published book (or a level
  // group that only now has members) would never appear without a fresh
  // fetch on every focus.
  useFocusEffect(
    useCallback(() => {
      void refetchExtras();
      void refetchCurrentlyReading();
    }, [refetchExtras, refetchCurrentlyReading]),
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      trackEvent("home_book_opened", { bookId: book.id });
      router.push(`/book/${book.id}`);
    },
    [router],
  );

  const handlePressCategoryTag = useCallback(
    (tag: CategoryTag) => {
      trackEvent("home_category_tag_pressed", { key: tag.key });
      const target: CategoryTagNavTarget = tag.navTarget;
      if (target.kind === "book") {
        router.push(`/book/${target.bookId}`);
        return;
      }
      const searchParams = new URLSearchParams();
      searchParams.set("title", tag.label);
      if (target.genre) searchParams.set("genre", target.genre);
      if (target.q) searchParams.set("q", target.q);
      if (target.levelGroup) searchParams.set("levelGroup", target.levelGroup);
      router.push(`/browse?${searchParams.toString()}`);
    },
    [router],
  );

  const handlePressLevelGroup = useCallback(
    (levelGroup: LevelGroup) => {
      trackEvent("home_level_group_pressed", { levelGroup });
      router.push(`/browse?levelGroup=${levelGroup}`);
    },
    [router],
  );

  const handleRemoveCurrentlyReading = useCallback(
    (book: Book) => {
      trackEvent("home_currently_reading_removed", { bookId: book.id });
      removeFromCurrentlyReadingMutation.mutate(book.id);
    },
    [removeFromCurrentlyReadingMutation],
  );

  const handlePressCollection = useCallback(
    (collection: CollectionCardData) => {
      trackEvent("home_collection_pressed", { key: collection.key });
      const searchParams = new URLSearchParams();
      searchParams.set("title", collection.label);
      if (collection.key === "popular") searchParams.set("popular", "true");
      if (collection.key === "audiobooks") searchParams.set("hasAudio", "true");
      router.push(`/browse?${searchParams.toString()}`);
    },
    [router],
  );

  if (isExtrasLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <View style={styles.topBar}>
          <Text style={[type.wordmark, { color: theme.text.primary }]}>{t("app.name")}</Text>
        </View>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (isExtrasError || !extras) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ErrorState message={t("home.error")} onRetry={() => void refetchExtras()} />
      </SafeAreaView>
    );
  }

  const { newBooks, categoryTags, authorSeriesTags, levelGroupCounts } = extras;

  // See EmptyHome.tsx's doc comment: level-group cards always render, so
  // the only state that still warrants the full-screen empty view is an
  // empty catalog (no books published yet) — every other section derives
  // from the same book list, so `newBooks.length === 0` implies they're
  // all empty too.
  const hasAnyContent = newBooks.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      {/*
        FAZ 2 (2026-09-14, referans uygulama eşleştirmesi): üst barda
        tek kelimelik logotype dışında hiçbir şey yok -- ne "+" düğmesi
        (üstteki eski not hâlâ geçerli: eklenebilecek bir şey yok), ne de
        seri (streak) göstergesi. Seri zaten Profil ekranında görünüyor;
        ana sayfanın üst barına taşınması yalnızca eski bir tasarım
        denemesiydi, referansta karşılığı yok.
      */}
      <View style={styles.topBar}>
        <Text style={[type.wordmark, { color: theme.text.primary }]}>{t("app.name")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasAnyContent ? (
          <EmptyHome />
        ) : (
          <>
            {/*
              FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): "Kaldığın
              yer" hero kartı kaldırıldı -- referansta logotype'tan hemen
              sonra doğrudan "Yeni kitaplar" rafı başlıyor, ayrı bir
              "devam et" bloğu yok. Kaldığın yere dönme eylemi zaten
              "Şu an okunuyor" rafında (aşağıda) karşılanıyor.
            */}
            <BookShelf
              title={t("home.newBooks.title")}
              books={newBooks}
              onPressBook={handleOpenBook}
            />

            <CurrentlyReadingShelf
              books={currentlyReading ?? []}
              onPressBook={handleOpenBook}
              onRemoveBook={handleRemoveCurrentlyReading}
            />

            <CollectionShelf onPressCollection={handlePressCollection} />

            <CategoryShelf
              title={t("home.categories.title")}
              tags={categoryTags}
              onPressTag={handlePressCategoryTag}
            />

            <CategoryShelf
              title={t("home.authorsAndSeries.title")}
              tags={authorSeriesTags}
              onPressTag={handlePressCategoryTag}
            />

            <View style={[styles.levelGroups, { backgroundColor: theme.bg.surface }]}>
              {LEVEL_GROUPS.map((group, index) => (
                <LevelGroupCard
                  key={group}
                  levelGroup={group}
                  count={levelGroupCounts[group]}
                  onPress={handlePressLevelGroup}
                  isLast={index === LEVEL_GROUPS.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.screenBottom,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  levelGroups: {
    marginTop: spacing.sectionGap,
    marginHorizontal: spacing.lg,
    borderRadius: radius.cover,
    overflow: "hidden",
  },
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xxl,
    marginTop: spacing.md,
  },
  skeletonRow: {
    gap: spacing.sm,
  },
  skeletonCovers: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
