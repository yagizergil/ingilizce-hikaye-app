import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics, detailType, motion, spacing } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { directionalIcon } from "@/lib/rtl";

interface ReaderFooterProps {
  /** 0 tabanlı görünen sayfa ve toplam sayfa. */
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  /** Son sayfada sağdaki ok yerine bölümü bitiren eylem gösterilir. */
  onLastPage?: boolean;
  hasNextChapter?: boolean;
  onFinishChapter?: () => void;
}

/**
 * Okuma ekranının alt şeridi (referans): solda "02 of 24" (sayı kalın),
 * sağda iki küçük ok. Son sayfada sağdaki ok, bölümü bitiren görünür bir
 * eyleme dönüşüyor (eski davranış korunuyor: gizli dokunma tek yol değil).
 *
 * İÇERİK YÜKSEKLİĞİ SABİT (`FOOTER_CONTENT_HEIGHT`): her iki dal da aynı
 * yükseklikte; yoksa son sayfada okuma alanı değişip sayfalama döngüye
 * giriyordu (bkz. CLAUDE.md, 2026-09-19 reader sayfalama turu).
 */
export function ReaderFooter({
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onLastPage = false,
  hasNextChapter = false,
  onFinishChapter,
}: ReaderFooterProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();

  const showAction = onLastPage && onFinishChapter !== undefined;
  const total = Math.max(totalPages, 1);
  const current = String(Math.min(page + 1, total)).padStart(2, "0");

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, backgroundColor: readerColors.background },
      ]}
    >
      <View style={styles.content}>
        <Text style={[detailType.pageCount, { color: detailColors.muted }]}>
          <Text style={[detailType.pageCountBold, { color: detailColors.title }]}>{current}</Text>
          {` ${t("reader.footer.of")} ${total}`}
        </Text>

        <View style={styles.arrows}>
          <Pressable
            onPress={onPrevPage}
            accessibilityRole="button"
            accessibilityLabel={t("reader.footer.prevPage")}
            hitSlop={spacing.md}
            style={({ pressed }) => (pressed ? { opacity: motion.pressed.opacity } : null)}
          >
            <Ionicons
              name={directionalIcon("chevron-back", "chevron-forward")}
              size={20}
              color={detailColors.muted}
            />
          </Pressable>
          {showAction ? (
            <Pressable
              onPress={onFinishChapter}
              accessibilityRole="button"
              accessibilityLabel={
                hasNextChapter ? t("reader.footer.nextChapter") : t("reader.footer.finishBook")
              }
              hitSlop={spacing.md}
            >
              <Text style={[detailType.sheetMore, { color: detailColors.amberDeep }]}>
                {hasNextChapter ? t("reader.footer.nextChapter") : t("reader.footer.finishBook")}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onNextPage}
              accessibilityRole="button"
              accessibilityLabel={t("reader.footer.nextPage")}
              hitSlop={spacing.md}
              style={({ pressed }) => (pressed ? { opacity: motion.pressed.opacity } : null)}
            >
              <Ionicons
                name={directionalIcon("chevron-forward", "chevron-back")}
                size={20}
                color={detailColors.muted}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/** Footer'ın İÇERİK yüksekliği -- SABİT, `minHeight` DEĞİL (bkz. üstteki not). */
const FOOTER_CONTENT_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingHorizontal: detailMetrics.gutter,
  },
  content: {
    height: FOOTER_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
});
