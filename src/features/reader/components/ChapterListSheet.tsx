import { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  useBottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  spacing,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useBookDetailQuery } from "@/features/library";

import type { Chapter } from "@/features/library/types";

interface ChapterListSheetProps {
  bookId: string | null;
  currentChapterId: string;
  onSelectChapter: (chapterId: string) => void;
}

/**
 * FAZ 8 DÜZELTMESİ (2026-09-14): önceki versiyon dıştan gelen `ref`'i
 * KULLANMIYORDU -- kendi iç `sheetRef`'ini tutup `useImperativeHandle(ref,
 * () => sheetRef.current, [])` ile "kopyalamaya" çalışıyordu. Boş bağımlılık
 * dizisi bu fabrikayı yalnızca BİR KEZ (mount anında) çalıştırıyor; eğer o
 * anda `sheetRef.current` henüz atanmamışsa (referans ataması ile bu efekt
 * arasındaki sıralamaya bağlı, garantili değil), dıştaki ref SONSUZA KADAR
 * `null` kalıyor ve `.present()` çağrısı sessizce hiçbir şey yapmıyordu --
 * "kitap ikonuna basınca hiçbir şey olmuyor" hatasının kök nedeni buydu.
 *
 * Çözüm: dıştan gelen `ref`'i DOĞRUDAN `BottomSheetModal`'a veriyoruz (ekstra
 * dolaylama yok) ve kapatma düğmesi için kütüphanenin kendi
 * `useBottomSheetModal()` hook'unu kullanıyoruz -- bu, sheet'in KENDİ
 * içeriğinden çağrıldığında ekstra ref taşımadan doğru sheet'i kapatıyor.
 */
export const ChapterListSheet = forwardRef<BottomSheetModal, ChapterListSheetProps>(
  function ChapterListSheet({ bookId, currentChapterId, onSelectChapter }, ref) {
    const { t } = useTranslation();
    const readerColors = useReaderThemeColors();
    const { theme } = useTheme();
    const { data } = useBookDetailQuery(bookId ?? "");
    // FAZ 8: referans ekran görüntülerinde İçerikler/Kitaptan Kelimeler/
    // Ayarlar HEP AYNI yükseklikte açılıyor (içerik kısa olsa bile altında
    // boşluk kalıyor, bkz. Ayarlar ekran görüntüsü) -- üçü de aynı sabit
    // yüksekliğe getirildi.
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
        <ChapterListContent
          chapters={data?.book.chapters ?? []}
          currentChapterId={currentChapterId}
          onSelectChapter={onSelectChapter}
          readerColors={readerColors}
          surfaceColor={theme.bg.surface}
          title={t("reader.chapterList.title")}
          closeLabel={t("common.close")}
        />
      </BottomSheetModal>
    );
  },
);

interface ChapterListContentProps {
  chapters: Chapter[];
  currentChapterId: string;
  onSelectChapter: (chapterId: string) => void;
  readerColors: ReturnType<typeof useReaderThemeColors>;
  surfaceColor: string;
  title: string;
  closeLabel: string;
}

/** Sheet İÇERİĞİ ayrı bir bileşende: `useBottomSheetModal()` yalnızca
 * `BottomSheetModal`'ın çocuk ağacında çağrılabiliyor. */
function ChapterListContent({
  chapters,
  currentChapterId,
  onSelectChapter,
  readerColors,
  surfaceColor,
  title,
  closeLabel,
}: ChapterListContentProps) {
  const { dismiss } = useBottomSheetModal();

  const handleSelect = useCallback(
    (chapterId: string) => {
      onSelectChapter(chapterId);
      dismiss();
    },
    [onSelectChapter, dismiss],
  );

  return (
    <>
      <View style={styles.header}>
        <Text style={[detailType.sheetTitle, styles.headerTitle, { color: readerColors.text }]}>
          {title}
        </Text>
        <Pressable
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={styles.closeButton}
          hitSlop={spacing.sm}
        >
          <Ionicons name="close" size={20} color={detailColors.muted} />
        </Pressable>
      </View>

      <BottomSheetFlatList
        data={chapters}
        keyExtractor={(item: Chapter) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { backgroundColor: surfaceColor }]}
        renderItem={({ item, index }: { item: Chapter; index: number }) => (
          <Pressable
            onPress={() => handleSelect(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: item.id === currentChapterId }}
            style={[
              styles.row,
              index < chapters.length - 1 && {
                borderBottomColor: readerColors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View
              style={[
                styles.rowNumber,
                item.id === currentChapterId ? styles.rowNumberActive : null,
              ]}
            >
              <Text style={[homeType.statLabel, { color: detailColors.amberInk }]}>
                {index + 1}
              </Text>
            </View>
            <Text
              style={[detailType.statLabel, styles.rowText, { color: readerColors.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </Pressable>
        )}
      />
    </>
  );
}

const NUMBER_SIZE = 32;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: homeMetrics.cardRadius,
    borderTopRightRadius: homeMetrics.cardRadius,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingTop: homeSpace.xl,
    paddingBottom: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    backgroundColor: detailColors.circle,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    marginTop: homeSpace.sm,
  },
  listContent: {
    marginHorizontal: homeMetrics.gutter,
    borderRadius: homeMetrics.cardRadius,
    overflow: "hidden",
    paddingHorizontal: homeSpace.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingVertical: homeSpace.md,
  },
  // Bölüm numarası (kullanıcı bulgusu: listede kaçıncı bölüm olduğu yazmıyordu).
  rowNumber: {
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    borderRadius: NUMBER_SIZE / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumberActive: {
    backgroundColor: detailColors.amber,
  },
  rowText: {
    flex: 1,
  },
});
