import { create } from "zustand";

export type ReaderMode = "read" | "listen";

interface ReaderModeState {
  mode: ReaderMode;
  setMode: (mode: ReaderMode) => void;
}

/**
 * Okuma ekranının iki yüzü: "oku" (beyaz sayfa) ve "dinle" (kahverengi
 * zemin, kısa metin + ses kontrolleri). Geçici UI durumu; kalıcı değil.
 */
export const useReaderModeStore = create<ReaderModeState>()((set) => ({
  mode: "read",
  setMode: (mode) => set({ mode }),
}));
