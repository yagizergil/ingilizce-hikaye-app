import { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { spacing, radius, monoType } from "@/theme";
import { Button } from "@/components/ui";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

export interface SentenceSheetSentence {
  text: string;
}

interface SentenceSheetProps {
  sentence: SentenceSheetSentence | null;
  onDismiss: () => void;
}

export const SentenceSheet = forwardRef<BottomSheetModal, SentenceSheetProps>(
  function SentenceSheet({ sentence, onDismiss }, ref) {
    const { t } = useTranslation();
    const readerColors = useReaderThemeColors();
    const [showPremiumNotice, setShowPremiumNotice] = useState(false);
    const snapPoints = useMemo(() => ["45%"], []);

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

    const handleExplainGrammar = useCallback(() => {
      // Sentence translation and grammar explanation are AI-generated
      // (see the `ai_cache`/`ai_usage` tables) and not wired to an edge
      // function yet, so this always shows the notice for now.
      setShowPremiumNotice(true);
    }, []);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        onDismiss={() => {
          setShowPremiumNotice(false);
          onDismiss();
        }}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: readerColors.background }}
        handleIndicatorStyle={{ backgroundColor: readerColors.textMuted }}
      >
        <BottomSheetView style={styles.container}>
          {sentence ? (
            <>
              <Text style={[monoType.rowText, { color: readerColors.text }]}>{sentence.text}</Text>

              <View style={styles.actionButtonWrap}>
                <Button label={t("reader.sentenceSheet.explainGrammar")} onPress={handleExplainGrammar} />
              </View>

              {showPremiumNotice ? (
                <View style={[styles.notice, { borderColor: readerColors.border }]}>
                  <Text style={[monoType.metaTight, { color: readerColors.textMuted }]}>
                    {t("reader.sentenceSheet.premiumNotice")}
                  </Text>
                </View>
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
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  actionButtonWrap: {
    marginTop: spacing.md,
  },
  notice: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
});
