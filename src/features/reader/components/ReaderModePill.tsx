import { Pressable, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailColors, detailMetrics } from "@/theme";

import type { ReaderMode } from "@/features/reader/hooks/useReaderModeStore";

interface ReaderModePillProps {
  mode: ReaderMode;
  onChangeMode: (mode: ReaderMode) => void;
  /** Seslendirme var ama kullanıcı premium değil: dinle yuvarlağı kilitli. */
  locked?: boolean;
  onLockedPress?: () => void;
}

/**
 * Okuma yüzeyinin altında yüzen koyu hap (referans): solda "oku", sağda
 * "dinle" yuvarlağı; etkin olan yeşil dolgulu. Seslendirmesi olan
 * kitaplarda render ediliyor. Premium olmayan kullanıcıda dinle yuvarlağı
 * küçük bir kilit rozetiyle gösterilir ve paywall'a gider (ürün sahibi
 * kararı 2026-10-06; ADR-012'nin "düğme hiç görünmez" kuralını değiştirir).
 */
export function ReaderModePill({
  mode,
  onChangeMode,
  locked = false,
  onLockedPress,
}: ReaderModePillProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.pill}>
      <Pressable
        onPress={() => onChangeMode("read")}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === "read" }}
        accessibilityLabel={t("reader.mode.read")}
        style={[styles.circle, mode === "read" ? styles.circleActive : null]}
      >
        <Ionicons name="document-text-outline" size={22} color={detailColors.circle} />
      </Pressable>
      <Pressable
        onPress={() => (locked ? onLockedPress?.() : onChangeMode("listen"))}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === "listen" }}
        accessibilityLabel={t(locked ? "reader.mode.listenLocked" : "reader.mode.listen")}
        style={[styles.circle, mode === "listen" ? styles.circleActive : null]}
      >
        <Ionicons
          name="ear-outline"
          size={22}
          color={detailColors.circle}
          style={locked ? styles.dimmed : null}
        />
        {locked ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={10} color={detailColors.amberInk} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: detailMetrics.pillHeight,
    paddingHorizontal: detailMetrics.pillPad,
    borderRadius: detailMetrics.pillHeight / 2,
    backgroundColor: detailColors.pillDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: detailMetrics.pillPad,
  },
  circle: {
    width: detailMetrics.pillCircle,
    height: detailMetrics.pillCircle,
    borderRadius: detailMetrics.pillCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dimmed: {
    opacity: 0.55,
  },
  lockBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: detailColors.progressFill,
  },
});
