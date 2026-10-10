import { useEffect, useState } from "react";
import { AppState, StyleSheet } from "react-native";

import Animated, { FadeOut } from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";

import { trackError } from "@/lib/analytics";
import { useLaunchStore } from "@/lib/launchState";
import {
  isEnvironmentOffline,
  LAUNCH_AUTO_RETRY_MS,
  LAUNCH_TOTAL_TIMEOUT_MS,
  resolveLaunchError,
} from "@/lib/launchFailure";

import { OnboardingSplashScreen } from "@/features/onboarding/components/OnboardingSplashScreen";
import { LaunchErrorPanel } from "@/features/onboarding/components/LaunchErrorPanel";

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
  const failure = useLaunchStore((state) => state.failure);
  const attempt = useLaunchStore((state) => state.attempt);
  const retry = useLaunchStore((state) => state.retry);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOutAttempt, setTimedOutAttempt] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Açılış yolunda koşulsuz kapı yok: her deneme en çok bu kadar bekler.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOutAttempt(attempt), LAUNCH_TOTAL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const ready = fontsReady && authReady && onboardingReady && minElapsed;
  const errorKind = resolveLaunchError({
    ready,
    elapsedMs: timedOutAttempt === attempt ? LAUNCH_TOTAL_TIMEOUT_MS : 0,
    failure: failure ?? (!ready && isEnvironmentOffline() && minElapsed ? "offline" : null),
  });

  // Hata kartı bir kez göründükten sonra yeniden denemeler sürerken de
  // kalıyor (her denemede kaybolup geri gelmesi titreme gibi görünürdü).
  const [shownKind, setShownKind] = useState<typeof errorKind>(null);
  if (errorKind && errorKind !== shownKind) setShownKind(errorKind);
  const displayedKind = ready ? null : (errorKind ?? shownKind);

  // Bu denemenin hatası belli olduktan sonra bağlantı gelince kendiliğinden yeniden dene:
  // periyodik olarak ve uygulama ön plana döndüğünde.
  useEffect(() => {
    if (!errorKind) return;
    const timer = setInterval(retry, LAUNCH_AUTO_RETRY_MS);
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") retry();
    });
    const onOnline = () => retry();
    const target = globalThis as { addEventListener?: (t: string, f: () => void) => void };
    const untarget = globalThis as { removeEventListener?: (t: string, f: () => void) => void };
    target.addEventListener?.("online", onOnline);
    return () => {
      clearInterval(timer);
      sub.remove();
      untarget.removeEventListener?.("online", onOnline);
    };
  }, [errorKind, retry]);

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
      {displayedKind ? (
        <LaunchErrorPanel kind={displayedKind} retrying={!errorKind} onRetry={retry} />
      ) : null}
    </Animated.View>
  );
}

function noop(): void {
  // Splash'in kendi zamanlayıcısı burada bir şey yapmaz.
}
