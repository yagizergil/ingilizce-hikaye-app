import { useCallback } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";

import { useTheme } from "@/theme/useTheme";

import { useOnboardingStatusQuery } from "@/features/onboarding/api/useOnboardingStatusQuery";
import { OnboardingFlow } from "@/features/onboarding/components/OnboardingFlow";

interface OnboardingGateProps {
  children: ReactNode;
}

/**
 * İlk açılışta onboarding akışını gösterir, tamamlandıktan sonra uygulamayı.
 *
 * Akışın kendisi `OnboardingFlow` içinde (splash -> karşılama -> ana dil ->
 * hedef dil -> seviye). Bu bileşenin tek işi "gösterilecek mi" sorusuna
 * cevap vermek.
 *
 * `AuthGate`'in İÇİNDE kullanılmalı: onboarding durumu profil satırından
 * okunuyor, bu da bir `auth.uid()` gerektiriyor.
 *
 * Hata durumunda uygulamayı gösteriyoruz (onboarding'i değil): ağ sorunu
 * yüzünden mevcut bir kullanıcıyı tekrar akışa sokmak, hiç göstermemekten
 * çok daha kötü.
 */
export function OnboardingGate({ children }: OnboardingGateProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useOnboardingStatusQuery();

  const handleDone = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!isError && data && !data.completed) {
    return <OnboardingFlow onDone={handleDone} />;
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
