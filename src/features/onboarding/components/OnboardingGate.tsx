import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useTheme } from "@/theme/useTheme";

import { useOnboardingStatusQuery } from "@/features/onboarding/api/useOnboardingStatusQuery";
import { OnboardingFlow } from "@/features/onboarding/components/OnboardingFlow";
import { useLaunchStore } from "@/lib/launchState";

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
  const markReady = useLaunchStore((state) => state.markReady);
  useEffect(() => {
    if (!isLoading) markReady("onboarding");
  }, [isLoading, markReady]);

  const [finishing, setFinishing] = useState(false);
  const returnedRef = useRef(false);

  const handleDone = useCallback(() => {
    setFinishing(true);
    void queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
  }, [queryClient]);

  const showFlow = !isError && data && !data.completed;

  /**
   * Akış bir kez başladıysa `onDone`'a kadar AÇIK kalıyor.
   *
   * HATA (kullanıcı bulgusu, 2026-09-25): akış paywall'dan ÖNCE profili
   * kaydediyor (`startFinishing`) ve mutation `["onboarding"]`ı geçersiz
   * kılıyor. Yeniden çekilen durum `completed: true` dönünce bu kapı akışı
   * söküp uygulamayı gösteriyordu -- "yolun" ekranından sonra paywall hiç
   * çıkmıyordu. Durum sorgusu "gösterilsin mi"ye karar veriyor, "ne zaman
   * bitsin"e değil; bitişi yalnızca akışın kendisi söylüyor.
   */
  const [flowStarted, setFlowStarted] = useState(false);
  // Render sırasında türetilen durum (React'in önerdiği desen, efekt değil):
  // efektle kurulsaydı durumun `completed` döndüğü render'da bir kare
  // uygulama görünebilirdi.
  if (showFlow && !flowStarted) setFlowStarted(true);
  const flowVisible = Boolean(showFlow) || (flowStarted && !finishing);

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
    if (!finishing || flowVisible || returnedRef.current) return;
    returnedRef.current = true;
    router.replace("/");
  }, [finishing, flowVisible]);

  // Dönen simge YOK: bu sırada açılış splash'i (LaunchOverlay) üstte duruyor.
  if (isLoading) {
    return <View style={[styles.container, { backgroundColor: theme.bg.primary }]} />;
  }

  if (flowVisible) {
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
