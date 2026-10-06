import { create } from "zustand";

interface ActiveWordState {
  /** Dokunulan ve sözlük kartı açık olan kelimenin `ttsPlan.wordKey`i. */
  key: string | null;
  setKey: (key: string | null) => void;
}

/**
 * Sözlük kartı açıkken dokunulan kelimenin metindeki yumuşak turuncu
 * vurgusu. Zustand: her kelime kendi seçicisiyle abone, yani kart
 * açılınca yalnızca iki kelime yeniden render ediliyor (bkz. ReaderWord).
 */
export const useActiveWordStore = create<ActiveWordState>()((set) => ({
  key: null,
  setKey: (key) => set({ key }),
}));
