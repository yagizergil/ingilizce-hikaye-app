import { useEffect } from "react";

import { create } from "zustand";

interface DialogGuardState {
  /** Şu an açık diyalog/sheet sayısı. */
  openCount: number;
  open: () => void;
  close: () => void;
}

/**
 * "Başka bir diyalog açıkken kendiliğinden teklif açma" koruması
 * (IZLENECEK-YOL T3; Beelinguapp `j4()` deseni).
 *
 * Kural motoru (`features/offers`) bir kural seçmeden önce buna bakıyor;
 * sayaç sıfırdan büyükse hiçbir kural seçilmiyor ve çağıran sonra yeniden
 * deniyor. Feature'lar arası doğrudan import olmasın diye paylaşılan
 * katmanda. Kendiliğinden açılan bir teklifin üstüne binebilecek her
 * sheet/diyalog `useRegisterDialog(visible)` ile kaydolmalı.
 */
export const useDialogGuardStore = create<DialogGuardState>()((set) => ({
  openCount: 0,
  open: () => set((state) => ({ openCount: state.openCount + 1 })),
  close: () => set((state) => ({ openCount: Math.max(0, state.openCount - 1) })),
}));

/** `visible` true olduğu sürece diyaloğu açık sayar. */
export function useRegisterDialog(visible: boolean): void {
  useEffect(() => {
    if (!visible) return;
    const { open, close } = useDialogGuardStore.getState();
    open();
    return close;
  }, [visible]);
}
