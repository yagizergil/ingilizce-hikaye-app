import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { fontFamily, splashColors, splashMetrics, splashType } from "@/theme";

import {
  CHIP_HEIGHT,
  chipEdge,
  chipTop,
  type SplashGeometry,
} from "@/features/splash/splashLayout";
import {
  SPLASH_GREETINGS,
  SPLASH_TIMING,
  type SplashGreeting,
} from "@/features/splash/splashTimeline";

interface BubbleProps {
  greeting: SplashGreeting;
  /** Belirme sırası (SPLASH_GREETINGS içindeki konumu). */
  index: number;
  /** Kuyruğun hangi alt köşede olduğu: balon kuşa doğru "konuşuyor". */
  tail: "left" | "right";
  reduceMotion: boolean;
}

/** Tek sohbet balonu: beyaz yuvarlak gövde, açık mavi yazı, alt köşede küçük
 * kuyruk. Belirirken yaylanır, sonra çok hafif süzülür (her balon farklı fazda). */
function Bubble({ greeting, index, tail, reduceMotion }: BubbleProps) {
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      // Ayar sonradan açıldıysa devam eden animasyonu kesip yerine koy.
      pop.value = 1;
      float.value = 0;
      return;
    }
    const delay = SPLASH_TIMING.bubblesStart + index * SPLASH_TIMING.bubbleStagger;
    pop.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 170 }));
    float.value = withDelay(
      delay + 300,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 1300 + index * 70 }),
          withTiming(3, { duration: 1300 + index * 70 }),
        ),
        -1,
        true,
      ),
    );
  }, [float, index, pop, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [{ translateY: float.value }, { scale: 0.5 + 0.5 * pop.value }],
  }));

  return (
    <Animated.View style={[styles.bubble, style]}>
      <View style={[styles.tail, tail === "left" ? styles.tailLeft : styles.tailRight]} />
      <Text style={styles.text}>{greeting.text}</Text>
    </Animated.View>
  );
}

interface SplashGreetingBubblesProps {
  geometry: SplashGeometry;
  reduceMotion: boolean;
}

/**
 * Papağanın çevresinde sıralı beliren, her dilde "merhaba" diyen sohbet
 * balonları. Her balon bir kenara kendi iç boşluğu ve dikey sapmasıyla
 * yaslanır (dağınık görünüm); genişliğini içeriği belirler. Kuyruklar kuşa
 * bakar: soldaki balonların kuyruğu sağda, sağdakilerin solda.
 */
export function SplashGreetingBubbles({ geometry, reduceMotion }: SplashGreetingBubblesProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}
    >
      {SPLASH_GREETINGS.map((greeting, index) => (
        <View
          key={greeting.lang}
          style={[
            styles.slot,
            { top: chipTop(geometry, greeting) },
            greeting.side === "right"
              ? { right: chipEdge(greeting) }
              : { left: chipEdge(greeting) },
          ]}
        >
          <Bubble
            greeting={greeting}
            index={index}
            tail={greeting.side === "right" ? "left" : "right"}
            reduceMotion={reduceMotion}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  slot: {
    position: "absolute",
    height: CHIP_HEIGHT,
    justifyContent: "center",
  },
  bubble: {
    height: CHIP_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: splashMetrics.bubblePaddingH,
    borderRadius: splashMetrics.bubbleRadius,
    backgroundColor: splashColors.bubbleFill,
    shadowColor: splashColors.bubbleShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  // Kuyruk: gövdeyle aynı renkte, 45° döndürülmüş küçük kare; gövdenin
  // arkasından alt köşeden taşıyor ve sohbet balonu kuyruğu gibi görünüyor.
  tail: {
    position: "absolute",
    bottom: -Math.round(splashMetrics.bubbleTail / 2) + 2,
    width: splashMetrics.bubbleTail,
    height: splashMetrics.bubbleTail,
    borderRadius: 2,
    backgroundColor: splashColors.bubbleFill,
    transform: [{ rotate: "45deg" }],
  },
  tailLeft: {
    left: 14,
  },
  tailRight: {
    right: 14,
  },
  text: {
    fontFamily: fontFamily.nunitoSemiBold,
    ...splashType.bubble,
    color: splashColors.bubbleText,
  },
});
