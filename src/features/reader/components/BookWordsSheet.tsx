import { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheetModal, BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { radius, spacing, type } from "@/theme";
import { SegmentedControl, type SegmentOption } from "@/components/ui";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useBookSavedWordsQuery } from "@/features/reader/api/useBookSavedWordsQuery";
import { VocabularyWordRow } from "@/features/vocabulary";

import type { VocabularyWord } from "@/features/vocabulary";

type BookWordsTab = "favorites" | "history";

interface BookWordsSheetProps {
  bookId: string | null;
}

/**
 * FAZ 8 DÜZELTMESİ (2026-09-14): bkz. `ChapterListSheet.tsx`'in doc yorumu
 * -- aynı kırık iç-ref/`useImperativeHandle` deseni buradaydı ve "kitap
 * ikonuna basınca hiçbir şey olmuyor" hatasının kaynağıydı. Dıştan gelen
 * `ref` artık doğrudan `BottomSheetModal`'a veriliyor.
 */
export const BookWordsSheet = forwardRef<BottomSheetModal, BookWordsSheetProps>(
  function BookWordsSheet({ bookId }, ref) {
    const readerColors = useReaderThemeColors();
    const snapPoints = useMemo(() => ["88%"], []);

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: readerColors.background }]}
        handleComponent={null}
      >
        <BookWordsContent bookId={bookId} />
      </BottomSheetModal>
    );
  },
);

function BookWordsContent({ bookId }: { bookId: string | null }) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const { data } = useBookSavedWordsQuery(bookId);

  const [tab, setTab] = useState<BookWordsTab>("favorites");
  const favorites = data?.favorites ?? [];
  const history = data?.history ?? [];
  const words = tab === "favorites" ? favorites : history;

  const segmentOptions: SegmentOption<BookWordsTab>[] = [
    {
      value: "favorites",
      label: t("vocabulary.filters.withCount", {
        label: t("reader.bookWords.favorites"),
        count: favorites.length,
      }),
    },
    {
      value: "history",
      label: t("vocabulary.filters.withCount", {
        label: t("reader.bookWords.history"),
        count: history.length,
      }),
    },
  ];

  const handlePressWord = useCallback(() => {}, []);

  return (
    <>
      {/*
        FAZ 9 (2026-09-14): X kapatma düğmesi kaldırıldı -- kullanıcı geri
        bildirimi: "kötü duruyor, aşağıya çekilerek kapatılabilir". Sheet
        zaten sürükleyerek kapatılabiliyor (varsayılan `BottomSheetModal`
        davranışı) ve arka plana dokunmak da kapatıyor (`pressBehavior=
        "close"`) -- ayrı bir X gerekmiyor. Diğer iki sheet'te (İçerikler,
        Ayarlar) X duruyor, bu değişiklik yalnızca bu ekrana özel.
      */}
      <View style={styles.header}>
        <Text style={[type.screenTitle, styles.headerTitle, { color: readerColors.text }]}>
          {t("reader.bookWords.title")}
        </Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl options={segmentOptions} value={tab} onChange={setTab} />
      </View>

      {words.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[type.bookTitleMd, styles.emptyText, { color: readerColors.textMuted }]}>
            {t(
              tab === "favorites"
                ? "reader.bookWords.emptyFavorites"
                : "reader.bookWords.emptyHistory",
            )}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={words}
          keyExtractor={(item: VocabularyWord) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: VocabularyWord }) => (
            <VocabularyWordRow word={item} onPress={handlePressWord} />
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: radius.cover,
    borderTopRightRadius: radius.cover,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    textAlign: "center",
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  emptyText: {
    textAlign: "center",
  },
});
