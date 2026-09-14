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

import { radius, spacing, monoType, type } from "@/theme";
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
        <Pressable
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={[styles.closeButton, { backgroundColor: readerColors.highlight }]}
          hitSlop={spacing.sm}
        >
          <Ionicons name="close" size={18} color={readerColors.text} />
        </Pressable>
        <Text style={[type.screenTitle, styles.headerTitle, { color: readerColors.text }]}>
          {title}
        </Text>
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
            <Text
              style={[
                monoType.rowText,
                styles.rowText,
                { color: item.id === currentChapterId ? readerColors.accent : readerColors.text },
              ]}
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

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: radius.cover,
    borderTopRightRadius: radius.cover,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    left: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    marginTop: spacing.sm,
  },
  listContent: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.cover,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingVertical: spacing.md,
  },
  rowText: {
    fontWeight: "600",
  },
});
