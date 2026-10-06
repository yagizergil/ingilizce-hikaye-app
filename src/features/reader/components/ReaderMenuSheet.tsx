import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics, detailType, spacing } from "@/theme";
import { SlideUpModal } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

interface MenuRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface ReaderMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenChapterList: () => void;
  onOpenSettings: () => void;
  onOpenBookWords: () => void;
  /** Kalan günlük çeviri hakkı; `null` iken (premium / yükleniyor) satır yok. */
  wordQuotaRemaining: number | null;
  onPressQuota: () => void;
}

/**
 * Üç nokta menüsü: eski üst çubuktaki bölüm listesi, ayarlar ve kitap
 * kelimeleri artık burada. Alttan açılan beyaz sayfa; her satır önce
 * menüyü kapatıp sonra eylemi çalıştırıyor (iki modal üst üste kalmasın).
 */
export function ReaderMenuSheet({
  visible,
  onClose,
  onOpenChapterList,
  onOpenSettings,
  onOpenBookWords,
  wordQuotaRemaining,
  onPressQuota,
}: ReaderMenuSheetProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const rows: MenuRow[] = [
    {
      key: "chapters",
      icon: "list-outline",
      label: t("reader.header.chapterList"),
      onPress: onOpenChapterList,
    },
    {
      key: "settings",
      icon: "settings-outline",
      label: t("reader.header.settings"),
      onPress: onOpenSettings,
    },
    {
      key: "words",
      icon: "book-outline",
      label: t("reader.header.bookWords"),
      onPress: onOpenBookWords,
    },
  ];
  if (wordQuotaRemaining !== null) {
    rows.push({
      key: "quota",
      icon: "flash-outline",
      label: t("reader.header.quotaRemaining", { count: wordQuotaRemaining }),
      onPress: onPressQuota,
    });
  }

  return (
    <SlideUpModal
      visible={visible}
      onClose={onClose}
      sheetStyle={[
        styles.sheet,
        { backgroundColor: theme.bg.surface, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.handle} />
      {rows.map((row) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          onPress={() => {
            onClose();
            row.onPress();
          }}
          style={styles.row}
        >
          <Ionicons name={row.icon} size={22} color={detailColors.muted} />
          <Text style={[detailType.sheetTitle, styles.label]}>{row.label}</Text>
        </Pressable>
      ))}
    </SlideUpModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: detailMetrics.sheetRadius,
    borderTopRightRadius: detailMetrics.sheetRadius,
    paddingTop: spacing.sm,
    paddingHorizontal: detailMetrics.gutter,
  },
  handle: {
    alignSelf: "center",
    width: detailMetrics.handleWidth,
    height: detailMetrics.handleHeight,
    borderRadius: detailMetrics.handleHeight / 2,
    backgroundColor: detailColors.chipBorder,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.ml,
    paddingVertical: spacing.ml,
  },
  label: {
    color: detailColors.title,
  },
});
