import { useEffect } from "react";
import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/useTheme";
import { useLaunchStore } from "@/lib/launchState";
import { useAuthBootstrap } from "@/features/onboarding/api/useAuthBootstrap";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Uygulama render edilmeden önce oturumun (anonim veya kayıtlı) var
 * olduğundan emin olur. Kayıt duvarı değildir — sadece açılışta bir
 * auth.uid() garanti eder, çocuklarına hiçbir zaman "giriş yap" ekranı
 * dayatmaz.
 */
export function AuthGate({ children }: AuthGateProps) {
  const status = useAuthBootstrap();
  const { theme } = useTheme();
  const markReady = useLaunchStore((state) => state.markReady);
  useEffect(() => {
    if (status !== "bootstrapping") markReady("auth");
  }, [status, markReady]);

  // Dönen simge YOK: bu sırada açılış splash'i (LaunchOverlay) üstte duruyor.
  if (status === "bootstrapping") {
    return <View style={[styles.container, { backgroundColor: theme.bg.primary }]} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
