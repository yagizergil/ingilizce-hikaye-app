import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";
import { trialChargeDate, trialReminderDay } from "@/features/reminders";

import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const BADGE_SIZE = 32;

interface PaywallTrialTimelineProps {
  /** Seçili planın GERÇEK deneme süresi (RevenueCat introPrice + uygunluk). */
  trialDays: number;
  /** App Store'un biçimlediği fiyat ("₺399,99"). */
  priceString: string;
  periodLabel: string;
  /**
   * Bildirim izni alınabilir mi. Reddedilmişse "hatırlatırız" denmiyor --
   * tutulamayacak bir söz yanıltıcı metadata olurdu (Guideline 2.3.1).
   */
  canRemind: boolean;
  /** Ekranın o anki tarihi (testte sabitlenebilsin diye dışarıdan). */
  now: Date;
}

/**
 * "Deneme nasıl işliyor" zaman çizelgesi (1.1.0, Blinkist deseni):
 * Bugün tam erişim -> (N-2). gün hatırlatma -> N. gün tahsilat, TARİH ve
 * FİYATLA. Yalnızca seçili plan gerçekten denemeye uygunken çiziliyor
 * (çağıran karar veriyor). Eskiden `onboarding/OnboardingTrialTimeline`
 * olarak yazılmış ama hiçbir yerde render edilmiyordu.
 */
export function PaywallTrialTimeline({
  trialDays,
  priceString,
  periodLabel,
  canRemind,
  now,
}: PaywallTrialTimelineProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const reminderDay = trialReminderDay(trialDays);
  const chargeDate = trialChargeDate(now, trialDays).toLocaleDateString(i18n.language, {
    day: "numeric",
    month: "long",
  });

  const rows: { key: string; icon: IoniconName; tint: string; title: string; body: string }[] = [
    {
      key: "today",
      icon: "lock-open-outline",
      tint: levelAccent.A2,
      title: t("paywall.timeline.todayTitle"),
      body: t("paywall.timeline.todayBody"),
    },
  ];
  if (reminderDay !== null) {
    rows.push({
      key: "reminder",
      icon: "notifications-outline",
      tint: levelAccent.B1,
      title: t("paywall.timeline.dayTitle", { day: reminderDay }),
      body: canRemind
        ? t("paywall.timeline.reminderBody")
        : t("paywall.timeline.reminderBodyNoPermission"),
    });
  }
  rows.push({
    key: "charge",
    icon: "star-outline",
    tint: levelAccent.B2,
    title: t("paywall.timeline.chargeTitle", { day: trialDays, date: chargeDate }),
    body: t("paywall.timeline.chargeBody", { price: priceString, period: periodLabel }),
  });

  return (
    <View
      style={[styles.card, { backgroundColor: theme.bg.surface, borderColor: theme.accent }]}
      accessibilityRole="summary"
    >
      <Text style={[monoType.eyebrow, { color: theme.text.secondary }]}>
        {t("paywall.timeline.heading", { count: trialDays })}
      </Text>
      <View style={styles.rows}>
        <View style={[styles.spine, { backgroundColor: theme.border.hairline }]} />
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={[styles.badge, { backgroundColor: `${row.tint}22` }]}>
              <Ionicons name={row.icon} size={16} color={row.tint} />
            </View>
            <View style={styles.rowText}>
              <Text style={[type.bookTitleMd, { color: theme.text.primary }]}>{row.title}</Text>
              <Text style={[monoType.rowText, { color: theme.text.secondary }]}>{row.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  rows: {
    gap: spacing.sm,
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
