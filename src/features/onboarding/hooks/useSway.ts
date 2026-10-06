import { useEffect } from "react";

import { Easing, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";

/**
 * 0 ile 1 arasında gidip gelen, sinüs yumuşatmalı sonsuz salınım. Yumuşak
 * (ease-in-out) uçlar el çizimi animasyondaki "yavaşlayıp dönme" hissini verir.
 * `enabled` kapalıysa (hareketi azalt) değer 0'da durur.
 */
export function useSway(duration: number, delay = 0, enabled = true) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      t.value = 0;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [delay, duration, enabled, t]);

  return t;
}
