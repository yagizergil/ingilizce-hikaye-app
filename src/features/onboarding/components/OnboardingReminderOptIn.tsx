import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { enableDailyReadingReminder } from "@/features/reminders";

/** Seçilebilen saatler. Akşam varsayılan: hatırlatma planının geri kalanıyla aynı. */
const TIMES = [8, 13, 20, 22] as const;
const DEFAULT_HOUR = 20;

type OptInState = "idle" | "busy" | "on" | "denied";

/**
 * Onboarding sonunda GÜNLÜK OKUMA HATIRLATMASI teklifi (1.1.0).
 *
 * NEDEN BURADA, NEDEN DÜĞME: hatırlatmalar varsayılan kapalı ve D1 tutunma
 * %11,9. İzin hâlâ açılışta İSTENMİYOR (ADR-010): kullanıcı saati kendisi
 * seçip düğmeye bastığında isteniyor -- az önce günlük hedefini seçmiş
 * birine "her gün kaçta hatırlatalım?" sorusu, iznin neye yarayacağını
 * bildiği an. Basmazsa hiçbir şey olmuyor.
 */
export function OnboardingReminderOptIn() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [hour, setHour] = useState<number>(DEFAULT_HOUR);
  const [state, setState] = useState<OptInState>("idle");

  // Opt-in oranının paydası.
  useEffect(() => {
    trackEvent("reminder_optin_shown");
  }, []);

  const label = (value: number) => `${String(value).padStart(2, "0")}:00`;

  const handleEnable = async () => {
    setState("busy");
    const ok = await enableDailyReadingReminder({ hour, minute: 0 }, t);
    setState(ok ? "on" : "denied");
  };

  if (state === "on") {
    return (
      <Text style={[monoType.rowText, styles.centered, { color: theme.text.secondary }]}>
        {t("onboarding.reminder.enabled", { time: label(hour) })}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
      ]}
    >
      <Text style={[type.bookTitleMd, styles.centered, { color: theme.text.primary }]}>
        {t("onboarding.reminder.title")}
      </Text>
      <View style={styles.times} accessibilityRole="radiogroup">
        {TIMES.map((value) => {
          const selected = value === hour;
          return (
            <Pressable
              key={value}
              onPress={() => setHour(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderColor: selected ? theme.accent : theme.border.hairline,
                  backgroundColor: selected ? `${theme.accent}22` : "transparent",
                },
              ]}
            >
              <Text style={[monoType.rowText, { color: theme.text.primary }]}>{label(value)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => void handleEnable()}
        disabled={state === "busy"}
        accessibilityRole="button"
        style={[styles.button, { borderColor: theme.accent }]}
      >
        <Text style={[monoType.rowText, { color: theme.text.primary }]}>
          {t("onboarding.reminder.cta")}
        </Text>
      </Pressable>
      {state === "denied" ? (
        <Text style={[monoType.rowText, styles.centered, { color: theme.text.secondary }]}>
          {t("onboarding.reminder.denied")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  centered: {
    textAlign: "center",
  },
  times: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  button: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
});
