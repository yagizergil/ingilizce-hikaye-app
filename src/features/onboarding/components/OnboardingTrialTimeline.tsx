import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Referanstaki üç satır: bugün / hatırlatma günü / tahsilat günü. */
const ROWS: { key: string; icon: IoniconName; tint: string }[] = [
  { key: "today", icon: "lock-open-outline", tint: levelAccent.A2 },
  { key: "reminder", icon: "notifications-outline", tint: levelAccent.B1 },
  { key: "charge", icon: "star-outline", tint: levelAccent.B2 },
];

const BADGE_SIZE = 36;

interface OnboardingTrialTimelineProps {
  /** Denemenin gerçek süresi; bilinmiyorsa kart hiç gösterilmiyor. */
  trialDays: number | null;
}

/**
 * "Ücretsiz deneme nasıl işliyor" kartı
 * (referans: `docs/reference/bookvo-14-paywall.jpeg`).
 *
 * Uygulamanın kendi paywall'ının içine `intro` olarak giriyor, ayrı bir
 * paywall olarak DEĞİL -- fiyat, plan seçimi ve yasal blok tek yerde
 * kalsın diye (bkz. `PaywallScreen`).
 *
 * Deneme yoksa (RevenueCat paketinde giriş fiyatı tanımlı değilse) kart
 * hiç render edilmiyor: olmayan bir denemeyi anlatan bir takvim,
 * yanıltıcı metadata olurdu.
 */
export function OnboardingTrialTimeline({ trialDays }: OnboardingTrialTimelineProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!trialDays || trialDays < 2) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
      ]}
    >
      <Text style={[monoType.eyebrow, { color: theme.text.secondary }]}>
        {t("onboarding.trial.heading")}
      </Text>

      <View style={styles.rows}>
        {/* Rozetleri birbirine bağlayan dikey çizgi -- referanstaki gibi
            ilk rozetin merkezinden sonuncunun merkezine kadar. */}
        <View style={[styles.spine, { backgroundColor: theme.border.hairline }]} />

        {ROWS.map((row, index) => (
          <View key={row.key} style={styles.row}>
            <View style={[styles.badge, { backgroundColor: `${row.tint}22` }]}>
              <Ionicons name={row.icon} size={18} color={row.tint} />
            </View>
            <View style={styles.rowText}>
              <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                {t(`onboarding.trial.rows.${row.key}.title`, {
                  // "6. gün" ve "7. gün" deneme süresinden türetiliyor.
                  day: index === 1 ? trialDays - 1 : trialDays,
                })}
              </Text>
              <Text style={[monoType.meta, { color: theme.text.secondary }]}>
                {t(`onboarding.trial.rows.${row.key}.body`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rows: {
    gap: spacing.md,
  },
  spine: {
    position: "absolute",
    width: 2,
    left: BADGE_SIZE / 2 - 1,
    top: BADGE_SIZE / 2,
    bottom: BADGE_SIZE / 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
