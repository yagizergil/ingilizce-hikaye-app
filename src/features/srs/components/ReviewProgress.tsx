import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
} from "@/theme";

interface ReviewProgressProps {
  current: number;
  total: number;
  onClose: () => void;
}

/** Tekrar oturumunun üst şeridi: çıkış düğmesi, "n / m" hapı ve ilerleme çubuğu. */
export function ReviewProgress({ current, total, onClose }: ReviewProgressProps) {
  const { t } = useTranslation();
  const ratio = total > 0 ? Math.min(1, (current - 1) / total) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          hitSlop={homeSpace.sm}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={styles.close}
        >
          <Ionicons name="close" size={20} color={detailColors.muted} />
        </Pressable>

        <View style={styles.counter}>
          <Text style={[detailType.statLabel, styles.counterText]}>
            {current} / {total}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.bar, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: homeMetrics.gutter,
    paddingTop: homeSpace.sm,
    gap: homeSpace.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: {
    width: detailMetrics.menuButton,
    height: detailMetrics.menuButton,
    borderRadius: detailMetrics.menuButton / 2,
    backgroundColor: detailColors.circle,
    borderWidth: 1,
    borderColor: detailColors.circleBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    paddingHorizontal: homeSpace.lg,
    height: homeMetrics.continueButton,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    color: detailColors.amberInk,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: homeSpace.sm,
    borderRadius: homeSpace.sm / 2,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: homeSpace.sm / 2,
    backgroundColor: detailColors.amber,
  },
});
