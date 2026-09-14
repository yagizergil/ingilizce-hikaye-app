import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useTheme } from "@/theme/useTheme";

import { useOnboardingStatusQuery } from "@/features/onboarding/api/useOnboardingStatusQuery";
import { OnboardingFlow } from "@/features/onboarding/components/OnboardingFlow";

interface OnboardingGateProps {
  children: ReactNode;
}

/**
 * İlk açılışta onboarding akışını gösterir, tamamlandıktan sonra uygulamayı.
 *
 * Akışın kendisi `OnboardingFlow` içinde. Bu bileşenin tek işi "gösterilecek
 * mi" sorusuna cevap vermek.
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

  const [finishing, setFinishing] = useState(false);
  const returnedRef = useRef(false);

  const handleDone = useCallback(() => {
    setFinishing(true);
    void queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
  }, [queryClient]);

  const showFlow = !isError && data && !data.completed;

  /**
   * Onboarding biterken navigasyonu KÖKE alıyoruz.
   *
   * NEDEN: akış gösterilirken `Stack` mount edilmiş değil, ama Expo
   * Router'ın geçmişi duruyor. Kullanıcı onboarding'den önce paywall'a ya
   * da hesap silme ekranına girdiyse (geliştirici akışında bu çok oluyor),
   * akış bittiği anda `Stack` o ekranla geri geliyordu -- yani onboarding
   * "hesabını sil" ekranıyla bitiyormuş gibi görünüyordu. Kök rota
   * yığındaki artığı temizliyor.
   */
  useEffect(() => {
    if (!finishing || showFlow || returnedRef.current) return;
    returnedRef.current = true;
    router.replace("/");
  }, [finishing, showFlow]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (showFlow) {
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
