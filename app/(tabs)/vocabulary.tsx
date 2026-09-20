import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect } from "expo-router";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import {
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  SegmentedControl,
  useToast,
} from "@/components/ui";
import { useRemoveSavedWordMutation } from "@/features/reader";
import { useSubscriptionQuery } from "@/features/paywall";
import {
  DecksTab,
  VocabularyWordRow,
  useFilteredWords,
  useVocabularyFiltersStore,
  useVocabularyQuery,
} from "@/features/vocabulary";

import type { SegmentOption } from "@/components/ui";
import type { VocabularyFilter, VocabularyWord } from "@/features/vocabulary";

const FILTER_TABS: VocabularyFilter[] = ["all", "due", "known"];

/**
 * Üst sekme: kitaplardan gelen kelimeler mi, kullanıcının kendi destesi mi
 * (1.0.3, "Kelimelerim" yeniden tasarımı). Ekrana özel, başka bir yerden
 * okunmayan bir UI durumu -- ADR-003'ün Zustand'ı sunucu verisi/paylaşılan
 * durum için istediği kural burada geçerli değil, düz `useState` yeterli.
 */
type MainTab = "words" | "decks";

function RowGap() {
  return <View style={{ height: spacing.xs }} />;
}

export default function VocabularyScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [mainTab, setMainTab] = useState<MainTab>("words");
  const { data, isLoading, isError, refetch } = useVocabularyQuery();
  const { show: showToast } = useToast();
  const removeWord = useRemoveSavedWordMutation();
  /** Hangi satırın kaldırma isteği sürüyor -- o satır bu sırada pasif. */
  const [removingLemma, setRemovingLemma] = useState<string | null>(null);
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

  /**
   * Kelimeyi defterden çıkarma.
   *
   * DENETİM BULGUSU (2026-09-19): uygulamanın HİÇBİR YERİNDE bir kelimeyi
   * defterden çıkarmanın yolu yoktu -- satırdaki yer imi ikonu tıklanabilir
   * değildi. Ücretsiz katmanda bu bir çıkmazdı: kelime sınırına dayanan
   * kullanıcı paywall şeridini görüyor ama yer açamıyordu.
   *
   * Onay soruluyor çünkü işlem geri alınamaz: `unsave` kelimeyle birlikte
   * SRS kartını ve tekrar geçmişini de siliyor.
   */
  const handleRemoveWord = useCallback(
    (word: VocabularyWord) => {
      Alert.alert(
        t("vocabulary.remove.confirmTitle", { lemma: word.lemma }),
        t("vocabulary.remove.confirmBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("vocabulary.remove.confirmCta"),
            style: "destructive",
            onPress: () => {
              setRemovingLemma(word.lemma);
              removeWord.mutate(
                { lemma: word.lemma, pos: word.pos },
                {
                  onSuccess: () => {
                    trackEvent("vocabulary_word_removed", { lemma: word.lemma });
                    showToast(t("vocabulary.remove.done", { lemma: word.lemma }));
                    void refetch();
                  },
                  onError: () => {
                    showToast(t("vocabulary.remove.error"));
                  },
                  onSettled: () => setRemovingLemma(null),
                },
              );
            },
          },
        ],
      );
    },
    [t, showToast, removeWord, refetch],
  );

  // FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): segmentli seçici
  // her sekmenin yanında sayı gösteriyor ("Favoriler (0)" gibi) -- üç
  // filtrenin kendi sayısını ayrı ayrı hesaplamak için `useFilteredWords`ü
  // tekrar tekrar çağırmak yerine tek geçişte sayıyoruz.
  const filterCounts = useMemo(() => {
    const allWords = data?.words ?? [];
    // "Tekrar bekleyen" sayısı o anki zamana bakar; sabit bir değer
    // anlamsız olurdu (bkz. useFilteredWords.ts'teki aynı gerekçe).
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return {
      all: allWords.length,
      due: allWords.filter((word) => word.dueAt !== null && new Date(word.dueAt).getTime() <= now)
        .length,
      known: allWords.filter((word) => word.state === "known").length,
    };
  }, [data?.words]);

  const segmentOptions: SegmentOption<VocabularyFilter>[] = FILTER_TABS.map((tab) => ({
    value: tab,
    label: t("vocabulary.filters.withCount", {
      label: t(`vocabulary.filters.${tab}`),
      count: filterCounts[tab],
    }),
  }));

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
    ({ item }) => (
      <VocabularyWordRow
        word={item}
        onPress={handlePressWord}
        onRemove={handleRemoveWord}
        removing={removingLemma === item.lemma}
      />
    ),
    [handlePressWord, handleRemoveWord, removingLemma],
  );

  const hasAnySavedWord = (data?.words.length ?? 0) > 0;

  const mainTabOptions: SegmentOption<MainTab>[] = [
    { value: "words", label: t("vocabulary.mainTabs.words") },
    { value: "decks", label: t("vocabulary.mainTabs.decks") },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[type.screenTitle, styles.title, { color: theme.text.primary }]}>
          {t("vocabulary.title")}
        </Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl
          options={mainTabOptions}
          value={mainTab}
          onChange={(value) => {
            trackEvent("vocabulary_main_tab_changed", { tab: value });
            setMainTab(value);
          }}
        />
      </View>

      {mainTab === "decks" ? (
        <DecksTab />
      ) : (
        <>
          <View style={styles.filters}>
            <SegmentedControl
              options={segmentOptions}
              value={filter}
              onChange={handleSelectFilter}
            />
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
              <EmptyState
                title={t("vocabulary.empty.noMatch.title")}
                description={t("vocabulary.empty.noMatch.description")}
              />
            ) : (
              <EmptyState
                title={t("vocabulary.empty.noWords.title")}
                description={t("vocabulary.empty.noWords.description")}
              />
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
        </>
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
  title: {
    textAlign: "center",
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
