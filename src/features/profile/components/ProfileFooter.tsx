import { StyleSheet, Text } from "react-native";

import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

/**
 * profile.html `.footer-note` — small mono app name + version string.
 * Sourced from `app.config.ts` (name/version) via `expo-constants` at
 * runtime rather than hardcoded, so it never drifts from the real build.
 */
export function ProfileFooter() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const name = Constants.expoConfig?.name ?? Constants.expoConfig?.slug ?? "";
  const version = Constants.expoConfig?.version ?? "";

  return (
    <Text style={[monoType.footerNote, styles.text, { color: theme.text.secondary }]}>
      {t("profile.footer", { name, version })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.screenBottom,
  },
});
