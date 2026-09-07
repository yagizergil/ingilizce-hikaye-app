import { useColorScheme } from "react-native";

import { create } from "zustand";

import storage from "@/lib/storage";

import { colors, type ThemeColors, type ThemeName } from "@/theme/colors";

/**
 * Persisted user preference: "system" follows the OS light/dark setting,
 * "light" / "dark" / "sepia" are explicit overrides (sepia has no system
 * equivalent, so picking it always pins the theme regardless of OS).
 *
 * NOTE for the next engineer: ADR-004 specifies MMKV for this kind of
 * small key-value preference. `src/lib/storage.ts` currently only wraps
 * AsyncStorage (MMKV was never actually wired up in this repo yet). This
 * hook is written against the `storage` module's async get/set contract
 * so swapping storage.ts to MMKV later is a non-breaking change here.
 */
export type ThemePreference = "system" | ThemeName;

const STORAGE_KEY = "theme-preference";

interface ThemePreferenceState {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
}

const useThemePreferenceStore = create<ThemePreferenceState>((set) => ({
  preference: "system",
  hydrated: false,
  setPreference: (preference) => {
    set({ preference });
    storage.setItem(STORAGE_KEY, preference).catch(() => {
      // Best-effort persistence: an in-memory preference for this session
      // is an acceptable fallback if disk write fails.
    });
  },
  hydrate: async () => {
    try {
      const stored = await storage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "sepia" || stored === "dark" || stored === "system") {
        set({ preference: stored, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));

// Fire-and-forget hydration on module load; components read `hydrated` if
// they need to avoid a flash of the wrong theme.
void useThemePreferenceStore.getState().hydrate();

export interface UseThemeResult {
  themeName: ThemeName;
  theme: ThemeColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  hydrated: boolean;
}

/**
 * Resolves the active theme: explicit sepia/light/dark preference wins,
 * otherwise follows the OS color scheme via useColorScheme(). Full
 * settings UI for switching preference is future work — this hook is the
 * functional core it will call into.
 */
export function useTheme(): UseThemeResult {
  const systemScheme = useColorScheme();
  const preference = useThemePreferenceStore((state) => state.preference);
  const setPreference = useThemePreferenceStore((state) => state.setPreference);
  const hydrated = useThemePreferenceStore((state) => state.hydrated);

  const themeName: ThemeName = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  return {
    themeName,
    theme: colors[themeName],
    preference,
    setPreference,
    hydrated,
  };
}
