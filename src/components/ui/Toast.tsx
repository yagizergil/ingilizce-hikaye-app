import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";

import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { create } from "zustand";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

const TOAST_DURATION_MS = 2500;

interface ToastState {
  message: string | null;
  /** Bumped on every `show()` call so a second call while a toast is
   * already visible restarts the auto-dismiss timer instead of the first
   * timer's timeout firing early and hiding the replacement message. */
  token: number;
  show: (message: string) => void;
  hide: () => void;
}

/**
 * Global transient-UI store, the same pattern `useLibraryFiltersStore`
 * (src/features/library/hooks/useLibraryFiltersStore.ts) uses for
 * screen/UI state — a plain Zustand store, no React context/provider
 * wiring needed. `ToastHost` (rendered once near the app root) subscribes
 * to it, so any screen can call `useToast().show(...)` without prop-drilling.
 */
const useToastStore = create<ToastState>((set) => ({
  message: null,
  token: 0,
  show: (message) => set((state) => ({ message, token: state.token + 1 })),
  hide: () => set({ message: null }),
}));

/** Hook API for callers: `const { show } = useToast()`. A second `show()`
 * call while a toast is visible replaces it (single toast at a time, no
 * stacking) and restarts the auto-dismiss timer. */
export function useToast() {
  const show = useToastStore((state) => state.show);
  return { show };
}

/** Render once near the app root (e.g. the root layout). Not exported for
 * per-screen use — a second mounted instance would double-render the same
 * global message. */
export function ToastHost() {
  const message = useToastStore((state) => state.message);
  const token = useToastStore((state) => state.token);
  const hide = useToastStore((state) => state.hide);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(hide, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // `token` intentionally in the deps: it changes on every show() call
    // (even to the same message string), restarting this timer.
  }, [message, token, hide]);

  if (message === null) return null;

  return (
    <Animated.View
      key={token}
      entering={FadeInDown}
      exiting={FadeOutDown}
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + spacing.xl, backgroundColor: theme.text.primary },
      ]}
    >
      <Text style={[monoType.rowText, { color: theme.text.inverse }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
  },
});
