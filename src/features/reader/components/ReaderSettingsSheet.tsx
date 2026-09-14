import { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";

import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  useBottomSheetModal,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { spacing, radius, monoType, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";

import type { ThemePreference } from "@/theme/useTheme";

/**
 * FAZ 8 (2026-09-14, referans uygulama eşleştirmesi — üçüncü ve son
 * düzeltme): kullanıcı üç kez aynı şeyi söyledi -- referansın "Ayarlar"
 * ekranı YALNIZCA "Tema" ve "Yazı tipi boyutu" gösteriyor, başka hiçbir şey
 * yok. Önceki iki turda diğer ayarları (yazı tipi ailesi, kenar boşluğu,
 * ses, konuşma hızı, vurgular) SİLMEDEN aynı kart desenine taşımıştım --
 * bu "referansa görsel olarak yaklaşmak" ile "referansla birebir aynı
 * olmak" arasındaki farkı gözden kaçırdı. Bu sürüm gerçekten yalnızca 2
 * satır gösteriyor.
 *
 * KALDIRILAN AYARLAR SİLİNMEDİ, GİZLENDİ: `useReaderSettings` store'undaki
 * `fontFamily`/`marginScale`/`speechRate`/`speechVoiceId`/
 * `highlightsEnabled` state'i ve action'ları AYNEN duruyor (reader'ın
 * başka yerleri -- örn. `getReadingTypeScale`, `useChapterAudio` -- hâlâ
 * okuyor). Yalnızca bu sheet'ten erişilebilir bir kontrolleri kalmadı.
 * Geri getirmek istenirse tek gereken bu dosyaya birer `SettingsRow`
 * eklemek -- state zaten hazır.
 */
export const ReaderSettingsSheet = forwardRef<BottomSheetModal>(
  function ReaderSettingsSheet(_props, ref) {
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
        <ReaderSettingsContent />
      </BottomSheetModal>
    );
  },
);

/** Sheet İÇERİĞİ ayrı bir bileşende: `useBottomSheetModal()` yalnızca
 * `BottomSheetModal`'ın çocuk ağacında çağrılabiliyor. */
function ReaderSettingsContent() {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const { preference, setPreference } = useTheme();
  const { dismiss } = useBottomSheetModal();

  const fontScale = useReaderSettings((state) => state.fontScale);
  const increaseFontScale = useReaderSettings((state) => state.increaseFontScale);
  const decreaseFontScale = useReaderSettings((state) => state.decreaseFontScale);

  // Referansta yalnızca açık/koyu var; `sepia`/`system` tanımları
  // `useTheme`'de duruyor (2026-09-07 kararı), yalnızca bu seçiciden
  // kaldırılmışlardı -- burada da aynı iki seçenek.
  const themes: ThemePreference[] = ["light", "dark"];
  const cycleTheme = () => {
    const index = themes.indexOf(preference);
    setPreference(themes[(index + 1) % themes.length]!);
  };

  return (
    <BottomSheetView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={[styles.closeButton, { backgroundColor: readerColors.highlight }]}
          hitSlop={spacing.sm}
        >
          <Ionicons name="close" size={18} color={readerColors.text} />
        </Pressable>
        <Text style={[type.screenTitle, styles.headerTitle, { color: readerColors.text }]}>
          {t("reader.settings.title")}
        </Text>
      </View>

      <View style={[styles.row, { backgroundColor: readerColors.highlight }]}>
        <Text style={[monoType.rowText, styles.rowLabel, { color: readerColors.text }]}>
          {t("reader.settings.theme")}
        </Text>
        <Pressable onPress={cycleTheme} accessibilityRole="button" style={styles.cycleControl}>
          <Text style={[monoType.rowText, { color: readerColors.textMuted }]}>
            {t(`reader.settings.themeOptions.${preference}`)}
          </Text>
          <Ionicons name="chevron-expand" size={16} color={readerColors.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.row, { backgroundColor: readerColors.highlight }]}>
        <Text style={[monoType.rowText, styles.rowLabel, { color: readerColors.text }]}>
          {t("reader.settings.fontSize")}
        </Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reader.settings.decreaseFontSize")}
            onPress={decreaseFontScale}
            style={[styles.stepperButton, { backgroundColor: readerColors.background }]}
          >
            <Ionicons name="remove" size={16} color={readerColors.text} />
          </Pressable>
          <Text style={[monoType.rowText, styles.stepperValue, { color: readerColors.text }]}>
            {Math.round(fontScale * 100)}%
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("reader.settings.increaseFontSize")}
            onPress={increaseFontScale}
            style={[styles.stepperButton, { backgroundColor: readerColors.background }]}
          >
            <Ionicons name="add" size={16} color={readerColors.text} />
          </Pressable>
        </View>
      </View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: radius.cover,
    borderTopRightRadius: radius.cover,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.cover,
    marginBottom: spacing.sm,
  },
  rowLabel: {
    fontWeight: "700",
  },
  cycleControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 44,
    textAlign: "center",
  },
});
