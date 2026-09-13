import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";

import { useTheme } from "@/theme/useTheme";

import { useOnboardingStatusQuery } from "@/features/onboarding/api/useOnboardingStatusQuery";
import { LevelTestScreen } from "@/features/onboarding/components/LevelTestScreen";
import { LanguagePairScreen } from "@/features/languagePair";

interface OnboardingGateProps {
  children: ReactNode;
}

type Step = "languagePair" | "levelTest";

/**
 * İlk açılışta dil çifti seçimini, sonra seviye tespitini gösterir,
 * tamamlandıktan sonra uygulamayı.
 *
 * NEDEN DİL ÇİFTİ ÖNCE (v2, 2026-09-13): seviye testi İngilizce kelimeler
 * gösteriyor -- bu, hedef dilin İngilizce olduğu varsayımına dayanıyor.
 * Kullanıcı hangi dili okuyacağını seçmeden testin ne göstereceği
 * belirsiz. Bugün tek hedef dil İngilizce olduğu için test her durumda
 * aynı kalıyor, ama sıralama gelecekteki hedef diller için de doğru.
 *
 * `AuthGate`'in İÇİNDE kullanılmalı: onboarding durumu profil satırından
 * okunuyor, bu da bir `auth.uid()` gerektiriyor.
 *
 * Hata durumunda uygulamayı gösteriyoruz (onboarding'i değil): ağ sorunu
 * yüzünden mevcut bir kullanıcıyı tekrar teste sokmak, testi hiç
 * göstermemekten çok daha kötü.
 *
 * MEVCUT KULLANICILAR ETKİLENMİYOR: bu kapı yalnızca onboarding'i hiç
 * TAMAMLAMAMIŞ (profiles.onboarding_completed_at is null) kullanıcılar
 * için açılıyor -- v2'den önce zaten onboarding'i bitirmiş kimse bu akışı
 * bir daha görmüyor.
 */
export function OnboardingGate({ children }: OnboardingGateProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useOnboardingStatusQuery();
  const [step, setStep] = useState<Step>("languagePair");

  const handleDone = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["onboarding", "status"] });
  }, [queryClient]);

  const handleLanguagePairDone = useCallback(() => {
    setStep("levelTest");
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!isError && data && !data.completed) {
    if (step === "languagePair") {
      return <LanguagePairScreen onDone={handleLanguagePairDone} />;
    }
    return <LevelTestScreen onDone={handleDone} />;
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
