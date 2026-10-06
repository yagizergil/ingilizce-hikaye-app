import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * Animasyonlu Lingo logosu. Logo (`assets/brand/lingo-wordmark.png`) beş
 * parçaya bölündü (`assets/brand/logo-parts/`): L, i, n, g ve göz kırpan
 * papağan "o". Harfler sırayla yukarıdan yaylanarak düşer; papağan en son
 * küçükten büyüyerek gelir ve kafasını hafifçe sallar.
 *
 * Parçaların x konumları ve genişlikleri kaynak logonun piksel ölçüsü
 * (1200 x 414); bileşen `width`e göre ölçekler. "Hareketi azalt" açıksa
 * logo doğrudan yerinde görünür.
 */
const SOURCE_W = 1200;
const SOURCE_H = 414;

const PARTS = [
  { key: "l", x: 0, w: 245, src: require("../../../assets/brand/logo-parts/l.png") as number },
  { key: "i", x: 245, w: 122, src: require("../../../assets/brand/logo-parts/i.png") as number },
  { key: "n", x: 367, w: 255, src: require("../../../assets/brand/logo-parts/n.png") as number },
  { key: "g", x: 622, w: 256, src: require("../../../assets/brand/logo-parts/g.png") as number },
] as const;
const PARROT = {
  x: 878,
  w: 322,
  src: require("../../../assets/brand/logo-parts/o.png") as number,
};

const LETTER_STAGGER = 110;
const SPRING = { damping: 10, stiffness: 160, mass: 0.8 };

interface LetterProps {
  src: number;
  left: number;
  width: number;
  height: number;
  delay: number;
  still: boolean;
}

function Letter({ src, left, width, height, delay, still }: LetterProps) {
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      p.value = 1;
      return;
    }
    p.value = withDelay(delay, withSpring(1, SPRING));
  }, [delay, p, still]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 2),
    transform: [{ translateY: (1 - p.value) * -height * 0.6 }],
  }));

  return (
    <Animated.View style={[styles.part, { left, width, height }, style]}>
      <Image source={src} style={styles.fill} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

function Parrot({ left, width, height, delay, still }: Omit<LetterProps, "src">) {
  const scale = useSharedValue(still ? 1 : 0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (still) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(delay, withSpring(1, { damping: 7, stiffness: 140 }));
    // Yerine oturunca kısa bir kafa sallama: "merhaba".
    tilt.value = withDelay(
      delay + 380,
      withSequence(
        withTiming(-8, { duration: 140 }),
        withTiming(6, { duration: 160 }),
        withTiming(0, { duration: 160 }),
      ),
    );
  }, [delay, scale, still, tilt]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, scale.value * 3),
    transform: [{ scale: scale.value }, { rotate: `${tilt.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.part, { left, width, height }, style]}>
      <Image source={PARROT.src} style={styles.fill} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

interface LogoAnimProps {
  width: number;
  /** Animasyonun başlamadan önceki gecikmesi (ms). */
  delay?: number;
}

export function LogoAnim({ width, delay = 0 }: LogoAnimProps) {
  const reduceMotion = useReduceMotion();
  const scale = width / SOURCE_W;
  const height = SOURCE_H * scale;

  return (
    <View style={{ width, height }}>
      {PARTS.map((part, i) => (
        <Letter
          key={part.key}
          src={part.src}
          left={part.x * scale}
          width={part.w * scale}
          height={height}
          delay={delay + i * LETTER_STAGGER}
          still={reduceMotion}
        />
      ))}
      <Parrot
        left={PARROT.x * scale}
        width={PARROT.w * scale}
        height={height}
        delay={delay + PARTS.length * LETTER_STAGGER + 60}
        still={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  part: {
    position: "absolute",
    top: 0,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
