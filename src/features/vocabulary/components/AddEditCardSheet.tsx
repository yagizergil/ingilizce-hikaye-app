import { forwardRef, useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailType, homeColors, homeMetrics, homeSpace, homeType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui";

import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

const MAX_FIELD_LENGTH = 200;
const MAX_EXAMPLE_LENGTH = 400;

export interface AddEditCardSubmit {
  surface: string;
  meaning: string;
  exampleSentence: string | null;
}

interface AddEditCardSheetProps {
  /** Düzenleme modunda mevcut değerler -- verilmezse "yeni kelime" akışı. */
  initial?: AddEditCardSubmit | null;
  onSubmit: (values: AddEditCardSubmit) => void;
  submitting?: boolean;
}

/**
 * Bir deste kartına kelime/ifade ekleme ya da var olanı düzenleme sheet'i.
 *
 * `BottomSheetModal` + `BottomSheetScrollView` -- düz RN `ScrollView`
 * DEĞİL: `@gorhom/bottom-sheet`in kendi kaydırma bileşenleri sheet'in pan
 * hareketiyle (aşağı çekince kapanma) doğru koordine olacak şekilde
 * yazılmış; düz bir `ScrollView` bu el değiştirmeyi (kaydırma vs.
 * sürükleyip kapatma) bozar (bkz. kütüphanenin kendi dokümantasyonu).
 *
 * `example_sentence` isteğe bağlı -- kullanıcı boş bırakabilir, `WordSheet`
 * bunu boşsa göstermiyor (bkz. o bileşenin `contextText` mantığı).
 */
export const AddEditCardSheet = forwardRef<BottomSheetModal, AddEditCardSheetProps>(
  function AddEditCardSheet({ initial, onSubmit, submitting = false }, ref) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [surface, setSurface] = useState(initial?.surface ?? "");
    const [meaning, setMeaning] = useState(initial?.meaning ?? "");
    const [exampleSentence, setExampleSentence] = useState(initial?.exampleSentence ?? "");
    const insets = useSafeAreaInsets();

    useEffect(() => {
      setSurface(initial?.surface ?? "");
      setMeaning(initial?.meaning ?? "");
      setExampleSentence(initial?.exampleSentence ?? "");
    }, [initial]);

    const trimmedSurface = surface.trim();
    const trimmedMeaning = meaning.trim();
    const canSubmit = trimmedSurface.length > 0 && trimmedMeaning.length > 0 && !submitting;

    const handleSubmit = useCallback(() => {
      if (!canSubmit) return;
      onSubmit({
        surface: trimmedSurface,
        meaning: trimmedMeaning,
        exampleSentence: exampleSentence.trim() || null,
      });
    }, [canSubmit, onSubmit, trimmedSurface, trimmedMeaning, exampleSentence]);

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
        // DENETİM BULGUSU (2026-09-22, kullanıcı bulgusu): bu sheet'te üç
        // metin alanı var ve klavye açılınca girilen alanın ÜSTÜNE
        // geliyordu. Asıl sebep -- ve bu üç prop'un TEK BAŞINA yeterli
        // olmamasının sebebi -- alanların düz RN `TextInput` olmasıydı;
        // bkz. CreateDeckSheet.tsx'teki `BottomSheetTextInput` notu.
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
            {initial ? t("vocabulary.decks.card.editTitle") : t("vocabulary.decks.card.addTitle")}
          </Text>

          <View style={styles.field}>
            <Text style={[homeType.statLabel, { color: theme.text.secondary }]}>
              {t("vocabulary.decks.card.surfaceLabel")}
            </Text>
            <BottomSheetTextInput
              value={surface}
              onChangeText={setSurface}
              placeholder={t("vocabulary.decks.card.surfacePlaceholder")}
              placeholderTextColor={theme.text.secondary}
              maxLength={MAX_FIELD_LENGTH}
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
          </View>

          <View style={styles.field}>
            <Text style={[homeType.statLabel, { color: theme.text.secondary }]}>
              {t("vocabulary.decks.card.meaningLabel")}
            </Text>
            <BottomSheetTextInput
              value={meaning}
              onChangeText={setMeaning}
              placeholder={t("vocabulary.decks.card.meaningPlaceholder")}
              placeholderTextColor={theme.text.secondary}
              maxLength={MAX_FIELD_LENGTH}
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
          </View>

          <View style={styles.field}>
            <Text style={[homeType.statLabel, { color: theme.text.secondary }]}>
              {t("vocabulary.decks.card.exampleLabel")}
            </Text>
            <BottomSheetTextInput
              value={exampleSentence}
              onChangeText={setExampleSentence}
              placeholder={t("vocabulary.decks.card.examplePlaceholder")}
              placeholderTextColor={theme.text.secondary}
              maxLength={MAX_EXAMPLE_LENGTH}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                styles.multiline,
                detailType.statLabel,
                {
                  color: theme.text.primary,
                  borderColor: homeColors.peach,
                  backgroundColor: theme.bg.primary,
                },
              ]}
            />
          </View>

          <Button
            label={initial ? t("common.save") : t("vocabulary.decks.card.addCta")}
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
  field: {
    gap: spacing.xs,
  },
  input: {
    minHeight: homeMetrics.continueButton + homeSpace.lg,
    borderWidth: 2,
    borderRadius: homeSpace.lg,
    paddingHorizontal: homeSpace.lg,
  },
  multiline: {
    minHeight: 88,
    paddingVertical: spacing.sm,
    textAlignVertical: "top",
  },
});
