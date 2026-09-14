import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { onboardingMetrics } from "@/features/onboarding/components/OnboardingScaffold";

/**
 * Onboarding'in alt düğmesi.
 *
 * NEDEN ORTAK `Button` DEĞİL: ortak düğme uygulamanın genel ölçülerini
 * taşıyor; buradaki ölçüler referanstan piksel olarak çıkarıldı ve
 * farklı -- yükseklik 48 pt ve köşe TAM PILL (yarıçap = yükseklik/2,
 * ölçümde +38 px'te hâlâ kavisliydi). Ortak düğmeyi bu tek ekran için
 * esnetmek onu her yerde değiştirme riski taşırdı.
 *
 * Pasif hâl referansta gri bir dolgu (`#8C8C8C`); bizde aynı rolü
 * `bg.surface` + soluk metin oynuyor -- kendi paletimizde gri bir dolgu
 * koyu zeminde "pasif" değil "birincil" gibi okunurdu.
 */
interface OnboardingFooterButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Referansta etiketin sağında bir "›" var. */
  showChevron?: boolean;
}

export function OnboardingFooterButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  showChevron = true,
}: OnboardingFooterButtonProps) {
  const { theme } = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: inactive ? theme.bg.surface : theme.accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text.secondary} />
      ) : (
        <>
          <Text
            style={[
              type.chapterRowTitle,
              { color: inactive ? theme.text.secondary : theme.text.onAccent },
            ]}
          >
            {label}
          </Text>
          {showChevron ? (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={inactive ? theme.text.secondary : theme.text.onAccent}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: onboardingMetrics.footerButtonHeight,
    borderRadius: onboardingMetrics.footerButtonRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
});
