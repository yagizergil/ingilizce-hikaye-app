import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";

import type { LifecycleStatus } from "@/features/subscription/lifecycle";

interface LifecycleMemoryState {
  billingFixShownAt: number | null;
  winbackShownFor: string[];
  /** Son görülen durum: "ödeme düzeldi" geçişini yakalamak için. */
  lastStatus: LifecycleStatus | null;
  /** Bu oturumda otomatik açılış kararı verildi mi (kalıcı DEĞİL). */
  decidedThisSession: boolean;
  markBillingFixShown: (at: number) => void;
  markWinbackShown: (key: string) => void;
  setLastStatus: (status: LifecycleStatus) => void;
  markDecided: () => void;
}

/** Kendiliğinden açılan abonelik ekranlarının sıklık hafızası (yerel). */
export const useLifecycleMemoryStore = create<LifecycleMemoryState>()(
  persist(
    (set) => ({
      billingFixShownAt: null,
      winbackShownFor: [],
      lastStatus: null,
      decidedThisSession: false,
      markBillingFixShown: (at) => set({ billingFixShownAt: at }),
      // Son 10 bitiş yeter; liste sınırsız büyümesin.
      markWinbackShown: (key) =>
        set((state) => ({ winbackShownFor: [...state.winbackShownFor, key].slice(-10) })),
      setLastStatus: (status) => set({ lastStatus: status }),
      markDecided: () => set({ decidedThisSession: true }),
    }),
    {
      name: "subscription.lifecycle",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        billingFixShownAt: state.billingFixShownAt,
        winbackShownFor: state.winbackShownFor,
        lastStatus: state.lastStatus,
      }),
    },
  ),
);
