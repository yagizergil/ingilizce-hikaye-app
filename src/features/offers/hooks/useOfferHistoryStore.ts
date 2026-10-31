import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";

import type { Presentation, RuleHistory } from "@/features/offers/types";

interface OfferHistoryState {
  /** Kural başına gösterim (kalıcı; sunucu geçmişiyle birleştirilir). */
  history: Record<string, RuleHistory>;
  lastFullscreenAt: number | null;
  lastSaleAt: number | null;
  /** Bu oturumda tam ekran bir kural gösterildi mi (kalıcı DEĞİL). */
  fullscreenShownThisSession: boolean;
  /** Sunucudaki gösterim satırı (sonucu yazmak için; kalıcı DEĞİL). */
  impressionIds: Record<string, number>;
  markShown: (input: {
    ruleId: string;
    presentation: Presentation;
    actionKind: string;
    exemptGlobalCooldown: boolean;
    at: number;
  }) => void;
  setImpressionId: (ruleId: string, id: number) => void;
}

/**
 * Kural motorunun yerel gösterim geçmişi.
 *
 * NEDEN SUNUCUDAKİNE EK OLARAK: gösterim sunucuya yazılamadığında (uçakta
 * okuyan kullanıcı) sıklık sınırı yine de tutulmalı; aksi hâlde aynı teklif
 * her açılışta yeniden çıkardı. İki kaynak `mergeHistory` ile birleşiyor.
 */
export const useOfferHistoryStore = create<OfferHistoryState>()(
  persist(
    (set) => ({
      history: {},
      lastFullscreenAt: null,
      lastSaleAt: null,
      fullscreenShownThisSession: false,
      impressionIds: {},
      markShown: ({ ruleId, presentation, actionKind, exemptGlobalCooldown, at }) =>
        set((state) => {
          const previous = state.history[ruleId] ?? { shows: 0, lastShownAt: null };
          const countsAsFullscreen = presentation === "fullscreen" && !exemptGlobalCooldown;
          return {
            history: { ...state.history, [ruleId]: { shows: previous.shows + 1, lastShownAt: at } },
            lastFullscreenAt: presentation === "fullscreen" ? at : state.lastFullscreenAt,
            lastSaleAt: actionKind === "sale" ? at : state.lastSaleAt,
            fullscreenShownThisSession: state.fullscreenShownThisSession || countsAsFullscreen,
          };
        }),
      setImpressionId: (ruleId, id) =>
        set((state) => ({ impressionIds: { ...state.impressionIds, [ruleId]: id } })),
    }),
    {
      name: "offers.history",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
        lastFullscreenAt: state.lastFullscreenAt,
        lastSaleAt: state.lastSaleAt,
      }),
    },
  ),
);
