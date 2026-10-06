import { useCallback, useEffect, useRef, useState } from "react";

import storage from "@/lib/storage";
import { trackError } from "@/lib/analytics";
import { DEVTOOLS_TAP_COUNT, nextTapState, type TapState } from "@/features/profile/devToolsTaps";

const STORAGE_KEY = "devtools.unlocked";
/**
 * Üretim derlemesinde geliştirici araçlarını gizli tutar: profil
 * ekranındaki sürüm yazısına ardışık 7 kez dokununca açılır ve cihazda
 * kalıcı olur. Kullanıcıya görünen bir "Development" düğmesi App Store'daki
 * sürümde yer almamalı; ama TestFlight'ta ürün sahibi bu araçlara erişebilmeli.
 */
export function useDevToolsUnlock() {
  const [unlocked, setUnlocked] = useState(false);
  const taps = useRef<TapState>({ count: 0, last: 0 });

  useEffect(() => {
    let mounted = true;
    storage
      .getItem(STORAGE_KEY)
      .then((value) => {
        if (mounted) setUnlocked(value === "1");
      })
      .catch((error: unknown) => trackError("profile.devtools.read", error));
    return () => {
      mounted = false;
    };
  }, []);

  /** Bir dokunuşu kaydeder; ARAÇLAR BU DOKUNUŞLA AÇILDIYSA `true` döner. */
  const registerTap = useCallback((): boolean => {
    if (unlocked) return false;
    taps.current = nextTapState(taps.current, Date.now());
    if (taps.current.count < DEVTOOLS_TAP_COUNT) return false;

    setUnlocked(true);
    storage
      .setItem(STORAGE_KEY, "1")
      .catch((error: unknown) => trackError("profile.devtools.write", error));
    return true;
  }, [unlocked]);

  return { unlocked, registerTap };
}
