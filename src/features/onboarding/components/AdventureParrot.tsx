import { useEffect } from "react";
import { StyleSheet } from "react-native";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";

import {
  PARROT_RECT,
  SCENE_PARROT,
  SCENE_PARROT_CLOSED,
  SCENE_PARROT_HALF,
} from "@/features/onboarding/adventureAssets";
import { useSway } from "@/features/onboarding/hooks/useSway";

interface AdventureParrotProps {
  scale: number;
}

/** Göz kırpma turu (ms): açık bekle -> kapan -> kapalı kal -> aç -> bekle. */
const WINK_OPEN_HOLD = 2600;
const WINK_CLOSE = 190;
const WINK_CLOSED_HOLD = 430;
const WINK_OPEN = 260;
const WINK_REST = 1300;

/**
 * Omzundaki papağan: ayaklarından yavaşça sallanır, hafifçe zıplar ve
 * aralıklarla SAĞDAKİ gözüyle göz kırpar (yarım ve tam kapalı iki ara kare
 * yumuşak geçişle). Girişte aşağıdan yaylanarak gelir.
 */
export function AdventureParrot({ scale }: AdventureParrotProps) {
  const sway = useSway(3400, 300);
  const bob = useSway(1700, 0);
  const enter = useSharedValue(0);
  const wink = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(500, withSpring(1, { damping: 9, stiffness: 120 }));
    wink.value = withDelay(
      1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: WINK_CLOSE, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: WINK_CLOSED_HOLD }),
          withTiming(0, { duration: WINK_OPEN, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: WINK_REST + WINK_OPEN_HOLD }),
        ),
        -1,
        false,
      ),
    );
  }, [enter, wink]);

  const width = (PARROT_RECT.x1 - PARROT_RECT.x0) * scale;
  const height = (PARROT_RECT.y1 - PARROT_RECT.y0) * scale;

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 2),
    transform: [
      {
        translateY:
          (1 - enter.value) * 26 * scale * 3 + interpolate(bob.value, [0, 1], [0, -5 * scale]),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-2.6, 2.6])}deg` },
      { scale: interpolate(enter.value, [0, 1], [0.85, 1]) },
    ],
  }));
  const halfStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wink.value, [0, 0.5, 1], [0, 1, 0]),
  }));
  const closedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wink.value, [0.45, 1], [0, 1], "clamp"),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sprite,
        {
          left: PARROT_RECT.x0 * scale,
          top: PARROT_RECT.y0 * scale,
          width,
          height,
          transformOrigin: "55% 97%",
        },
        bodyStyle,
      ]}
    >
      <Image source={SCENE_PARROT} style={styles.fill} contentFit="fill" />
      <Animated.View style={[styles.fill, halfStyle]}>
        <Image source={SCENE_PARROT_HALF} style={styles.fill} contentFit="fill" />
      </Animated.View>
      <Animated.View style={[styles.fill, closedStyle]}>
        <Image source={SCENE_PARROT_CLOSED} style={styles.fill} contentFit="fill" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sprite: {
    position: "absolute",
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
