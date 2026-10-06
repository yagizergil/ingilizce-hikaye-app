import { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  fontFamily,
  onboardingIntroColors,
  onboardingIntroMetrics,
  onboardingIntroType,
  spacing,
} from "@/theme";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/**
 * Onboarding tanıtımı: üç kaydırmalı sayfa. Üstte illüstrasyon (sabit
 * karakter + maskot Lumi), altta koyu yeşil zeminde başlık, alt başlık,
 * sayfa noktaları ve tek beyaz düğme. Referans: Funfluent onboarding
 * (yalnızca düzen; görseller bize ait, `assets/onboarding/intro-*.jpg`).
 *
 * Bilerek animasyonsuz: sayfa geçişi kullanıcının kendi kaydırması.
 * "Hesabım var" düğmesi YOK -- uygulamada hesap oluşturma yok (cihaza bağlı
 * anonim hesap).
 */
const SLIDES = [
  { key: "adventure", image: require("../../../../assets/onboarding/intro-1.jpg") as number },
  { key: "skills", image: require("../../../../assets/onboarding/intro-2.jpg") as number },
  { key: "stories", image: require("../../../../assets/onboarding/intro-3.jpg") as number },
] as const;

/** Görsellerin en/boy oranı (1290 x 1601). */
const IMAGE_ASPECT = 1601 / 1290;

interface OnboardingIntroCarouselProps {
  onDone: () => void;
}

export function OnboardingIntroCarousel({ onDone }: OnboardingIntroCarouselProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);

  // Kısa ekranda görsel üstten kırpılır; alttaki dalgalı geçiş hep görünür.
  const sceneHeight = Math.min(width * IMAGE_ASPECT, height * onboardingIntroMetrics.sceneRatio);
  const isLast = index === SLIDES.length - 1;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [index, width],
  );

  const handlePrimary = () => {
    if (isLast) {
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <View style={[styles.scene, { width, height: sceneHeight }]}>
              <Image
                source={item.image}
                style={{ width, height: width * IMAGE_ASPECT }}
                contentFit="cover"
                contentPosition="bottom"
                accessible={false}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{t(`onboarding.intro.${item.key}.title`)}</Text>
              <Text style={styles.subtitle}>{t(`onboarding.intro.${item.key}.body`)}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
            />
          ))}
        </View>
        <Pressable
          onPress={handlePrimary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
        >
          <Text style={styles.buttonText}>
            {t(isLast ? "onboarding.intro.start" : "onboarding.intro.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: onboardingIntroColors.bg,
  },
  scene: {
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  copy: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  title: {
    ...onboardingIntroType.title,
    fontFamily: fontFamily.gabaritoBold,
    color: onboardingIntroColors.title,
    textAlign: "center",
  },
  subtitle: {
    ...onboardingIntroType.subtitle,
    fontFamily: fontFamily.gabaritoRegular,
    color: onboardingIntroColors.subtitle,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: onboardingIntroMetrics.dotGap,
  },
  dot: {
    height: onboardingIntroMetrics.dot,
    borderRadius: onboardingIntroMetrics.dot / 2,
  },
  dotActive: {
    width: onboardingIntroMetrics.dot * 3,
    backgroundColor: onboardingIntroColors.dotActive,
  },
  dotIdle: {
    width: onboardingIntroMetrics.dot,
    backgroundColor: onboardingIntroColors.dotIdle,
  },
  button: {
    height: onboardingIntroMetrics.buttonHeight,
    borderRadius: onboardingIntroMetrics.buttonHeight / 2,
    backgroundColor: onboardingIntroColors.buttonFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...onboardingIntroType.button,
    fontFamily: fontFamily.gabaritoBold,
    color: onboardingIntroColors.buttonText,
  },
});
