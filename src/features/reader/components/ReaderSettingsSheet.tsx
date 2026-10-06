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

import {
  detailColors,
  detailMetrics,
  detailType,
  fontFamily as fontFamilyTokens,
  getReadingTypeScale,
  homeMetrics,
  homeSpace,
  homeType,
  type,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { colors as themeColors } from "@/theme/colors";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { UiIcon } from "@/components/ui/UiIcon";

import type { ThemePreference } from "@/theme/useTheme";
import type { ThemeName } from "@/theme/colors";
import type { ReaderFontFamily } from "@/features/reader/types";

/**
 * Okuma ayarları sheet'i (tema, yazı tipi, yazı boyutu). Hem okuma
 * ekranından hem Profil > Okuma satırlarından açılıyor; tek bileşen, ikinci
 * bir kopya yok.
 *
 * 2026-10-05 yeniden tasarım: uygulamanın yeni dili (yuvarlak kartlar,
 * amber seçim, Higgsfield ikonu) ve CANLI ÖNİZLEME kartı -- seçilen tema,
 * yazı tipi ve boyut hemen üstteki örnek metinde görünüyor, ayar körlemesine
 * yapılmıyor. Tema kartları gerçek renk önizlemesi taşıyor ("system" kendi
 * rengi olmadığı için ikon gösteriyor).
 */
interface ReaderSettingsSheetProps {
  /**
   * Tema seçimi gösterilsin mi. Profilden açılınca GİZLİ (2026-10-05, ürün
   * kararı): tema yalnızca okuma yüzeyini boyuyor, bu yüzden okuyucunun
   * içinden değiştiriliyor; profilde yalnızca yazı tipi ve boyutu var.
   */
  showTheme?: boolean;
}

export const ReaderSettingsSheet = forwardRef<BottomSheetModal, ReaderSettingsSheetProps>(
  function ReaderSettingsSheet({ showTheme = true }, ref) {
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
        <ReaderSettingsContent showTheme={showTheme} />
      </BottomSheetModal>
    );
  },
);

/** Kart önizlemesinde kullanılacak gerçek renkler; "system" için null. */
function previewColorsFor(preference: ThemePreference): { bg: string; text: string } | null {
  if (preference === "system") return null;
  const themeName = preference as ThemeName;
  return { bg: themeColors[themeName].bg.primary, text: themeColors[themeName].text.primary };
}

/** Sheet İÇERİĞİ ayrı bileşende: `useBottomSheetModal()` yalnızca
 * `BottomSheetModal`'ın çocuk ağacında çağrılabiliyor. */
