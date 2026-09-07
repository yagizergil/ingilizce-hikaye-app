import type { ReactNode } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/useTheme";
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

  if (status === "bootstrapping") {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
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
