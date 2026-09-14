import { Pressable, StyleSheet, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { tabBarIconSize } from "@/theme/tokens/layout";
import { spacing } from "@/theme/tokens/spacing";
import { fontFamily, monoType } from "@/theme/tokens/typography";
import { useTheme } from "@/theme/useTheme";

import type { ComponentProps } from "react";
import type { AccessibilityState, GestureResponderEvent, StyleProp, ViewStyle } from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Expo Router 57 (SDK 57) React Navigation'i kendi icine aldi; artik
 * `@react-navigation/bottom-tabs` diye ayri bir paket kurulmuyor, dolayisiyla
 * `BottomTabBarButtonProps` disaridan import edilemiyor. Bu component
 * `tabBarButton` prop'undan gelen alanlarin yalnizca bu ucunu kullaniyor;
 * geri kalani spread ile gelip yok sayiliyor.
 */
interface TabBarButtonProps {
  accessibilityState?: AccessibilityState;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  label: string;
  /** Icon shown when this tab is NOT active — always the `-outline` variant. */
  iconOutline: IoniconName;
  /** Icon shown when this tab IS active — always the solid/filled variant. */
  iconActive: IoniconName;
}

/**
 * FAZ 2 (2026-09-14, referans uygulama eşleştirmesi — "dicto"): önceki
 * versiyon mono, BÜYÜK HARF etiket + aktif öğede 2px altçizgi kullanıyordu.
 * Referans çubukta ne büyük harf ne de altçizgi var — aktif/inaktif ayrımı
 * yalnızca RENK (beyaz vs. gri) ve etiket KALINLIĞI (bold vs. regular) ile
 * yapılıyor, ikon da outline->dolu değişiyor (bu ikinci sinyal referansta
 * da var, aynı kalıp korundu). Etiket artık normal büyük/küçük harf
 * (`label.toUpperCase()` çağrısı `app/(tabs)/_layout.tsx`'ten kaldırıldı).
 */
export function TabBarButton({
  label,
  iconOutline,
  iconActive,
  accessibilityState,
  onPress,
  style,
}: TabBarButtonProps) {
  const { theme } = useTheme();
  const isActive = accessibilityState?.selected ?? false;
  const tintColor = isActive ? theme.text.primary : theme.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, style]}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      hitSlop={spacing.sm}
    >
      <Ionicons
        name={isActive ? iconActive : iconOutline}
        size={tabBarIconSize}
        color={tintColor}
      />
      <Text
        style={[
          styles.label,
          {
            color: tintColor,
            fontFamily: isActive ? fontFamily.nunitoBold : fontFamily.nunitoSemiBold,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  label: {
    fontSize: monoType.buttonLabel.fontSize,
    lineHeight: monoType.buttonLabel.lineHeight,
  },
});
