import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect } from "expo-router";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { Button, LoadingState, ErrorState, EmptyState, FilterTab } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";
import {
  VocabularyWordRow,
  useFilteredWords,
  useVocabularyFiltersStore,
  useVocabularyQuery,
} from "@/features/vocabulary";

import type { VocabularyFilter, VocabularyWord } from "@/features/vocabulary";

const FILTER_TABS: VocabularyFilter[] = ["all", "due", "known"];

function RowGap() {
  return <View style={{ height: spacing.xs }} />;
}

export default function VocabularyScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useVocabularyQuery();
  const filter = useVocabularyFiltersStore((state) => state.filter);
  const setFilter = useVocabularyFiltersStore((state) => state.setFilter);
  const words = useFilteredWords(data?.words, filter);

  useEffect(() => {
    trackEvent("vocabulary_viewed");
  }, []);

  // Expo Router keeps tab screens mounted across tab switches, so a plain
  // mount-effect only fires once ever -- a word saved in the reader after
  // this screen's first visit would never appear without navigating away
  // and back, since TanStack Query's cache (staleTime) wouldn't naturally
  // refetch on a tab that's still mounted. Refetch every time this tab
  // actually gains focus instead, so newly saved words always show up.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleSelectFilter = useCallback(
    (nextFilter: VocabularyFilter) => {
      trackEvent("vocabulary_filter_changed", { filter: nextFilter });
      setFilter(nextFilter);
    },
    [setFilter],
  );

  const handlePressWord = useCallback((word: VocabularyWord) => {
    trackEvent("vocabulary_word_pressed", { lemma: word.lemma });
  }, []);

  const dueCount = data?.summary.dueTodayCount ?? 0;

  // Defter dolmaya yaklaşınca sakin bir bilgi şeridi. Paywall'un dört
  // konumundan biri (diğerleri: Profil, kitap bitirme ekranı ve tekrar
  // serisi); okuma akışının dışında olduğu için ilke #1'i ihlal etmiyor.
  //
  // EŞİK %80'DEN %60'A ÇEKİLDİ (2026-09-07 denetimi): %80'de kullanıcı
  // sınıra yalnızca 20 kelime kala ilk kez haberdar oluyordu — hem
  // "birden karşıma çıktı" hissi veriyor hem de karar için zaman
  // bırakmıyordu. %60, sınırı sakin bir bilgi olarak önceden duyurup
  // kullanıcıya seçme alanı bırakıyor.
  const WORD_LIST_STRIP_THRESHOLD = 0.6;
  const subscription = useSubscriptionQuery();
  const showWordListStrip =
    subscription.data != null &&
    !subscription.data.isPremium &&
    subscription.data.savedWordCount >=
      subscription.data.savedWordLimit * WORD_LIST_STRIP_THRESHOLD;

  const handleOpenPaywall = useCallback(() => {
    trackEvent("paywall_opened", { source: "vocabulary_strip" });
    router.push("/paywall?source=vocabulary_strip");
  }, []);

  const handleStartReview = useCallback(() => {
    trackEvent("srs_review_opened", { due_count: dueCount });
    router.push("/review");
  }, [dueCount]);

  const renderWord: ListRenderItem<VocabularyWord> = useCallback(
    ({ item }) => <VocabularyWordRow word={item} onPress={handlePressWord} />,
    [handlePressWord],
  );

  const filterTabLabel = (tab: VocabularyFilter) => t(`vocabulary.filters.${tab}`);

  const hasAnySavedWord = (data?.words.length ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, { color: theme.text.primary }]}>{t("vocabulary.title")}</Text>
        {data ? (
          <Text style={[monoType.summary, styles.summary, { color: theme.text.secondary }]}>
            {t("vocabulary.summary", { total: data.summary.totalCount, due: data.summary.dueTodayCount })}
          </Text>
        ) : null}
      </View>

      <View style={[styles.filters, { borderBottomColor: theme.border.hairline }]}>
        {FILTER_TABS.map((tab) => (
          <FilterTab
            key={tab}
            label={filterTabLabel(tab)}
            selected={filter === tab}
            onPress={() => handleSelectFilter(tab)}
          />
        ))}
      </View>

      {showWordListStrip && subscription.data ? (
        <Pressable
          style={[styles.strip, { borderColor: theme.border.hairline }]}
          onPress={handleOpenPaywall}
          accessibilityRole="button"
        >
          <Text style={[monoType.label, { color: theme.text.secondary }]}>
            {t("paywall.wordListFull", {
              count: subscription.data.savedWordCount,
              limit: subscription.data.savedWordLimit,
            })}
          </Text>
        </Pressable>
      ) : null}

      {dueCount > 0 ? (
        <View style={styles.reviewCta}>
          <Button
            label={t("srs.startButton")}
            onPress={handleStartReview}
            fullWidth
            accessibilityLabel={t("srs.dueBadge", { count: dueCount })}
          />
          <Text style={[monoType.label, styles.reviewNote, { color: theme.text.secondary }]}>
            {t("srs.dueBadge", { count: dueCount })}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState message={t("vocabulary.loading")} />
      ) : isError ? (
        <ErrorState message={t("vocabulary.error")} onRetry={() => void refetch()} />
      ) : words.length === 0 ? (
        hasAnySavedWord ? (
          <EmptyState title={t("vocabulary.empty.noMatch.title")} description={t("vocabulary.empty.noMatch.description")} />
        ) : (
          <EmptyState title={t("vocabulary.empty.noWords.title")} description={t("vocabulary.empty.noWords.description")} />
        )
      ) : (
        <FlashList
          data={words}
          keyExtractor={(item) => item.id}
          renderItem={renderWord}
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
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xs,
  },
  summary: {
    marginTop: spacing.xs,
  },
  filters: {
    flexDirection: "row",
    gap: spacing.ml,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.screenBottom,
  },
  reviewCta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  reviewNote: {
    textAlign: "center",
  },
  strip: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    alignItems: "center",
  },
});
