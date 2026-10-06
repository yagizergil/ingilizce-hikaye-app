import { StyleSheet } from "react-native";

import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";

import type { LeafLayer } from "@/features/onboarding/adventureAssets";
import { useSway } from "@/features/onboarding/hooks/useSway";

interface AdventureLeafProps {
  layer: LeafLayer;
  /** Sahne pikselinden ekran noktasına ölçek (kutu genişliği / 1076). */
  scale: number;
}

/** Köşeye bağlı yaprak kümesi: ekran kenarındaki noktadan rüzgârda hafifçe sallanır. */
export function AdventureLeaf({ layer, scale }: AdventureLeafProps) {
  const { rect, amplitude, duration, delay, origin, source } = layer;
  const t = useSway(duration, delay);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(t.value, [0, 1], [-amplitude, amplitude])}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          left: rect.x0 * scale,
          top: rect.y0 * scale,
          width: (rect.x1 - rect.x0) * scale,
          height: (rect.y1 - rect.y0) * scale,
          transformOrigin: origin,
        },
        style,
      ]}
    >
      <Image source={source} style={styles.fill} contentFit="fill" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
