import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { detailColors } from "@/theme";

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

interface SlideUpModalProps {
  visible: boolean;
  onClose: () => void;
  /** Panelin kendi stili (zemin, köşe yarıçapı, iç boşluk). */
  sheetStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Açılış: panel hafif yavaşlayarak oturur, arka plan aynı anda belirir. */
const OPEN_MS = 280;
/** Kapanış açılıştan kısa: kullanıcı kapatmak istediğinde beklemesin. */
const CLOSE_MS = 200;
/** Panel yüksekliği ölçülmeden önce ekran dışı başlangıç konumu. */
const OFFSCREEN = 900;

/**
 * Aşağıdan açılan panel (bottom sheet) -- arka plan SOLARAK, panel KAYARAK.
 *
 * NEDEN (2026-10-05, kullanıcı bulgusu): kelime kartı ve okuyucu menüsü
 * `Modal animationType="slide"` kullanıyordu. O animasyon modalın TAMAMINI
 * kaydırıyor; yarı saydam gri arka plan da panelle birlikte aşağıdan
 * yukarı sürünerek geliyordu. iOS'un kendi sheet'lerinde ve bütün yaygın
 * tasarım sistemlerinde arka plan yerinde belirir (opaklık), yalnızca panel
 * hareket eder. Bu bileşen tam olarak bunu yapıyor; animasyonlar UI iş
 * parçacığında (Reanimated).
 *
 * Kapanış animasyonu süresince içerik çizilmeye devam ediyor; çağıran,
 * kapanırken içeriğini boşaltmamalı (bkz. WordSheet'teki `shownWord`).
 */
export function SlideUpModal({ visible, onClose, sheetStyle, children }: SlideUpModalProps) {
  const [mounted, setMounted] = useState(visible);
  const backdrop = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN);
  const sheetHeight = useRef(OFFSCREEN);

  // Açılırken modal hemen bağlanır (render sırasında türetilen durum);
  // kapanırken animasyon bitince sökülür (aşağıdaki effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    backdrop.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) });
    translateY.value = withTiming(
      sheetHeight.current,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [visible, backdrop, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="none" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, sheetStyle, sheetAnimatedStyle]}
        onLayout={(event) => {
          sheetHeight.current = event.nativeEvent.layout.height;
        }}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: detailColors.scrim,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