function ReaderSettingsContent({ showTheme }: { showTheme: boolean }) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const { preference, setPreference } = useTheme();
  const { dismiss } = useBottomSheetModal();

  const fontScale = useReaderSettings((state) => state.fontScale);
  const increaseFontScale = useReaderSettings((state) => state.increaseFontScale);
  const decreaseFontScale = useReaderSettings((state) => state.decreaseFontScale);
  const fontFamily = useReaderSettings((state) => state.fontFamily);
  const setFontFamily = useReaderSettings((state) => state.setFontFamily);

  const themeOptions: ThemePreference[] = ["light", "sepia", "dark", "system"];
  const fontFamilyOptions: ReaderFontFamily[] = ["serif", "sans"];
  const preview = getReadingTypeScale(fontScale, undefined, fontFamily).paragraph;

  return (
    <BottomSheetView style={styles.container}>
      <View style={styles.header}>
        <UiIcon name="textsize" size={homeMetrics.rowIcon} />
        <Text style={[detailType.sheetTitle, styles.headerTitle, { color: readerColors.text }]}>
          {t("reader.settings.title")}
        </Text>
        <Pressable
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={styles.closeButton}
          hitSlop={homeSpace.sm}
        >
          <Ionicons name="close" size={20} color={detailColors.muted} />
        </Pressable>
      </View>

      <View style={[styles.previewCard, { backgroundColor: readerColors.highlight }]}>
        <Text style={[preview, { color: readerColors.text }]}>
          {t("reader.settings.previewText")}
        </Text>
      </View>

      {showTheme ? (
        <>
          <Text style={[homeType.sectionTitle, styles.sectionLabel, { color: readerColors.text }]}>
            {t("reader.settings.theme")}
          </Text>
          <View style={styles.cardRow}>
            {themeOptions.map((option) => {
              const colorsPreview = previewColorsFor(option);
              const selected = preference === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setPreference(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`reader.settings.themeOptions.${option}`)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colorsPreview?.bg ?? readerColors.highlight,
                      borderColor: selected ? detailColors.amber : readerColors.highlight,
                    },
                  ]}
                >
                  {colorsPreview ? (
                    <Text style={[type.wordLemma, { color: colorsPreview.text }]}>Aa</Text>
                  ) : (
                    <Ionicons name="contrast" size={20} color={readerColors.text} />
                  )}
                  <Text
                    style={[
                      homeType.statLabel,
                      styles.optionLabel,
                      { color: colorsPreview ? colorsPreview.text : readerColors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {t(`reader.settings.themeOptions.${option}`)}
                  </Text>
                  {selected ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={12} color={detailColors.amberInk} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={[homeType.sectionTitle, styles.sectionLabel, { color: readerColors.text }]}>
        {t("reader.settings.fontFamily")}
      </Text>
      <View style={styles.cardRow}>
        {fontFamilyOptions.map((option) => {
          const selected = fontFamily === option;
          return (
            <Pressable
              key={option}
              onPress={() => setFontFamily(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`reader.settings.fontFamilyOptions.${option}`)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: readerColors.highlight,
                  borderColor: selected ? detailColors.amber : readerColors.highlight,
                },
              ]}
            >
              <Text
                style={[
                  type.wordLemma,
                  {
                    color: readerColors.text,
                    fontFamily: option === "serif" ? fontFamilyTokens.literataRegular : undefined,
                  },
                ]}
              >
                Aa
              </Text>
              <Text
                style={[homeType.statLabel, styles.optionLabel, { color: readerColors.text }]}
                numberOfLines={1}
              >
                {t(`reader.settings.fontFamilyOptions.${option}`)}
              </Text>
              {selected ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={12} color={detailColors.amberInk} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.sizeRow, { backgroundColor: readerColors.highlight }]}>
        <Text style={[detailType.statLabel, styles.sizeLabel, { color: readerColors.text }]}>
          {t("reader.settings.fontSize")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reader.settings.decreaseFontSize")}
          onPress={decreaseFontScale}
          style={styles.stepperButton}
        >
          <Ionicons name="remove" size={20} color={detailColors.amberInk} />
        </Pressable>
        <Text style={[detailType.statLabel, styles.stepperValue, { color: readerColors.text }]}>
          {Math.round(fontScale * 100)}%
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reader.settings.increaseFontSize")}
          onPress={increaseFontScale}
          style={styles.stepperButton}
        >
          <Ionicons name="add" size={20} color={detailColors.amberInk} />
        </Pressable>
      </View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: homeMetrics.cardRadius,
    borderTopRightRadius: homeMetrics.cardRadius,
  },
  container: {
    flex: 1,
    paddingHorizontal: homeMetrics.gutter,
    paddingBottom: homeSpace.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingTop: homeSpace.xl,
    paddingBottom: homeSpace.lg,
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
  previewCard: {
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    marginBottom: homeSpace.lg,
  },
  sectionLabel: {
    marginBottom: homeSpace.sm,
  },
  cardRow: {
    flexDirection: "row",
    gap: homeSpace.sm,
    marginBottom: homeSpace.lg,
  },
  optionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: homeSpace.xs,
    paddingVertical: homeSpace.md,
    borderRadius: homeMetrics.cardRadius,
    borderWidth: 2,
  },
  optionLabel: {
    textAlign: "center",
  },
  check: {
    position: "absolute",
    top: homeSpace.xs,
    right: homeSpace.xs,
    width: homeSpace.lg,
    height: homeSpace.lg,
    borderRadius: homeSpace.lg / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
  },
  sizeLabel: {
    flex: 1,
  },
  stepperButton: {
    width: homeMetrics.rowIcon,
    height: homeMetrics.rowIcon,
    borderRadius: homeMetrics.rowIcon / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: homeMetrics.rowIcon + homeSpace.sm,
    textAlign: "center",
  },
});
