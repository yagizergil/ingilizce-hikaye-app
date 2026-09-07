import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { spacing, monoType } from "@/theme";
import { useTheme } from "@/theme/useTheme";

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t("notFound.title") }} />
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <Text style={[monoType.rowText, { color: theme.text.primary }]}>{t("notFound.message")}</Text>
        <Link href="/">
          <Text style={[monoType.rowText, { color: theme.accent }]}>{t("notFound.goHome")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
});
