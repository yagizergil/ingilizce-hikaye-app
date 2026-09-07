import { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";

import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { spacing, radius, monoType } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";

import type { ThemePreference } from "@/theme/useTheme";
import type { ReaderFontFamily } from "@/features/reader/types";

const MARGIN_SCALE_STEP = 0.1;

interface OptionRowProps<T extends string> {
  value: T;
  current: T;
  label: string;
  onSelect: (value: T) => void;
  activeColor: string;
  onAccentColor: string;
  borderColor: string;
  textColor: string;
}

function OptionChip<T extends string>({
  value,
  current,
  label,
  onSelect,
  activeColor,
  onAccentColor,
  borderColor,
  textColor,
}: OptionRowProps<T>) {
  const isActive = value === current;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={() => onSelect(value)}
      style={[
        styles.chip,
        { borderColor: isActive ? activeColor : borderColor },
        isActive ? { backgroundColor: activeColor } : undefined,
      ]}
    >
      <Text style={[monoType.rowText, styles.chipText, { color: isActive ? onAccentColor : textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const ReaderSettingsSheet = forwardRef<BottomSheetModal>(
  function ReaderSettingsSheet(_props, ref) {
    const { t } = useTranslation();
    const readerColors = useReaderThemeColors();
    const { theme, preference, setPreference } = useTheme();
    const snapPoints = useMemo(() => ["55%"], []);

    const fontScale = useReaderSettings((state) => state.fontScale);
    const increaseFontScale = useReaderSettings((state) => state.increaseFontScale);
    const decreaseFontScale = useReaderSettings((state) => state.decreaseFontScale);
    const fontFamily = useReaderSettings((state) => state.fontFamily);
    const setFontFamily = useReaderSettings((state) => state.setFontFamily);
    const marginScale = useReaderSettings((state) => state.marginScale);
    const setMarginScale = useReaderSettings((state) => state.setMarginScale);
    const highlightsEnabled = useReaderSettings((state) => state.highlightsEnabled);
    const toggleHighlights = useReaderSettings((state) => state.toggleHighlights);

    const decreaseMarginScale = useCallback(
      () => setMarginScale(Math.round((marginScale - MARGIN_SCALE_STEP) * 100) / 100),
      [marginScale, setMarginScale],
    );
    const increaseMarginScale = useCallback(
      () => setMarginScale(Math.round((marginScale + MARGIN_SCALE_STEP) * 100) / 100),
      [marginScale, setMarginScale],
    );

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

    const fontFamilies: ReaderFontFamily[] = ["serif", "sans"];
    // 2026-09-07: seçenekler dörtten ikiye indi. Kullanıcı geri bildirimi:
    // "kitap ayarları sayfasından sistem renklerini değiştirmeyeyim, ya
    // açık ya koyu olsun". Dört seçenek (açık/sepya/koyu/sistem) okuma
    // ayarları için fazla karardı ve "sistem" seçeneği kullanıcıya
    // uygulamanın rengini kimin belirlediğini belirsizleştiriyordu.
    //
    // `sepia` ve `system` tema TANIMLARI duruyor (useTheme hâlâ ilk
    // açılışta cihaz temasını izliyor); yalnızca bu seçiciden kaldırıldı.
    const themes: ThemePreference[] = ["light", "dark"];

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: readerColors.background }}
        handleIndicatorStyle={{ backgroundColor: readerColors.textMuted }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={[monoType.label, styles.sectionLabel, { color: readerColors.textMuted }]}>
            {t("reader.settings.fontSize")}
          </Text>
          <View style={styles.fontSizeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("reader.settings.decreaseFontSize")}
              onPress={decreaseFontScale}
              style={[styles.stepperButton, { borderColor: readerColors.border }]}
            >
              <Text style={[monoType.rowText, { color: readerColors.text }]}>A-</Text>
            </Pressable>
            <Text style={[monoType.rowText, styles.fontScaleValue, { color: readerColors.text }]}>
              {Math.round(fontScale * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("reader.settings.increaseFontSize")}
              onPress={increaseFontScale}
              style={[styles.stepperButton, { borderColor: readerColors.border }]}
            >
              <Text style={[monoType.rowText, { color: readerColors.text }]}>A+</Text>
            </Pressable>
          </View>

          <Text style={[monoType.label, styles.sectionLabel, { color: readerColors.textMuted }]}>
            {t("reader.settings.fontFamily")}
          </Text>
          <View style={styles.chipRow}>
            {fontFamilies.map((value) => (
              <OptionChip
                key={value}
                value={value}
                current={fontFamily}
                onSelect={setFontFamily}
                label={t(`reader.settings.fontFamilyOptions.${value}`)}
                activeColor={theme.accent}
                onAccentColor={theme.text.onAccent}
                borderColor={readerColors.border}
                textColor={readerColors.text}
              />
            ))}
          </View>

          <Text style={[monoType.label, styles.sectionLabel, { color: readerColors.textMuted }]}>
            {t("reader.settings.theme")}
          </Text>
          <View style={styles.chipRow}>
            {themes.map((value) => (
              <OptionChip
                key={value}
                value={value}
                current={preference}
                onSelect={setPreference}
                label={t(`reader.settings.themeOptions.${value}`)}
                activeColor={theme.accent}
                onAccentColor={theme.text.onAccent}
                borderColor={readerColors.border}
                textColor={readerColors.text}
              />
            ))}
          </View>

          <Text style={[monoType.label, styles.sectionLabel, { color: readerColors.textMuted }]}>
            {t("reader.settings.margin")}
          </Text>
          <View style={styles.fontSizeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("reader.settings.decreaseMargin")}
              onPress={decreaseMarginScale}
              style={[styles.stepperButton, { borderColor: readerColors.border }]}
            >
              <Text style={[monoType.rowText, { color: readerColors.text }]}>-</Text>
            </Pressable>
            <Text style={[monoType.rowText, styles.fontScaleValue, { color: readerColors.text }]}>
              {Math.round(marginScale * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("reader.settings.increaseMargin")}
              onPress={increaseMarginScale}
              style={[styles.stepperButton, { borderColor: readerColors.border }]}
            >
              <Text style={[monoType.rowText, { color: readerColors.text }]}>+</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: highlightsEnabled }}
            onPress={toggleHighlights}
            style={styles.toggleRow}
          >
            <Text style={[monoType.rowText, { color: readerColors.text }]}>
              {t("reader.settings.highlights")}
            </Text>
            <View
              style={[
                styles.toggleTrack,
                { backgroundColor: highlightsEnabled ? theme.accent : readerColors.border },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { backgroundColor: theme.text.onAccent },
                  { transform: [{ translateX: highlightsEnabled ? 18 : 0 }] },
                ]}
              />
            </View>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.sm,
  },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fontScaleValue: {
    minWidth: 48,
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginTop: spacing.md,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: radius.full,
    padding: spacing.xs / 2,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
  },
});
