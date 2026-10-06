import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { fontFamily, splashColors, splashType } from "@/theme";

import { SPLASH_TIMING, WORDMARK_LETTER_COLORS } from "@/features/splash/splashTimeline";

interface SplashWordmarkProps {
  /** Marka adı; `app.name` çevirisinden geliyor. */
  word: string;
  /** Hareketi azalt açıksa harfler hiç düşmeden, yerinde başlar. */
  reduceMotion: boolean;
}

interface LetterProps {
  char: string;
  color: string;
  delay: number;
  reduceMotion: boolean;
}

/** Tek harf: aşağıdan, hafif küçük başlar, yaylanarak oturur (yay aşımı
 * 1'i geçtiği için harf yerine biraz sıçrayıp iner -- referanstaki "F"nin
 * düşüşü). */
function Letter({ char, color, delay, reduceMotion }: LetterProps) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      // Ayar sonradan açıldıysa devam eden animasyonu kesip yerine koy.
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 150, mass: 0.8 }));
  }, [delay, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ translateY: (1 - progress.value) * 34 }, { scale: 0.55 + 0.45 * progress.value }],
  }));

  return <Animated.Text style={[styles.letter, { color }, style]}>{char}</Animated.Text>;
}

export function SplashWordmark({ word, reduceMotion }: SplashWordmarkProps) {
  const letters = Array.from(word);

  return (
    <View accessible accessibilityRole="header" accessibilityLabel={word} style={styles.row}>
      {letters.map((char, index) => (
        <Letter
          key={`${char}-${index}`}
          char={char}
          color={
            WORDMARK_LETTER_COLORS[index % WORDMARK_LETTER_COLORS.length] ?? splashColors.letterPlum
          }
          delay={SPLASH_TIMING.wordmarkStart + index * SPLASH_TIMING.letterStagger}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  letter: {
    fontFamily: fontFamily.nunitoExtraBold,
    ...splashType.wordmark,
    textShadowColor: splashColors.letterGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
