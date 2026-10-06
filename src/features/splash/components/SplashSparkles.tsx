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

import { splashColors } from "@/theme";

import { SPLASH_TIMING } from "@/features/splash/splashTimeline";

/** Işınların gözden uzaklığı (kutu genişliğinin oranı). */
const RAY_DISTANCE = 0.3;

interface RayProps {
  width: number;
  height: number;
  eye: { x: number; y: number };
  angle: number;
  delay: number;
}

function Ray({ width, height, eye, angle, delay }: RayProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSequence(
        withSpring(1, { damping: 8, stiffness: 180 }),
        withDelay(
          SPLASH_TIMING.sparklesHold,
          withTiming(0, { duration: SPLASH_TIMING.sparklesFade }),
        ),
      ),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ rotate: `${angle}deg` }, { scale: progress.value }],
  }));

  const length = width * 0.1;
  const thickness = width * 0.03;
  const radians = (angle * Math.PI) / 180;
  const centerX = width * eye.x + width * RAY_DISTANCE * Math.cos(radians);
  const centerY = height * eye.y + width * RAY_DISTANCE * Math.sin(radians);

  return (
    <Animated.View
      style={[
        styles.ray,
        {
          width: length,
          height: thickness,
          borderRadius: thickness / 2,
          left: centerX - length / 2,
          top: centerY - thickness / 2,
        },
        style,
      ]}
    />
  );
}

interface SplashSparklesProps {
  /** Papağan kutusunun ölçüleri; ışınlar buna göre yerleşiyor. */
  width: number;
  height: number;
  /** Göz kırpan gözün kutuya göre konumu (0-1) ve ışın açıları (derece). */
  eye: { x: number; y: number };
  angles: readonly number[];
}

/** Göz kırpma anında gözün çevresinde çıkan üç turuncu çizgi. Üst
 * bileşen bunu göz kırpma anına kadar BAĞLAMIYOR; bağlandığı an başlar. */
export function SplashSparkles({ width, height, eye, angles }: SplashSparklesProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {angles.map((angle, index) => (
        <Ray key={angle} width={width} height={height} eye={eye} angle={angle} delay={index * 90} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ray: {
    position: "absolute",
    backgroundColor: splashColors.sparkle,
  },
});
