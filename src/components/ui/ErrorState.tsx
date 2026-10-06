import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { homeType, spacing, mascotSize } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/ui/Button";
import { MascotAnim } from "@/components/ui/MascotAnim";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Hata durumu: etrafına bakınan maskot, başlık, mesaj ve "Tekrar dene" düğmesi. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <MascotAnim name="search" width={mascotSize.empty} />
      <Text style={[homeType.sectionTitle, { color: theme.text.primary }]}>
        {t("common.errorTitle")}
      </Text>
      <Text style={[homeType.cardSub, styles.message, { color: theme.text.secondary }]}>
        {message}
      </Text>
      {onRetry ? <Button label={t("common.retry")} onPress={onRetry} size="sm" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  message: {
    textAlign: "center",
  },
});
