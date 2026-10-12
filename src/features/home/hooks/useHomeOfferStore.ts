import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";

interface HomeOfferState {
  lastShownAt: number | null;
  /** Bu oturumda kart görünüyor mu (kalıcı DEĞİL). */
  sessionVisible: boolean;
  show: (at: number) => void;
  hide: (at: number) => void;
}

/** Ana sayfa teklif kartının sıklık durumu (yerel, kullanıcı başına). */
export const useHomeOfferStore = create<HomeOfferState>()(
  persist(
    (set) => ({
      lastShownAt: null,
      sessionVisible: false,
      show: (at) => set({ lastShownAt: at, sessionVisible: true }),
      hide: (at) => set({ lastShownAt: at, sessionVisible: false }),
    }),
    {
      name: "home.offer",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastShownAt: state.lastShownAt }),
    },
  ),
);
