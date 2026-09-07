import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { radius, spacing, type, monoType } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { Book } from "@/features/library/types";

interface SourceLicenseSheetProps {
  book: Book;
  visible: boolean;
  onClose: () => void;
}

export function SourceLicenseSheet({ book, visible, onClose }: SourceLicenseSheetProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.bg.primary }]}>
          <Text style={[type.sectionHeading, styles.title, { color: theme.text.primary }]}>
            {t("bookDetail.source.title")}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
            {t("bookDetail.source.name")}: {book.sourceName}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
            {t("bookDetail.source.license")}: {book.license}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]} numberOfLines={1}>
            {book.sourceUrl}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    width: "100%",
  },
  title: {
    marginBottom: spacing.xs,
  },
});
