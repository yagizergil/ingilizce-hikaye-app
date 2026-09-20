import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { DECK_COLOR_OPTIONS, monoType, radius, spacing, type } from "@/theme";
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
    const snapPoints = useMemo(() => ["55%"], []);

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
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.bg.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.border.strong }}
      >
        <BottomSheetView style={styles.content}>
          <Text style={[type.sectionHeading, { color: theme.text.primary }]}>
            {initial ? t("vocabulary.decks.editTitle") : t("vocabulary.decks.createTitle")}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("vocabulary.decks.namePlaceholder")}
            placeholderTextColor={theme.text.secondary}
            maxLength={MAX_NAME_LENGTH}
            style={[
              styles.input,
              type.chapterRowTitle,
              {
                color: theme.text.primary,
                borderColor: theme.border.hairline,
                backgroundColor: theme.bg.primary,
              },
            ]}
          />

          <Text style={[monoType.label, { color: theme.text.secondary }]}>
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
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
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
