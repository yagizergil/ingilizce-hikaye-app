import { forwardRef, useMemo } from "react";
import { StyleSheet } from "react-native";

import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

import { radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

/** Thin, token-aware wrapper around @gorhom/bottom-sheet so callers never
 * hand-roll backdrop/handle/background styling. */
export const BottomSheet = forwardRef<BottomSheetMethods, BottomSheetProps>(function BottomSheet(
  { children, snapPoints, onDismiss },
  ref,
) {
  const { theme } = useTheme();
  const points = useMemo(() => snapPoints ?? ["50%"], [snapPoints]);

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={points}
      enablePanDownToClose
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: theme.bg.surface, borderRadius: radius.lg }}
      handleIndicatorStyle={{ backgroundColor: theme.border.strong }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
      )}
    >
      <BottomSheetView style={styles.content}>{children}</BottomSheetView>
    </GorhomBottomSheet>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
});
