import { StyleSheet } from "react-native";

import Animated, { FadeIn, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";

import { AdventureLeaf } from "@/features/onboarding/components/AdventureLeaf";
import { AdventureParrot } from "@/features/onboarding/components/AdventureParrot";
import { SCENE_BASE, SCENE_LEAVES, SCENE_SIZE } from "@/features/onboarding/adventureAssets";
import { useSway } from "@/features/onboarding/hooks/useSway";

interface AdventureSceneProps {
  /** Sahne görselinin ekrandaki genişliği (pt); yükseklik orandan gelir. */
  width: number;
}

/**
 * Katmanlı orman sahnesi: zemin, köşe yaprakları, papağan. Tümü ortak bir
 * kapsayıcıda; kapsayıcı zeminin alt ortasından çok hafif "nefes alır"
 * (ölçek 1 -> 1.012), böylece tüm katmanlar birlikte, aynı anda canlanır.
 */
export function AdventureScene({ width }: AdventureSceneProps) {
  const scale = width / SCENE_SIZE.width;
  const height = SCENE_SIZE.height * scale;
  const breathe = useSway(6800, 0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.012]) }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(450)}
      style={[styles.scene, { width, height, transformOrigin: "50% 100%" }, style]}
    >
      <Image source={SCENE_BASE} style={styles.fill} contentFit="fill" />
      {SCENE_LEAVES.map((layer) => (
        <AdventureLeaf key={layer.key} layer={layer} scale={scale} />
      ))}
      <AdventureParrot scale={scale} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
