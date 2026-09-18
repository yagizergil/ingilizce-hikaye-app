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

import { spacing, radius, monoType, type, fontFamily as fontFamilyTokens } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { colors as themeColors } from "@/theme/colors";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";

import type { ThemePreference } from "@/theme/useTheme";
import type { ThemeName } from "@/theme/colors";
import type { ReaderFontFamily } from "@/features/reader/types";

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
 * FAZ 9 (2026-09-18, kullanıcı isteği -- FAZ 8'İN KARARINI TERSİNE
 * ÇEVİRİYOR): kullanıcı artık açıkça "okuma fontu ve tema kartları
 * ayarlanabilir olsun" istedi. FAZ 8'in "yalnızca 2 satır" kararı bir
 * referans-uygulama eşleştirmesiydi, bu ürünün kendi ihtiyacı değil --
 * kullanıcının şimdiki talebi bunun önüne geçiyor. Tema artık tek bir
 * döngü satırı değil, GERÇEK renk önizlemesi taşıyan 4 seçilebilir kart
 * (açık/sepya/koyu/sistem — üçü de zaten `theme/colors.ts`'te tam
 * tanımlıydı, yalnızca bu ekrandan erişilemiyordu). Yazı tipi ailesi
 * (serif/sans) de -- `useReaderSettings.fontFamily` state'i ve
 * `getReadingTypeScale`'in okuduğu değer zaten vardı, hiç UI'ı yoktu --
 * aynı kart deseniyle, her kart kendi fontunda gerçek bir "Aa" örneği
 * gösteriyor. i18n anahtarları (`fontFamilyOptions`, `themeOptions.sepia`/
 * `.system`) FAZ 8'de SİLİNMEMİŞTİ, 10 dilin hepsinde zaten hazır duruyordu.
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
/** Kart önizlemesinde kullanılacak gerçek renkler -- "system" tercihi
 * kendi rengine sahip değil (cihazın anlık temasını takip ediyor), o
 * yüzden `null` dönüp çağıran taraf onun için bir ikon gösteriyor. */
function previewColorsFor(preference: ThemePreference): { bg: string; text: string } | null {
  if (preference === "system") return null;
  const themeName = preference as ThemeName;
  return { bg: themeColors[themeName].bg.primary, text: themeColors[themeName].text.primary };
}

function ReaderSettingsContent() {
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

      <Text style={[monoType.eyebrow, styles.sectionLabel, { color: readerColors.textMuted }]}>
        {t("reader.settings.theme")}
      </Text>
      <View style={styles.cardRow}>
        {themeOptions.map((option) => {
          const preview = previewColorsFor(option);
          const selected = preference === option;
          return (
            <Pressable
              key={option}
              onPress={() => setPreference(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`reader.settings.themeOptions.${option}`)}
              style={[
                styles.themeCard,
                {
                  backgroundColor: preview?.bg ?? readerColors.highlight,
                  borderColor: selected ? readerColors.accent : "transparent",
                },
              ]}
            >
              {preview ? (
                <Text style={[type.wordLemma, { color: preview.text }]}>Aa</Text>
              ) : (
                <Ionicons name="contrast" size={20} color={readerColors.text} />
              )}
              <Text
                style={[
                  monoType.metaTight,
                  styles.themeCardLabel,
                  { color: preview ? preview.text : readerColors.text },
                ]}
              >
                {t(`reader.settings.themeOptions.${option}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[monoType.eyebrow, styles.sectionLabel, { color: readerColors.textMuted }]}>
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
                styles.fontCard,
                {
                  backgroundColor: readerColors.highlight,
                  borderColor: selected ? readerColors.accent : "transparent",
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
                style={[monoType.metaTight, styles.fontCardLabel, { color: readerColors.text }]}
              >
                {t(`reader.settings.fontFamilyOptions.${option}`)}
              </Text>
            </Pressable>
          );
        })}
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
  sectionLabel: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  themeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.cover,
    borderWidth: 2,
  },
  themeCardLabel: {
    textAlign: "center",
  },
  fontCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.cover,
    borderWidth: 2,
  },
  fontCardLabel: {
    textAlign: "center",
  },
});
