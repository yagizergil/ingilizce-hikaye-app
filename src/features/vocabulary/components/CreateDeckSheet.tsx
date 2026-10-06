import { forwardRef, useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DECK_COLOR_OPTIONS,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  radius,
  spacing,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";

import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

const MAX_NAME_LENGTH = 40;

export interface CreateDeckSheetSubmit {
  name: string;
  colorKey: string;
}

interface CreateDeckSheetProps {
  /** Düzenleme modunda mevcut değerler -- verilmezse "yeni deste" akışı. */
  initial?: { name: string; colorKey: string } | null;
  onSubmit: (values: CreateDeckSheetSubmit) => void;
  submitting?: boolean;
}

/**
 * Yeni deste oluşturma / var olan desteyi yeniden adlandırma sheet'i.
 *
 * `BottomSheetModal` (`@gorhom/bottom-sheet`) doğrudan kullanılıyor --
 * uygulamadaki HER sheet (`ChapterListSheet`, `SentenceSheet`,
 * `ReaderSettingsSheet`, `BookWordsSheet`) aynı deseni izliyor. Kod
 * incelemesinde `src/components/ui/BottomSheet` sarmalayıcısının
 * (düz `BottomSheet`, `.expand()`/`.close()` API'si) uygulamada HİÇBİR
 * YERDE kullanılmadığı görüldü -- test edilmemiş bir yolu yeni ve kritik
 * bir forma bağlamak yerine kanıtlanmış deseni izliyoruz.
 *
 * Uygulamada bu, kullanıcının serbest metin yazdığı İLK ekran (bugüne
 * kadar her form seçime dayalıydı) -- bu yüzden girdi stilini burada
 * sıfırdan, tema token'larına sadık kalarak tanımlıyoruz (bkz. `styles`).
 */
export const CreateDeckSheet = forwardRef<BottomSheetModal, CreateDeckSheetProps>(
  function CreateDeckSheet({ initial, onSubmit, submitting = false }, ref) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [name, setName] = useState(initial?.name ?? "");
    const [colorKey, setColorKey] = useState(initial?.colorKey ?? DECK_COLOR_OPTIONS[0]!.key);
    const insets = useSafeAreaInsets();

    // Sheet her açıldığında (düzenlenen deste değiştiğinde) alanları o
    // destenin değerleriyle sıfırlıyor -- aksi halde bir önceki açılıştan
    // kalan taslak görünürdü.
    useEffect(() => {
      setName(initial?.name ?? "");
      setColorKey(initial?.colorKey ?? DECK_COLOR_OPTIONS[0]!.key);
    }, [initial]);

    const trimmedName = name.trim();
    const canSubmit = trimmedName.length > 0 && !submitting;

    const handleSubmit = useCallback(() => {
      if (!canSubmit) return;
      onSubmit({ name: trimmedName, colorKey });
    }, [canSubmit, onSubmit, trimmedName, colorKey]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
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
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.bg.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.border.strong }}
        // DENETİM BULGUSU (2026-09-22, kullanıcı bulgusu): bu sheet
        // uygulamadaki İLK metin girişi formuydu ve klavye açılınca
        // girdinin ÜSTÜNE geliyordu -- kullanıcı yazdığını görmüyordu.
        // İLK "düzeltme" (bu üç prop) TEK BAŞINA işe yaramadı: gerçek
        // sebep aşağıdaki `TextInput`ın düz RN bileşeni olmasıydı --
        // `@gorhom/bottom-sheet`in klavye takibi yalnızca KENDİ
        // `BottomSheetTextInput`ının focus/blur olaylarını dinliyor, düz
        // `TextInput`ın odaklandığını hiç görmüyordu. Asıl düzeltme
        // aşağıda; bu üç prop olmadan da `BottomSheetTextInput` tek
        // başına yeterli ama ikisi birlikte kütüphanenin belgelediği tam
        // desen.
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[detailType.sheetTitle, { color: theme.text.primary }]}>
            {initial ? t("vocabulary.decks.editTitle") : t("vocabulary.decks.createTitle")}
          </Text>

          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder={t("vocabulary.decks.namePlaceholder")}
            placeholderTextColor={theme.text.secondary}
            maxLength={MAX_NAME_LENGTH}
            style={[
              styles.input,
              detailType.statLabel,
              {
                color: theme.text.primary,
                borderColor: homeColors.peach,
                backgroundColor: theme.bg.primary,
              },
            ]}
          />

          <Text style={[homeType.statLabel, { color: theme.text.secondary }]}>
            {t("vocabulary.decks.colorLabel")}
          </Text>
          <View style={styles.colorRow}>
            {DECK_COLOR_OPTIONS.map((option) => {
              const selected = option.key === colorKey;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setColorKey(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`vocabulary.decks.colorNames.${option.key}`)}
                  style={[
                    styles.swatch,
                    { backgroundColor: option.hex },
                    selected ? { borderColor: theme.text.primary } : { borderColor: "transparent" },
                  ]}
                />
              );
            })}
          </View>

          <Button
            label={initial ? t("common.save") : t("vocabulary.decks.createCta")}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            fullWidth
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: homeSpace.md,
    paddingHorizontal: homeMetrics.gutter,
    paddingTop: homeSpace.lg,
  },
  input: {
    minHeight: homeMetrics.continueButton + homeSpace.lg,
    borderWidth: 2,
    borderRadius: homeSpace.lg,
    paddingHorizontal: homeSpace.lg,
  },
  colorRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 2,
  },
});
