import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";

interface ActivationState {
  /**
   * Kullanıcının bu cihazda ilk bölümü bitirdiği an (1.1.0). Okuyucu yazıyor,
   * ana sayfa teklif kartı okuyor: kart ancak kullanıcı değeri yaşadıktan
   * SONRA çıkıyor (rakip analizi, 2026-10-12). Feature'lar arası doğrudan
   * import olmasın diye paylaşılan katmanda.
   */
  firstChapterFinishedAt: number | null;
  markChapterFinished: (at: number) => void;
}

export const useActivationStore = create<ActivationState>()(
  persist(
    (set, get) => ({
      firstChapterFinishedAt: null,
      markChapterFinished: (at) => {
        if (get().firstChapterFinishedAt === null) set({ firstChapterFinishedAt: at });
      },
    }),
    { name: "activation.state", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
