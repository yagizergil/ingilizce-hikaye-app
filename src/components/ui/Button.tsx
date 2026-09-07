import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { monoType, motion, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

/**
 * `primary` 2026-09-07 tasarım revizyonunda mürekkep siyahından accent
 * (terracotta) rengine geçti: uygulamadaki her birincil eylem siyah bir
 * bloktu ve ekranlar renksiz kalıyordu. Sessiz bir birincil eylem gerektiğinde
 * (okuma yüzeyine yakın yerler) `neutral` kullanılır.
 */
export type ButtonVariant = "primary" | "neutral" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "md" | "sm";

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

/**
 * book-detail.html `.cta button` — solid ink background, bg-colored
 * (inverse) mono uppercase label, ls .08em, NO border-radius (verified
 * against the mockup file: no `border-radius` appears anywhere in the six
 * mockups this round builds — see layout.ts / this file's judgment-call
 * notes). Padding 15px rounds to `spacing.md` (16) per spacing.ts's own
 * rounding table.
 *
 * IMPORTANT FIX vs. the previous pass: the mockup's CTA fill is
 * `var(--ink)`, not `var(--accent)`. Product principle #1 / the color
 * token file both say `accent` is reserved for status/progress only and
 * is "NEVER decorative" — a solid-accent primary button would violate
 * that. `primary` now fills with `theme.text.primary` (ink) and reads
 * `theme.text.inverse` on top, matching the mockup exactly. `ghost`'s text
 * color was also moved off `accent` for the same reason (no mockup shows a
 * ghost/accent-text button, so this is the safer default until one does).
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  fullWidth = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor = {
    primary: theme.accent,
    neutral: theme.text.primary,
    secondary: theme.bg.surface,
    ghost: "transparent",
    destructive: theme.danger,
  }[variant];

  const borderColor = variant === "secondary" ? theme.border.strong : "transparent";

  const textColor = {
    primary: theme.text.onAccent,
    neutral: theme.text.inverse,
    secondary: theme.text.primary,
    ghost: theme.text.primary,
    destructive: theme.text.onAccent,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "md" ? styles.sizeMd : styles.sizeSm,
        fullWidth && styles.fullWidth,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === "secondary" ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : pressed ? motion.pressed.opacity : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[monoType.buttonLabel, styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    // 2026-09-07: düğmeler keskin dikdörtgendi ve arayüzün sertliğini
    // artırıyordu. Kapaklarla (radius.sm) ve kartlarla (radius.lg) aynı
    // aileden, ortada bir yumuşama.
    borderRadius: radius.md,
  },
  sizeMd: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sizeSm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    textAlign: "center",
  },
});
