import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { badgePadding, monoType, motion, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { PlanOption } from "@/features/paywall/planModel";

interface PlanOptionRowProps {
  option: PlanOption;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

/**
 * Plan seçicinin tek satırı.
 *
 * NEDEN SEÇİCİ, NEDEN BUTON DEĞİL: paywall daha önce her paket için eşit
 * ağırlıkta birer satın alma butonu gösteriyordu. Bu iki şeyi birden
 * bozuyordu — hiçbir plan önerilmiyordu (kullanıcı karşılaştırma yapmak
 * zorunda kalıyordu) ve ekranda tek bir birincil eylem yoktu. Artık seçim
 * ile satın alma ayrı: burada plan seçilir, aşağıda tek bir CTA basılır.
 *
 * Seçili durum yalnızca renkle değil, kalın kenarlık ve bir işaretle de
 * anlatılıyor — renk körlüğü ve yüksek kontrast modları için.
 */
export function PlanOptionRow({ option, selected, onSelect, disabled }: PlanOptionRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const title =
    option.kind === "annual"
      ? t("paywall.plan.annual")
      : option.kind === "monthly"
        ? t("paywall.plan.monthly")
        : option.pkg.product.title;

  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={[
        title,
        option.pkg.product.priceString,
        option.savingsPercent != null
          ? t("paywall.plan.savings", { percent: option.savingsPercent })
          : null,
      ]
        .filter(Boolean)
        .join(", ")}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? theme.accent : theme.border.hairline,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: selected ? theme.bg.surface : "transparent",
          opacity: disabled ? 0.5 : pressed ? motion.pressed.opacity : 1,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.titleLine}>
          <Text style={[type.bookTitleMd, { color: theme.text.primary }]}>{title}</Text>
          {option.savingsPercent != null ? (
            <View style={[styles.badge, { borderColor: theme.accent }]}>
              <Text style={[monoType.badge, { color: theme.accent }]}>
                {t("paywall.plan.savings", { percent: option.savingsPercent })}
              </Text>
            </View>
          ) : null}
        </View>
        {option.trial ? (
          <Text style={[monoType.meta, { color: theme.text.secondary }]}>
            {t("paywall.plan.trialDays", { count: option.trial.days })}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={[monoType.statValue, { color: theme.text.primary }]}>
          {option.pkg.product.priceString}
        </Text>
        {option.monthlyEquivalent ? (
          <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>
            {t("paywall.plan.perMonth", { price: option.monthlyEquivalent })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: 64,
  },
  left: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    // LevelBadge ve diğer rozetlerle aynı iç boşluk (layout.ts).
    paddingHorizontal: badgePadding.horizontal,
    paddingVertical: badgePadding.vertical,
  },
  right: {
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
});
