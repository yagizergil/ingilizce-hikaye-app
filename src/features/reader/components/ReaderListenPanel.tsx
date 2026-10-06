import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { detailColors, detailMetrics, detailType, motion, spacing } from "@/theme";

interface ReaderListenPanelProps {
  isSpeaking: boolean;
  isPreparing: boolean;
  positionSec: number;
  durationSec: number;
  page: number;
  totalPages: number;
  onToggle: () => void;
  onSeekBy: (deltaSec: number) => void;
  /** Sağdaki "tam ekran" ikonu: dinleme modundan okumaya döner. */
  onExpand: () => void;
}

const SEEK_SECONDS = 10;

function formatClock(totalSec: number): string {
  const safe = Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Dinleme modunun alt paneli (referans): ilerleme çubuğu ve süreler,
 * altında "02 of 24", 10 sn geri, büyük amber oynat/duraklat, 10 sn ileri
 * ve tam ekran ikonu. Ses konumu gerçek oynatıcıdan geliyor.
 */
export function ReaderListenPanel({
  isSpeaking,
  isPreparing,
  positionSec,
  durationSec,
  page,
  totalPages,
  onToggle,
  onSeekBy,
  onExpand,
}: ReaderListenPanelProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fraction = durationSec > 0 ? Math.min(positionSec / durationSec, 1) : 0;
  const total = Math.max(totalPages, 1);
  const current = String(Math.min(page + 1, total)).padStart(2, "0");

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
        <View style={[styles.knob, { left: `${fraction * 100}%` }]} />
      </View>
      <View style={styles.times}>
        <Text style={[detailType.time, { color: detailColors.muted }]}>
          {formatClock(positionSec)}
        </Text>
        <Text style={[detailType.time, { color: detailColors.muted }]}>
          {formatClock(durationSec)}
        </Text>
      </View>

      <View style={styles.controls}>
        <Text style={[detailType.pageCount, { color: detailColors.muted }]}>
          <Text style={[detailType.pageCountBold, { color: detailColors.title }]}>{current}</Text>
          {` ${t("reader.footer.of")} ${total}`}
        </Text>

        <Pressable
          onPress={() => onSeekBy(-SEEK_SECONDS)}
          accessibilityRole="button"
          accessibilityLabel={t("reader.listen.back10")}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.side,
            pressed ? { opacity: motion.pressed.opacity } : null,
          ]}
        >
          <MaterialCommunityIcons name="rewind-10" size={28} color={detailColors.muted} />
        </Pressable>

        <Pressable
          onPress={onToggle}
          disabled={isPreparing}
          accessibilityRole="button"
          accessibilityState={{ busy: isPreparing }}
          accessibilityLabel={t(isSpeaking ? "reader.audioBar.pause" : "reader.audioBar.play")}
          style={({ pressed }) => [styles.play, pressed ? { opacity: 0.85 } : null]}
        >
          {isPreparing ? (
            <ActivityIndicator color={detailColors.amberInk} />
          ) : (
            <Ionicons
              name={isSpeaking ? "pause" : "play"}
              size={26}
              color={detailColors.amberInk}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => onSeekBy(SEEK_SECONDS)}
          accessibilityRole="button"
          accessibilityLabel={t("reader.listen.forward10")}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.side,
            pressed ? { opacity: motion.pressed.opacity } : null,
          ]}
        >
          <MaterialCommunityIcons name="fast-forward-10" size={28} color={detailColors.muted} />
        </Pressable>

        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          accessibilityLabel={t("reader.mode.read")}
          hitSlop={spacing.sm}
          style={styles.side}
        >
          <Ionicons name="scan-outline" size={24} color={detailColors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: detailColors.circle,
    paddingTop: spacing.ml,
    paddingHorizontal: detailMetrics.gutter,
  },
  track: {
    height: detailMetrics.progressHeight,
    borderRadius: detailMetrics.progressHeight / 2,
    backgroundColor: detailColors.progressTrack,
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: detailMetrics.progressHeight,
    borderRadius: detailMetrics.progressHeight / 2,
    backgroundColor: detailColors.progressFill,
  },
  knob: {
    position: "absolute",
    width: detailMetrics.progressKnob,
    height: detailMetrics.progressKnob,
    marginLeft: -detailMetrics.progressKnob / 2,
    borderRadius: detailMetrics.progressKnob / 2,
    backgroundColor: detailColors.progressFill,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  controls: {
    height: detailMetrics.listenPlay + spacing.ml,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  side: {
    width: detailMetrics.listenSide,
    height: detailMetrics.listenSide,
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: detailMetrics.listenPlay,
    height: detailMetrics.listenPlay,
    borderRadius: detailMetrics.listenPlay / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
});
