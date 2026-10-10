import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { fontFamily, onboardingSkyColors, onboardingSkyType, radius, spacing } from "@/theme";
import { MascotAnim } from "@/components/ui";

import type { LaunchFailureKind } from "@/lib/launchFailure";

interface LaunchErrorPanelProps {
  kind: LaunchFailureKind;
  /** Bir yeniden deneme sürüyor: düğme pasif, metin "Bağlanılıyor…". */
  retrying: boolean;
  onRetry: () => void;
}

/**
 * Açılış splash'inin (gökyüzü sahnesi) üstünde, açılış sürdürülemediğinde
 * görünen kart: Lumi, başlık, tek satır açıklama ve "Tekrar dene".
 */
export function LaunchErrorPanel({ kind, retrying, onRetry }: LaunchErrorPanelProps) {
  const { t } = useTranslation();
  const prefix = kind === "offline" ? "launch.offline" : "launch.server";

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      style={styles.wrap}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.card}>
        <MascotAnim name="loading" width={96} />
        <Text style={styles.title} accessibilityRole="header">
          {t(`${prefix}.title`)}
        </Text>
        <Text style={styles.body}>{t(`${prefix}.body`)}</Text>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          style={({ pressed }) => [styles.cta, (pressed || retrying) && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>{t(retrying ? "launch.retrying" : "launch.retry")}</Text>
        </Pressable>
        <Text style={styles.hint}>{t("launch.autoRetry")}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: onboardingSkyColors.bubble,
  },
  title: {
    fontFamily: fontFamily.gabaritoBold,
    ...onboardingSkyType.title,
    color: onboardingSkyColors.title,
    textAlign: "center",
  },
  body: {
    fontFamily: fontFamily.gabaritoRegular,
    ...onboardingSkyType.body,
    color: onboardingSkyColors.body,
    textAlign: "center",
  },
  cta: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: onboardingSkyColors.cta,
  },
  ctaPressed: {
    opacity: 0.85, // basma geri bildirimi
  },
  ctaText: {
    fontFamily: fontFamily.gabaritoBold,
    ...onboardingSkyType.button,
    color: onboardingSkyColors.ctaText,
  },
  hint: {
    fontFamily: fontFamily.gabaritoRegular,
    ...onboardingSkyType.bubble,
    color: onboardingSkyColors.body,
    textAlign: "center",
  },
});
