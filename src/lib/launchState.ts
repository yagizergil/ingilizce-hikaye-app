import { create } from "zustand";

import type { LaunchFailureKind } from "@/lib/launchFailure";

/**
 * Açılışın hazır olma durumu (2026-10-07). Açılış splash'i (`LaunchOverlay`)
 * yalnızca bunların hepsi hazır ve en az 2 saniye geçtiyse kapanır; araya
 * dönen bir yükleniyor simgesi girmez.
 *
 * - `auth`: anonim/kalıcı oturum kuruldu (AuthGate).
 * - `onboarding`: onboarding durumu çözüldü (OnboardingGate).
 * - `failure`: bir kapı açılışın sürdürülemeyeceğini bildirdi (ör. ilk
 *   açılışta internet yok, oturum açılamadı). Splash hata durumuna geçer.
 * - `attempt`: "Tekrar dene" her basıldığında artar; kapılar buna bakarak
 *   kurulumu baştan çalıştırır.
 */
interface LaunchState {
  auth: boolean;
  onboarding: boolean;
  failure: LaunchFailureKind | null;
  attempt: number;
  markReady: (key: "auth" | "onboarding") => void;
  fail: (kind: LaunchFailureKind) => void;
  retry: () => void;
}

export const useLaunchStore = create<LaunchState>()((set) => ({
  auth: false,
  onboarding: false,
  failure: null,
  attempt: 0,
  markReady: (key) => set((state) => (state[key] ? state : { ...state, [key]: true })),
  fail: (kind) => set((state) => (state.failure === kind ? state : { ...state, failure: kind })),
  retry: () =>
    set((state) => ({
      ...state,
      auth: false,
      onboarding: false,
      failure: null,
      attempt: state.attempt + 1,
    })),
}));
