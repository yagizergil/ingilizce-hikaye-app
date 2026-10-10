import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

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

const ACTIVE_SCALE = homeMetrics.tabIconSizeActive / homeMetrics.tabIconSize;
const SPRING = { damping: 14, stiffness: 220, mass: 0.6 } as const;

/**
 * Alt gezinti çubuğunun tek sekmesi.
 *
 * Aktif sekme DAİRE ile değil (2026-10-11 ürün sahibi kararı: sarı daire
 * tasarım diline uymuyordu), iOS'un yerel sekme çubuğundaki gibi gösteriliyor:
 * ikon dolu/renkli sürümüne geçip yay animasyonuyla büyür, etiket kalın ve koyu
 * olur; pasif sekmeler gri çizgi ikon ve normal ağırlıkta kalır. Ölçek
 * dönüşümü yalnızca `transform` olduğu için yerleşimi oynatmaz ve UI iş
 * parçacığında çalışır; "hareketi azalt" açıksa animasyonsuz geçer.
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
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(focused ? ACTIVE_SCALE : 1);

  useEffect(() => {
    const target = focused ? ACTIVE_SCALE : 1;
    scale.value = reducedMotion ? target : withSpring(target, SPRING);
  }, [focused, reducedMotion, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
      <Animated.View style={[styles.iconBox, iconStyle]}>
        <Image
          source={focused ? iconActive : icon}
          style={styles.icon}
          contentFit="contain"
          transition={0}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
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
  // Kutu aktif boyutta sabit: ikon büyürken etiket aşağı kaymaz.
  iconBox: {
    width: homeMetrics.tabIconSizeActive,
    height: homeMetrics.tabIconSizeActive,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: homeMetrics.tabIconSize,
    height: homeMetrics.tabIconSize,
  },
  label: {
    marginTop: homeMetrics.tabLabelGap,
    maxWidth: homeMetrics.tabCircle,
  },
});
