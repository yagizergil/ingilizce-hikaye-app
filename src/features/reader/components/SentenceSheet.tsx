import { forwardRef, useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { monoType, readingType, spacing } from "@/theme";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { useSentenceTranslationQuery } from "@/features/reader/api/useSentenceTranslationQuery";
import { UpperText } from "@/components/ui/UpperText";

export interface SentenceSheetSentence {
  text: string;
}

interface SentenceSheetProps {
  sentence: SentenceSheetSentence | null;
  onDismiss: () => void;
  onQuotaExhausted: () => void;
}

/**
 * Cümleye uzun basınca açılan kart: cümle + çevirisi.
 *
 * Eskiden burada "yakında gelecek" diyen bir taslak düğme vardı; çeviri ise
 * yalnızca kelime kartında bağlıydı. Kart artık açılır açılmaz aynı kotalı
 * `translate-sentence` çağrısını yapıyor.
 *
 * Yükseklik içeriğe göre (`enableDynamicSizing`) ve alt güvenli alan kadar
 * yukarıda duruyor -- sabit %45'lik yükseklik kısa bir cümlede kartı
 * ekranın en dibine yapıştırıyordu.
 */
export const SentenceSheet = forwardRef<BottomSheetModal, SentenceSheetProps>(
  function SentenceSheet({ sentence, onDismiss, onQuotaExhausted }, ref) {
    const { t } = useTranslation();
    const readerColors = useReaderThemeColors();
    const insets = useSafeAreaInsets();
    const translation = useSentenceTranslationQuery(sentence?.text ?? null);
    const { isFetched, refetch } = translation;

    useEffect(() => {
      if (sentence && !isFetched) void refetch();
    }, [sentence, isFetched, refetch]);

    const errorReason = translation.error instanceof Error ? translation.error.message : null;
    const quotaExhausted =
      errorReason === "free_tier_daily_limit" || errorReason === "rate_limited";

    const containerStyle = useMemo(
      () => [styles.container, { paddingBottom: insets.bottom + spacing.xl }],
      [insets.bottom],
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

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        onDismiss={onDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: readerColors.background }}
        handleIndicatorStyle={{ backgroundColor: readerColors.textMuted }}
      >
        <BottomSheetView style={containerStyle}>
          {sentence ? (
            <>
              <Text style={[readingType.gloss, { color: readerColors.text }]}>{sentence.text}</Text>

              <UpperText style={[monoType.label, { color: readerColors.textMuted }]}>
                {t("reader.sentenceSheet.translationLabel")}
              </UpperText>

              {translation.isFetching ? (
                <Text style={[readingType.gloss, { color: readerColors.textMuted }]}>
                  {t("reader.sentenceTranslation.loading")}
                </Text>
              ) : translation.data?.translation ? (
                <Text style={[readingType.gloss, { color: readerColors.text }]}>
                  {translation.data.translation}
                </Text>
              ) : quotaExhausted ? (
                <Pressable onPress={onQuotaExhausted} accessibilityRole="button">
                  <Text style={[readingType.gloss, { color: readerColors.accent }]}>
                    {t("reader.sentenceTranslation.quotaExhausted")}
                  </Text>
                </Pressable>
              ) : translation.isError ? (
                <Pressable onPress={() => void refetch()} accessibilityRole="button">
                  <Text style={[readingType.gloss, { color: readerColors.textMuted }]}>
                    {t("reader.sentenceTranslation.failed")}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
