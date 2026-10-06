import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { motion, paywallMetrics, paywallType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { PlanOption } from "@/features/paywall/planModel";

interface PaywallPlanCardProps {
  options: PlanOption[];
  selectedId: string | null;
  onSelect: (option: PlanOption) => void;
  disabled: boolean;
}

/**
 * Plan seçici -- tek bir kart, içinde satırlar (referans: paywall1.jpeg).
 *
 * ÖNCEKİ HÂLİNDEN FARKI: her plan ayrı bir çerçeveli kutuydu. Referansta
 * planlar TEK bir kartın içinde, aralarında saç teli çizgi var; deneme
 * rozeti satırın üstüne taşıyor ve indirim çipi başlığın yanında duruyor.
 * Seçim solda bir radyo düğmesiyle gösteriliyor.
 *
 * Seçili durum yalnızca renkle değil, dolu radyo + tik ile de anlatılıyor
 * (renk körlüğü ve yüksek kontrast modları).
 */
export function PaywallPlanCard({ options, selectedId, onSelect, disabled }: PaywallPlanCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={styles.card} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.pkg.identifier === selectedId;
        const title =
          option.kind === "annual"
            ? t("paywall.plan.annual")
            : option.kind === "monthly"
              ? t("paywall.plan.monthly")
              : option.pkg.product.title;

        return (
          <View key={option.pkg.identifier}>
            <Pressable
              onPress={() => onSelect(option)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={[
                title,
                option.pkg.product.priceString,
                option.trial ? t("paywall.plan.trialDays", { count: option.trial.days }) : null,
              ]
                .filter(Boolean)
                .join(". ")}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.bg.surface,
                  borderColor: selected ? theme.accent : theme.bg.surface,
                  opacity: pressed ? motion.pressed.opacity : 1,
                },
              ]}
            >
              {/* Deneme rozeti satırın ÜSTÜNDE, başlık hizasında --
                  referanstaki yerleşim. */}
              {option.trial ? (
                <View style={[styles.trialBadge, { backgroundColor: theme.accent }]}>
                  <Text style={[paywallType.planBadge, { color: theme.text.onAccent }]}>
                    {t("paywall.plan.trialDays", { count: option.trial.days })}
                  </Text>
                </View>
              ) : null}

              <View style={styles.rowBody}>
                <View
                  style={[
                    styles.radio,
                    selected
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { borderColor: theme.border.strong },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color={theme.text.onAccent} />
                  ) : null}
                </View>

                <View style={styles.titleBlock}>
                  <View style={styles.titleLine}>
                    <Text style={[paywallType.planTitle, { color: theme.text.primary }]}>
                      {title}
                    </Text>
                    {option.savingsPercent != null ? (
                      <View style={[styles.savingsChip, { backgroundColor: theme.accent }]}>
                        <Text style={[paywallType.planBadge, { color: theme.text.onAccent }]}>
                          {t("paywall.plan.savingsShort", { percent: option.savingsPercent })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {option.monthlyEquivalent ? (
                    <Text style={[paywallType.planNote, { color: theme.text.secondary }]}>
                      {t("paywall.plan.perMonth", { price: option.monthlyEquivalent })}
                    </Text>
                  ) : null}
                </View>

                <Text style={[paywallType.planPrice, { color: theme.text.secondary }]}>
                  {option.kind === "monthly"
                    ? t("paywall.plan.pricePerMonth", { price: option.pkg.product.priceString })
                    : option.pkg.product.priceString}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  row: {
    borderRadius: paywallMetrics.cardRadius,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  rowBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: paywallMetrics.planRowHeight,
  },
  radio: {
    width: paywallMetrics.radioSize,
    height: paywallMetrics.radioSize,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trialBadge: {
    alignSelf: "flex-start",
    marginLeft: paywallMetrics.radioSize + spacing.sm,
    height: paywallMetrics.badgeHeight,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  savingsChip: {
    height: paywallMetrics.badgeHeight,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
