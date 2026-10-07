import { create } from "zustand";

/**
 * Açılışın hazır olma durumu (2026-10-07). Açılış splash'i (`LaunchOverlay`)
 * yalnızca bunların hepsi hazır ve en az 2 saniye geçtiyse kapanır; araya
 * dönen bir yükleniyor simgesi girmez.
 *
 * - `auth`: anonim/kalıcı oturum kuruldu (AuthGate).
 * - `onboarding`: onboarding durumu çözüldü (OnboardingGate).
 */
interface LaunchState {
  auth: boolean;
  onboarding: boolean;
  markReady: (key: "auth" | "onboarding") => void;
}

export const useLaunchStore = create<LaunchState>()((set) => ({
  auth: false,
  onboarding: false,
  markReady: (key) => set((state) => (state[key] ? state : { ...state, [key]: true })),
}));
