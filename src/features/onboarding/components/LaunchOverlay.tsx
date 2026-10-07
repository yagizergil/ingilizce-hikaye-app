import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import Animated, { FadeOut } from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";

import { trackError } from "@/lib/analytics";
import { useLaunchStore } from "@/lib/launchState";

import { OnboardingSplashScreen } from "@/features/onboarding/components/OnboardingSplashScreen";

/** Splash en az bu kadar görünür (ürün sahibi kararı, 2026-10-07). */
const MIN_VISIBLE_MS = 2000;

// Sistem açılış görseli (gökyüzü sahnesi) JS katmanı çizilene kadar kalsın:
// aksi hâlde arada boş bir kare görünürdü.
SplashScreen.preventAutoHideAsync().catch((error: unknown) =>
  trackError("launch.preventAutoHide", error),
);

interface LaunchOverlayProps {
  /** Fontlar yüklendi (ya da hata verdi). */
  fontsReady: boolean;
}

/**
 * Her soğuk açılışta görünen asıl splash: gökyüzü + çayır, selam balonları
 * ve animasyonlu Lingo logosu. Uygulamanın ÜSTÜNDE bir katman; altında
 * oturum, onboarding durumu ve ilk veriler yüklenir.
 *
 * Eskiden açılışta küçük bir logo, ardından dönen bir yükleniyor simgesi
 * vardı (kullanıcı bulgusu). Artık katman ancak en az 2 sn geçmiş VE her şey
 * hazırsa solarak kapanıyor; veri gecikirse bekliyor.
 */
export function LaunchOverlay({ fontsReady }: LaunchOverlayProps) {
  const authReady = useLaunchStore((state) => state.auth);
  const onboardingReady = useLaunchStore((state) => state.onboarding);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = fontsReady && authReady && onboardingReady && minElapsed;
  // Hazır olunca katman ağaçtan çıkar; `exiting` animasyonu solarak kapatır.
  if (ready) return null;

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      exiting={FadeOut.duration(320)}
      onLayout={() => {
        SplashScreen.hideAsync().catch((error: unknown) => trackError("launch.hide", error));
      }}
    >
      {/* `onDone` bilerek boş: kapanış kararı yukarıdaki hazır olma kuralında. */}
      <OnboardingSplashScreen onDone={noop} />
    </Animated.View>
  );
}

function noop(): void {
  // Splash'in kendi zamanlayıcısı burada bir şey yapmaz.
}
