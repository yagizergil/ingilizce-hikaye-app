import { memo, useCallback } from "react";
import { StyleSheet, Text } from "react-native";

import { spacing, getReadingTypeScale, fontFamily } from "@/theme";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

import type { ReaderParagraph } from "@/features/reader/types";

interface ParagraphTextProps {
  paragraph: ReaderParagraph;
  onLongPress: (paragraph: ReaderParagraph) => void;
}

function ParagraphTextComponent({ paragraph, onLongPress }: ParagraphTextProps) {
  const fontScale = useReaderSettings((state) => state.fontScale);
  const lineHeightScale = useReaderSettings((state) => state.lineHeightScale);
  const readerFontFamily = useReaderSettings((state) => state.fontFamily);
  const colors = useReaderThemeColors();

  const { paragraph: paragraphStyle } = getReadingTypeScale(
    fontScale,
    lineHeightScale,
    readerFontFamily,
  );

  const handleLongPress = useCallback(() => onLongPress(paragraph), [onLongPress, paragraph]);

  return (
    <Text
      suppressHighlighting
      onLongPress={handleLongPress}
      style={[
        styles.paragraph,
        paragraphStyle,
        {
          color: colors.text,
          fontFamily: readerFontFamily === "serif" ? fontFamily.literataRegular : undefined,
        },
      ]}
    >
      {paragraph.text}
    </Text>
  );
}

export const ParagraphText = memo(ParagraphTextComponent);

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: spacing.md,
  },
});
