import { useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Image } from "expo-image";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { NavigationContext } from "expo-router/build/react-navigation/core";

import spriteMeta from "../../../assets/anim/_meta.json";

import type { StyleProp, ViewStyle } from "react-native";

/**
 * Maskotun ekran başına özel animasyonları -- SPRITE SAYFASI, animasyonlu
 * WebP değil.
 *
 * NEDEN (2026-10-05, kullanıcı bulgusu: "sekme değişince kasıyor, donuyor,
 * animasyonlar 15 fps gibi"): eski sürüm 120 karelik, saniyede 12 karelik
 * animasyonlu WebP'lerdi ve açılışta HEPSİ belleğe çözülüyordu
 * (`preloadMascots`). Bir animasyonun çözülmüş kareleri ~100 MB ediyordu;
 * dokuzu birden bellek baskısı ve donma demekti, kare hızı da düşüktü.
 *
 * Şimdi: Higgsfield Kling 3.0 Pro videosunun (1440 px, temiz çizilmiş
 * anahtar kareden) 24 fps'lik 48 gerçek karesi tek bir WebP ızgarasında
 * (`assets/anim/mascot-*.webp`, üretim betiği scripts/build-mascot-sprites.py). Görsel bir kez çözülüyor; oynatma
 * Reanimated ile UI iş parçacığında yalnızca bir kaydırma (translate) --
 * JS iş parçacığı ve React render'ı hiç karışmıyor, bu yüzden sekme geçişi
 * veya liste kaydırması animasyonu takıltmıyor. Kareler ileri-geri
 * oynatılıyor (2 sn hareket = 4 sn kesintisiz döngü).
 *
 * Ekran odakta değilken (arka plandaki sekme) ve "hareketi azalt" açıkken
 * animasyon durur; ilk kare gösterilir.
 */
const FPS = 24;

interface SpriteEntry {
  source: number;
  /** Bir hücrenin piksel ölçüsü (kare + şeffaf kenar boşluğu). */
  w: number;
  h: number;
  cols: number;
  rows: number;
  frames: number;
}

type SpriteMeta = Omit<SpriteEntry, "source">;

/**
 * Ölçüler üretim betiğinin yazdığı _meta.json'dan (scripts/build-mascot-sprites.py);
 * sprite yeniden üretildiğinde burada elle sayı değiştirmek gerekmiyor.
 */
const META = spriteMeta as Record<string, SpriteMeta>;

function sprite(name: string, source: number): SpriteEntry {
  const meta = META[name];
  if (!meta) throw new Error(`mascot sprite meta missing: ${name}`);
  return { source, ...meta };
}

const ANIMATIONS = {
  /** Kanatlarını çırpıp el sallayan karşılama (ana sayfa, kategoriler). */
  home: sprite("home", require("../../../assets/anim/mascot-home.webp") as number),
  /** Büyüteçle bakınan (Ara, göz at, dil ayarları). */
  search: sprite("search", require("../../../assets/anim/mascot-search.webp") as number),
  /** Kitap okuyup sayfa çeviren (yükleniyor). */
  loading: sprite("loading", require("../../../assets/anim/mascot-loading.webp") as number),
  /** Sırada quiz çözen (Quiz). */
  quiz: sprite("quiz", require("../../../assets/anim/mascot-quiz.webp") as number),
  /** El sallayan, gururlu (Profil, istatistik). */
  profile: sprite("profile", require("../../../assets/anim/mascot-profile.webp") as number),
  /** Kelime kartlarını gösteren (Kelime tekrarı). */
  words: sprite("words", require("../../../assets/anim/mascot-words.webp") as number),
  /** Kitap yığınına sarılan (Kitabım, boş durumlar). */
  books: sprite("books", require("../../../assets/anim/mascot-books.webp") as number),
  /** Taçlı (paywall, premium kartı). */
  crown: sprite("crown", require("../../../assets/anim/mascot-crown.webp") as number),
  /** Parti şapkalı kutlama (kitap/bölüm bitti). */
  party: sprite("party", require("../../../assets/anim/mascot-party.webp") as number),
} as const;

export type MascotAnimName = keyof typeof ANIMATIONS;

interface MascotAnimProps {
  name: MascotAnimName;
  /** Sığdırma kutusu (pt): maskotun UZUN kenarı bu değere eşitlenir. */
  width: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bulunduğu ekran odakta mı. Navigasyon bağlamı yoksa (ör. kökteki
 * BottomSheetModal portalı) her zaman "odakta" sayılır.
 */
function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) return undefined;
    const offFocus = navigation.addListener("focus", () => setFocused(true));
    const offBlur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return focused;
}

export function MascotAnim({ name, width: box, style }: MascotAnimProps) {
  const entry = ANIMATIONS[name];
  // `width` bir SIĞDIRMA KUTUSU: maskotun uzun kenarı ona eşitlenir. Pozların
  // en-boy oranı farklı (arama/quiz dikey, ana sayfa yatay); yalnızca
  // genişliği sabitlemek dikey pozları %35+ uzatıyor ve Ara başlığında maskot
  // dev görünüyordu (kullanıcı bulgusu, 2026-10-06).
  const scale = box / Math.max(entry.w, entry.h);
  const width = entry.w * scale;
  const height = entry.h * scale;
  const cycle = entry.frames * 2 - 2;

  const focused = useScreenFocused();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!focused || reducedMotion) {
      cancelAnimation(progress);
      return undefined;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(cycle, { duration: (cycle * 1000) / FPS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [focused, reducedMotion, cycle, progress]);

  const { frames, cols } = entry;
  const sheetStyle = useAnimatedStyle(() => {
    const step = Math.min(Math.floor(progress.value), cycle - 1);
    const index = step < frames ? step : cycle - step;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      transform: [{ translateX: -col * width }, { translateY: -row * height }],
    };
  });

  return (
    <View
      // Ölçü HER ZAMAN en sonda: çağıranın stilindeki bir `height`/`width`
      // pencereyi büyütüp komşu karenin (alttaki papağanın ibiği) görünmesine
      // yol açıyordu -- ana sayfa ve Ara başlığında tam olarak bu oldu.
      style={[styles.frame, style, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {/* Görsel yalnızca ekran odaktayken bağlı: sekmeler arka planda bağlı
          kaldığı için aksi hâlde beş ekranın sprite sayfası (her biri ~40 MB
          çözülmüş) aynı anda bellekte dururdu. */}
      {focused ? (
        <Animated.View style={[{ width: width * cols, height: height * entry.rows }, sheetStyle]}>
          <Image
            source={entry.source}
            style={styles.fill}
            contentFit="fill"
            transition={0}
            cachePolicy="disk"
            priority="high"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    height: "100%",
  },
});
