import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { accentLineThickness, tabBarIconSize } from "@/theme/tokens/layout";
import { spacing } from "@/theme/tokens/spacing";
import { monoType } from "@/theme/tokens/typography";
import { useTheme } from "@/theme/useTheme";

import type { ComponentProps } from "react";
import type {
  AccessibilityState,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";

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
 * mockups/tab-bar.html `nav .item` / `nav .item.active::after` — mono
 * label, active item gets a 2px accent underline (`accentLineThickness`).
 * Expo Router's built-in `tabBarLabelStyle` can't draw that underline, so
 * this replaces the default tab button via `tabBarButton`.
 *
 * The active tab is signaled three ways at once (product owner feedback:
 * the underline alone read as too subtle): ink vs. secondary text/icon
 * color, an outline→filled icon swap, and the underline. See
 * `tabBarIconSize`'s doc comment in `layout.ts` for why the filled icon
 * on the active item doesn't violate the "no filled icon sets" rule.
 *
 * REVISED (post-launch, product-owner design pass): a gradient-tab-bar
 * attempt briefly forced these to fixed white; that gradient was rejected
 * on-device ("saçma sapan", "saydam yap" — see app/(tabs)/_layout.tsx) and
 * the bar reverted to fully transparent, so icon/label colors are back to
 * theme-based (`theme.text.primary`/`secondary`) — a transparent bar still
 * sits over whatever theme background is scrolled underneath it, so fixed
 * white would no longer be reliably legible.
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
      <Text style={[styles.label, { color: tintColor }]}>{label}</Text>
      <View
        style={[
          styles.underline,
          { backgroundColor: isActive ? theme.accent : "transparent" },
        ]}
      />
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
    ...monoType.label,
  },
  underline: {
    marginTop: spacing.xs,
    width: spacing.lg,
    height: accentLineThickness,
  },
});
