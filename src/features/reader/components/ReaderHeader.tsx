import { StyleSheet, Text, View, Pressable } from "react-native";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { spacing, monoType } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

interface ReaderHeaderProps {
  title: string;
  onBack: () => void;
  onOpenSettings: () => void;
  /** Sesli okumayı başlatır/duraklatır. */
  onToggleSpeech: () => void;
  /** Şu an konuşuluyor mu — düğmenin ikonu ve etiketi buna göre. */
  isSpeaking: boolean;
}

/** Top chrome: back button, chapter title, settings button — no progress
 * bar (moved to a plain percentage readout in `ReaderFooter`, per product
 * owner request). */
export function ReaderHeader({
  title,
  onBack,
  onOpenSettings,
  onToggleSpeech,
  isSpeaking,
}: ReaderHeaderProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: readerColors.background },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reader.header.back")}
          onPress={onBack}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Text style={[monoType.rowText, { color: readerColors.text }]}>‹</Text>
        </Pressable>

        <Text
          numberOfLines={1}
          style={[monoType.rowText, styles.title, { color: readerColors.text }]}
        >
          {title}
        </Text>

        {/*
          Sesli okuma düğmesi. Okuma yüzeyinin bir KONTROLÜ — ürün ilkesi #1
          reader içinde promosyonu yasaklıyor, okuma araçlarını değil.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSpeaking }}
          accessibilityLabel={t(
            isSpeaking ? "reader.header.pauseSpeech" : "reader.header.playSpeech",
          )}
          onPress={onToggleSpeech}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Ionicons
            name={isSpeaking ? "pause" : "volume-medium-outline"}
            size={20}
            color={readerColors.text}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reader.header.settings")}
          onPress={onOpenSettings}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Text style={[monoType.rowText, styles.iconGlyph, { color: readerColors.text }]}>Aa</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    fontWeight: "600",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
    marginHorizontal: spacing.sm,
  },
});
