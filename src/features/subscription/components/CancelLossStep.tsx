import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailType, homeSpace } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useHomePalette } from "@/features/home";

import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";

import type { LossItem } from "@/features/subscription/cancelFlow";

interface CancelLossStepProps {
  items: LossItem[];
}

/** İptal akışı 1. adım: premium bitince GERÇEKTEN değişenler. */
export function CancelLossStep({ items }: CancelLossStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = useHomePalette();
  return (
    <LifecycleCard>
      <Text style={[detailType.sectionTitle, { color: palette.ink }]}>
        {t("subscription.cancel.lossTitle")}
      </Text>
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <Ionicons name="remove-circle-outline" size={18} color={theme.danger} />
          <Text style={[detailType.statLabel, styles.text, { color: palette.ink }]}>
            {t(`subscription.cancel.loss.${item.key}`, item.params)}
          </Text>
        </View>
      ))}
    </LifecycleCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  text: {
    flex: 1,
  },
});
