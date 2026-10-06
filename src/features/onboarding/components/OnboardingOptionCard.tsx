import { Pressable, StyleSheet, Text, View } from "react-native";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import type { ReactNode } from "react";

/**
 * Onboarding'deki seçenek satırı: solda rozet, ortada başlık + alt başlık,
 * sağda seçim göstergesi.
 *
 * ÖLÇÜLER (referanstan piksel olarak, bkz.
 * docs/plans/2026-09-14-onboarding-tasarim.md):
 *   kart yarıçapı 12 pt, iç padding 16 pt, rozet 44x44 pt,
 *   rozet -> metin 16 pt, kartlar arası 12 pt.
 *
 * YÜKSEKLİK BİLEREK SABİT DEĞİL: referans ölçümünde kart aralıkları
 * 221-236 px arasında değişiyordu, çünkü alt başlık bir ya da iki satır
 * olabiliyor. Sabit yükseklik vermek uzun metni kırpardı.
 */

/**
 * Ölçüm 44 pt diyordu ama referansın satırında rozetin altında/üstünde
 * bizdekinden az boşluk var. 36 pt + daha dar iç padding, satırı
 * referanstaki yoğunluğa getiriyor: on dillik liste tek ekrana daha çok
 * sığıyor ve kartlar "boşta" durmuyor.
 */
const BADGE_SIZE = 36;

/** Ölçüm: seçim halkası ~24 px çap; iOS radio ölçüsüyle de uyumlu. */
const RADIO_SIZE = 24;

interface OnboardingOptionCardProps {
  /** Rozet içeriği -- seviye kodu ("A1"), bayrak ya da ikon. */
  badge?: ReactNode;
  /** Rozetin arka plan rengi. Verilmezse rozet çizilmez. */
  badgeColor?: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Seçilemez durumdaki satır (örn. henüz içeriği olmayan dil). */
  disabled?: boolean;
  /** Sağda seçim halkası yerine gösterilecek metin (örn. "Yakında"). */
  trailingLabel?: string;
}

export function OnboardingOptionCard({
  badge,
  badgeColor,
  title,
  subtitle,
  selected,
  onPress,
  disabled = false,
  trailingLabel,
}: OnboardingOptionCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.bg.surface,
          // Seçili satır referansta vurgu rengiyle çerçeveleniyor; seçili
          // olmayan satırın çerçevesi hairline.
          borderColor: selected ? theme.accent : theme.border.hairline,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {badge ? (
        <View style={[styles.badge, badgeColor ? { backgroundColor: badgeColor } : null]}>
          {badge}
        </View>
      ) : null}

      <View style={styles.textBlock}>
        {/* Arapça gibi sağdan sola yazılan adlar da satırda solda dursun:
            hizasız bir satır listede hata gibi görünüyordu. */}
        <Text style={[type.bookTitleMd, styles.title, { color: theme.text.primary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[monoType.rowText, styles.subtitle, { color: theme.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailingLabel ? (
        <Text style={[monoType.rowText, { color: theme.text.secondary }]}>{trailingLabel}</Text>
      ) : (
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? theme.accent : theme.border.hairline,
              backgroundColor: selected ? theme.accent : "transparent",
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    textAlign: "left",
    writingDirection: "ltr",
  },
  subtitle: {
    // Alt başlık iki satıra taşabilir -- kart yüksekliği ona göre büyür.
    flexShrink: 1,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
  },
});
