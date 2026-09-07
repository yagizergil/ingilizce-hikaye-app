import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { ErrorState, Skeleton } from "@/components/ui";
import { useOnboardingStatusQuery } from "@/features/onboarding";
import { useProfileStatsQuery } from "@/features/profile";
import {
  BookShelf,
  CategoryShelf,
  CurrentlyReadingShelf,
  EmptyHome,
  HomeHero,
  LevelGroupCard,
  StreakChip,
  useCurrentlyReadingQuery,
  useHomeExtrasQuery,
  useRemoveFromCurrentlyReadingMutation,
} from "@/features/home";
import { LEVEL_GROUPS } from "@/features/library";

import type { CategoryTag, CategoryTagNavTarget } from "@/features/home";
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
  const { data: onboarding } = useOnboardingStatusQuery();
  // Seri ana ekranda görünüyor: Profil'in içinde kalan bir sayaç davranışı
  // etkilemiyordu (bkz. StreakChip'in gerekçesi).
  const { data: profileStats } = useProfileStatsQuery();

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

  const handleOpenStreak = useCallback(() => {
    trackEvent("home_streak_pressed", { streak: profileStats?.currentStreak ?? 0 });
    router.push("/profile");
  }, [profileStats?.currentStreak, router]);

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

  // Hero'nun "kitaplara göz at" eylemi: kullanıcının seviyesi varsa doğrudan
  // o seviyeye filtreli açılıyor, yoksa tüm katalog.
  const handleBrowseAtLevel = useCallback(() => {
    const level = onboarding?.targetLevel;
    trackEvent("home_hero_browse", { level: level ?? "none" });
    router.push(level ? `/browse?q=${level}` : "/browse");
  }, [router, onboarding?.targetLevel]);

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
        Ust barda "+" dugmesi VARDI ve kaldirildi. Referans uygulamadan
        alinmisti ama bu uygulamada kullanicinin ekleyebilecegi bir sey
        yok (icerik yalnizca pipeline'dan gelir, urun ilkesi #3), bu
        yuzden Kutuphane sekmesine gidiyordu. "+" evrensel olarak
        "olustur/ekle" demek; kullanici ne yaptigini anlamadigini
        bildirdi. Ustelik Kutuphane zaten alt barda kendi sekmesinde —
        dugme hem yaniltici hem gereksizdi.
      */}
      <View style={styles.topBar}>
        <Text style={[type.wordmark, { color: theme.text.primary }]}>{t("app.name")}</Text>
        <View style={styles.topBarActions}>
          <StreakChip
            streak={profileStats?.currentStreak ?? 0}
            readToday={profileStats?.readToday ?? false}
            onPress={handleOpenStreak}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasAnyContent ? (
          <EmptyHome />
        ) : (
          <>
            <HomeHero
              level={onboarding?.targetLevel ?? null}
              continueBook={currentlyReading?.[0]?.book ?? null}
              continuePercent={currentlyReading?.[0]?.progressPercent}
              onContinue={handleOpenBook}
              onBrowseLevel={handleBrowseAtLevel}
            />

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
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
    borderRadius: radius.sm,
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
