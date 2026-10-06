import { createAudioPlayer } from "expo-audio";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";
import { trackError } from "@/lib/analytics";

import type { AudioPlayer } from "expo-audio";

/**
 * Arayüz ses efektleri (doğru/yanlış/kutlama...). Sesler örnek dosya değil,
 * `scripts/build-sfx.py` ile matematikle üretildi.
 *
 * Okuma ekranında ÇALINMAZ (Ürün İlkesi #1: okuma ekranı sessiz ve
 * dikkat dağıtmayan kalır). Kullanıcı Profil'den kapatabilir.
 */
const SOURCES = {
  correct: require("../../assets/sfx/correct.wav") as number,
  wrong: require("../../assets/sfx/wrong.wav") as number,
  tap: require("../../assets/sfx/tap.wav") as number,
  save: require("../../assets/sfx/save.wav") as number,
  complete: require("../../assets/sfx/complete.wav") as number,
} as const;

export type SfxName = keyof typeof SOURCES;

/** Sesler müzik değil, ipucu: kullanıcının kendi sesinin altında kalsın. */
const VOLUME = 0.6;

interface SfxState {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export const useSfxStore = create<SfxState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "sfx.settings", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Oynatıcılar tembel kurulup yeniden kullanılıyor: her çalışta yeni bir
// native oynatıcı açmak hem gecikme hem bellek sızıntısı demek.
const players = new Map<SfxName, AudioPlayer>();

export function playSfx(name: SfxName): void {
  if (!useSfxStore.getState().enabled) return;
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      player.volume = VOLUME;
      players.set(name, player);
    }
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch((error: unknown) => trackError("sfx.play", error, { name }));
  } catch (error) {
    trackError("sfx.play", error, { name });
  }
}
