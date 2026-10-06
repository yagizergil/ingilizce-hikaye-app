import { Pressable } from "react-native";

import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<ComponentProps<typeof Pressable>, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Basılıyken ölçek (kartlar için 0.97 yeterince hissedilir, abartısız). */
  pressedScale?: number;
};

/** Yay: hızlı ama zıplamayan geri dönüş (iOS dokunuş hissi). */
const SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;

/**
 * Basınca hafifçe küçülüp bırakınca yaylanarak geri dönen dokunma alanı.
 *
 * NEDEN (2026-10-05): kartlar basılıyken yalnızca opaklığını değiştiriyordu;
 * profesyonel uygulamalar (App Store, Duolingo, Headway) dokunuşu fiziksel
 * bir geri bildirimle -- hafif ölçek + yay -- onaylıyor. Animasyon UI iş
 * parçacığında; "hareketi azalt" açıksa ölçeklenmiyor.
 */
export function PressableScale({
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        if (!reducedMotion) scale.set(withSpring(pressedScale, SPRING));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
