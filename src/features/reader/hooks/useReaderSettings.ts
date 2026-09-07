import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@/lib/storage";
import { readerFontScale, readerLineHeightScale } from "@/theme";
import type { ReaderSettings } from "@/features/reader/types";

// Page-transition duration matching pagerRuntime.js/buildReaderHtml.ts's
// `pageTransitionMs` config value. Kept as a single fixed default with no
// settings-sheet control: the product mockup for the reading settings sheet
// has no "sayfa geçiş animasyonu" toggle, and "basitlik önce gelir" (CLAUDE.md)
// argues against adding user-facing surface area for a value nobody asked to
// tune. If a real need for user control shows up later, add a UI control here
// rather than guessing one in now.
const DEFAULT_PAGE_TRANSITION_MS = 280;

const defaultSettings: ReaderSettings = {
  fontScale: readerFontScale.default,
  lineHeightScale: readerLineHeightScale.default,
  fontFamily: "serif",
  marginScale: 1,
  pageTransitionMs: DEFAULT_PAGE_TRANSITION_MS,
  highlightsEnabled: true,
};

interface ReaderSettingsState extends ReaderSettings {
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  setLineHeightScale: (value: number) => void;
  setFontFamily: (value: ReaderSettings["fontFamily"]) => void;
  setMarginScale: (value: number) => void;
  toggleHighlights: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      increaseFontScale: () =>
        set((state) => ({
          fontScale: clamp(
            state.fontScale + readerFontScale.step,
            readerFontScale.min,
            readerFontScale.max,
          ),
        })),
      decreaseFontScale: () =>
        set((state) => ({
          fontScale: clamp(
            state.fontScale - readerFontScale.step,
            readerFontScale.min,
            readerFontScale.max,
          ),
        })),
      setLineHeightScale: (value) =>
        set({
          lineHeightScale: clamp(value, readerLineHeightScale.min, readerLineHeightScale.max),
        }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setMarginScale: (value) => set({ marginScale: clamp(value, 0.5, 1.5) }),
      toggleHighlights: () => set((state) => ({ highlightsEnabled: !state.highlightsEnabled })),
    }),
    {
      name: "reader.settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
