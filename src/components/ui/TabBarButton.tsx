import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { homeColors, homeMetrics, homeType } from "@/theme";

import type { AccessibilityState, GestureResponderEvent } from "react-native";

/**
 * Expo Router 57 React Navigation'ı kendi içine aldı; `BottomTabBarButtonProps`
 * dışarıdan import edilemiyor. `tabBarButton` prop'undan yalnızca bu uçlar
 * kullanılıyor, geri kalanı spread ile gelip yok sayılıyor.
 */
interface TabBarButtonProps {
  accessibilityState?: AccessibilityState;
  /** Expo Router 57 seçili sekmeyi BU alanla bildiriyor. */
  "aria-selected"?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  label: string;
  /** Pasif ve aktif ikon görselleri (`assets/home/tab-*.png`, `require` sonucu). */
  icon: number;
  iconActive: number;
}

/**
 * Alt gezinti çubuğunun tek sekmesi (Funfluent referansı).
 *
 * Ikonlar referanstan üretilmiş görseller. Pasif sekme yalnızca gri çizgi ikon; aktif sekme büyük soluk-sarı bir
 * dairenin içinde turuncu dolu ikon olarak çıkıyor. Referansta etiket yok;
 * erişilebilirlik adı (`label`) her zaman duruyor.
 *
 * Expo Router 57 aktif durumu `aria-selected` ile geçiriyor;
 * `accessibilityState.selected` eski yol (ikisi de okunuyor).
 */
export function TabBarButton({
  onPress,
  onLongPress,
  accessibilityState,
  "aria-selected": ariaSelected,
  icon,
  iconActive,
  label,
}: TabBarButtonProps) {
  const focused = ariaSelected ?? accessibilityState?.selected ?? false;

  return (
    <Pressable
      onPress={(event) => {
        if (!focused) void Haptics.selectionAsync();
        onPress?.(event);
      }}
      onLongPress={onLongPress ?? undefined}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={styles.button}
    >
      <View style={[styles.circle, focused && styles.circleActive]}>
        <Image
          source={focused ? iconActive : icon}
          style={styles.icon}
          contentFit="contain"
          transition={0}
          accessibilityIgnoresInvertColors
        />
        <Text
          style={[
            focused ? homeType.tabLabelActive : homeType.tabLabel,
            styles.label,
            { color: focused ? homeColors.tabActiveIcon : homeColors.tabIcon },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  circle: {
    width: homeMetrics.tabCircle,
    height: homeMetrics.tabCircle,
    borderRadius: homeMetrics.tabCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: homeMetrics.tabLabelGap,
    maxWidth: homeMetrics.tabCircle,
  },
  icon: {
    width: homeMetrics.tabIconSize,
    height: homeMetrics.tabIconSize,
  },
  circleActive: {
    backgroundColor: homeColors.tabActiveBg,
  },
});
