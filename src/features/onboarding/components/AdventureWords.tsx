import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { fontFamily, onboardingIntroType, splashColors, splashMetrics } from "@/theme";

import { ADVENTURE_ASPECT } from "@/features/onboarding/adventureAssets";
import {
  ADVENTURE_WORDS,
  BOOK,
  WORD_HEIGHT,
  placeWord,
  sceneToBox,
  type AdventureWord,
} from "@/features/onboarding/adventureLayout";

/** Bir kelimenin tam turu (ms): çık -> süzül -> bekle -> sön. */
const CYCLE = 7200;
/** Kelimeler arası başlangıç aralığı (ms); turlar üst üste biner, hep birkaçı görünür. */
const STAGGER = 1100;
const SLOT_WIDTH = 160;

interface WordProps {
  word: AdventureWord;
  index: number;
  boxWidth: number;
  boxHeight: number;
}

function Word({ word, index, boxWidth, boxHeight }: WordProps) {
  const progress = useSharedValue(0);
  const target = placeWord(word, boxWidth, boxHeight, ADVENTURE_ASPECT);
  const book = sceneToBox(BOOK.x, BOOK.y, boxWidth, boxHeight, ADVENTURE_ASPECT);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER,
      withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.linear }), -1, false),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 0-0.05 kitabın üstünde belirir, 0.05-0.30 yaylanarak yerine süzülür,
    // 0.30-0.80 hafifçe sallanarak bekler, 0.80-0.95 yukarı süzülüp söner.
    const fly = interpolate(p, [0.05, 0.3], [0, 1], "clamp");
    const eased = 1 - (1 - fly) * (1 - fly) * (1 - fly);
    const bob = Math.sin(p * Math.PI * 6) * 3 * interpolate(p, [0.3, 0.4], [0, 1], "clamp");
    const lift = interpolate(p, [0.8, 0.95], [0, -14], "clamp");
    const opacity = interpolate(p, [0, 0.05, 0.8, 0.95], [0, 1, 1, 0], "clamp");
    return {
      opacity,
      transform: [
        { translateX: (book.x - target.x) * (1 - eased) },
        { translateY: (book.y - target.y) * (1 - eased) + bob + lift },
        { scale: interpolate(p, [0, 0.05, 0.3], [0.3, 0.55, 1], "clamp") },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.slot, { left: target.x - SLOT_WIDTH / 2, top: target.y - WORD_HEIGHT / 2 }]}
    >
      <Animated.View style={[styles.bubble, style]}>
        <Text style={styles.text}>{word.text}</Text>
      </Animated.View>
    </View>
  );
}

interface AdventureWordsProps {
  boxWidth: number;
  boxHeight: number;
}

/**
 * Kitaptan çıkıp karakterin boş kalan yanlarına süzülen selam balonları.
 * Videodaki harfler küçük ve soluktu; yazıyı video modeli okunur üretemiyor,
 * bu yüzden net bir katman olarak uygulamada çiziliyor. Hareket açıkken
 * (hareketi azalt kapalı) bağlanır.
 */
export function AdventureWords({ boxWidth, boxHeight }: AdventureWordsProps) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      {ADVENTURE_WORDS.map((word, index) => (
        <Word key={word.text} word={word} index={index} boxWidth={boxWidth} boxHeight={boxHeight} />
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
    width: SLOT_WIDTH,
    height: WORD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    height: WORD_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: splashMetrics.bubblePaddingH,
    borderRadius: splashMetrics.bubbleRadius,
    backgroundColor: splashColors.bubbleFill,
    shadowColor: splashColors.bubbleShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  text: {
    fontFamily: fontFamily.nunitoExtraBold,
    ...onboardingIntroType.word,
    color: splashColors.bubbleText,
  },
});
