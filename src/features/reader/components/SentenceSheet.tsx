import { forwardRef, useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics, detailType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useSentenceTranslationQuery } from "@/features/reader/api/useSentenceTranslationQuery";

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
    const { theme } = useTheme();
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
        // Kelime kartıyla (WordSheet) aynı kart dili: yuvarlak üst köşeler,
        // yüzey zemini, aynı yazı ölçeği (2026-10-06; eskiden okuma
        // yüzeyinin rengini ve eski mono etiketleri kullanıyordu).
        backgroundStyle={[styles.sheet, { backgroundColor: theme.bg.surface }]}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={containerStyle}>
          {sentence ? (
            <>
              <Text style={[detailType.sheetBody, { color: detailColors.title }]}>
                {sentence.text}
              </Text>

              <Text style={[detailType.sheetMore, { color: detailColors.amberDeep }]}>
                {t("reader.sentenceSheet.translationLabel")}
              </Text>

              {translation.isFetching ? (
                <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                  {t("reader.sentenceTranslation.loading")}
                </Text>
              ) : translation.data?.translation ? (
                <Text style={[detailType.sheetTitle, { color: detailColors.title }]}>
                  {translation.data.translation}
                </Text>
              ) : quotaExhausted ? (
                <Pressable onPress={onQuotaExhausted} accessibilityRole="button">
                  <Text style={[detailType.sheetBody, { color: detailColors.amberDeep }]}>
                    {t("reader.sentenceTranslation.quotaExhausted")}
                  </Text>
                </Pressable>
              ) : translation.isError ? (
                <Pressable onPress={() => void refetch()} accessibilityRole="button">
                  <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
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
  sheet: {
    borderTopLeftRadius: detailMetrics.sheetRadius,
    borderTopRightRadius: detailMetrics.sheetRadius,
  },
  handle: {
    width: detailMetrics.handleWidth,
    height: detailMetrics.handleHeight,
    backgroundColor: detailColors.chipBorder,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
