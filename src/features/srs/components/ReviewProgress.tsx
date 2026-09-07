import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

interface ReviewProgressProps {
  current: number;
  total: number;
  onClose: () => void;
}

/** Tekrar oturumunun üst şeridi: kaçıncı karttayız ve çıkış. */
export function ReviewProgress({ current, total, onClose }: ReviewProgressProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const ratio = total > 0 ? Math.min(1, (current - 1) / total) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="close" size={24} color={theme.text.secondary} />
        </Pressable>

        <Text style={[monoType.label, { color: theme.text.secondary }]}>
          {current} / {total}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.border.hairline }]}>
        <View
          style={[styles.bar, { backgroundColor: theme.accent, width: `${ratio * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
  },
});
