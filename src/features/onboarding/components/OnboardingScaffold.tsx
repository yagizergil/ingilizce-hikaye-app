import { StyleSheet, Text, View } from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fontFamily,
  mascotSize,
  onboardingSkyColors,
  onboardingSkyType,
  spacing,
  type,
} from "@/theme";
import { MascotAnim } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

import type { ReactNode } from "react";

/**
 * Onboarding adımlarının ortak iskeleti: üst ilerleme çubuğu, ortalanmış
 * başlık + alt başlık, kaydırılabilir içerik ve ekrana sabit alt düğme.
 *
 * ÖLÇÜLER REFERANSTAN PİKSEL OLARAK ÖLÇÜLDÜ, göz kararı değil --
 * `scripts/measure-reference.py` ile, kaynak `docs/reference/bookvo-*.jpeg`.
 * Tam tablo: docs/plans/2026-09-14-onboarding-tasarim.md.
 *
 * Renk ve fontlar BİZİM: referans açık tema + mor vurgu kullanıyor, biz
 * koyu temamızı ve terracotta vurgumuzu koruyoruz (ürün sahibi kararı:
 * "sadece font ve renklerimiz bizim şuan ki uygulamamız gibi olacak").
 */

/** Ölçüm: 10 px / 2.4046 = 4.2 pt. */
const PROGRESS_HEIGHT = 4;

/** Ölçüm: alt düğme 116 px / 2.4046 = 48.2 pt. */
const FOOTER_BUTTON_HEIGHT = 48;

/**
 * Ölçüm: düğmenin sol dolgu sınırı +38 px'te hâlâ kavisliydi ve düğme
 * 116 px yüksekliğinde -- yani yarıçap = yükseklik/2, tam pill.
 */
const FOOTER_BUTTON_RADIUS = FOOTER_BUTTON_HEIGHT / 2;

/** Ölçüm: ekran altından 121 px = 50.3 pt; home indicator (34) + 16. */
const FOOTER_BOTTOM_PADDING = 16;

interface OnboardingScaffoldProps {
  /** 0..1 arası. Üstteki ince çubuğun dolu kısmı. */
  progress: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function OnboardingScaffold({
  progress,
  title,
  subtitle,
  children,
  footer,
}: OnboardingScaffoldProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      {/* Gökyüzü başlık + köşede Lumi (2026-10-06, referans: Funfluent
          "Select language"; yalnızca düzen). */}
      <SafeAreaView edges={["top"]} style={styles.sky}>
        <View style={styles.progressTrackWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.border.hairline }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.accent, width: `${clamped * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: onboardingSkyColors.title }]}>{title}</Text>
            {subtitle ? (
              <Text style={[type.chapterRowTitle, { color: onboardingSkyColors.body }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <MascotAnim name="search" width={mascotSize.card} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + FOOTER_BOTTOM_PADDING }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export const onboardingMetrics = {
  screenMargin: spacing.md, // ölçüm: 38-41 px -> 16 pt
  footerButtonHeight: FOOTER_BUTTON_HEIGHT,
  footerButtonRadius: FOOTER_BUTTON_RADIUS,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressTrackWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    borderRadius: PROGRESS_HEIGHT / 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: PROGRESS_HEIGHT / 2,
  },
  // Ölçüm: ilerleme çubuğu (y=161 px) ile başlık (y=341 px) arası 180 px
  // = 74.9 pt. Bunun bir kısmı başlığın kendi satır yüksekliği; blok
  // üstü boşluk olarak 40 pt bırakılıyor.
  sky: {
    backgroundColor: onboardingSkyColors.sky,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // 34 pt maskotun yanında üç satıra kırılıyordu; Lumi ekranıyla aynı ölçek.
  title: {
    ...onboardingSkyType.title,
    fontFamily: fontFamily.gabaritoBold,
    textAlign: "left",
  },
  body: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
