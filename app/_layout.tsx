import "@/i18n";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { Literata_400Regular, Literata_400Regular_Italic } from "@expo-google-fonts/literata";

import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/theme/useTheme";
import { AuthGate, OnboardingGate } from "@/features/onboarding";
import { ReminderScheduler } from "@/features/reminders";
import { ErrorBoundary, ToastHost } from "@/components/ui";
import { initAnalytics } from "@/lib/analytics";
import { configurePurchases } from "@/lib/revenuecat";
import { configureAudioSession } from "@/lib/audioSession";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Literata_400Regular,
    Literata_400Regular_Italic,
  });
  const { theme } = useTheme();

  // Diskte bekleyen olayları geri yükler ve uygulama arka plana alınınca
  // kuyruğu boşaltır. Dönüş değeri aboneliği kaldırıyor.
  useEffect(() => initAnalytics(), []);

  // RevenueCat'i açılışta kur; oturum açılınca/değişince kullanıcıyı yeniden
  // eşleştir. Expo Go'da sessizce hiçbir şey yapmıyor (bkz. src/lib/revenuecat.ts).
  useEffect(() => configurePurchases(), []);

  // Ses oturumunu "playback" kategorisine al: telaffuz, telefon sessiz
  // moddayken de duyulsun (bkz. src/lib/audioSession.ts).
  useEffect(() => {
    void configureAudioSession();
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <StatusBar style="auto" />
          {fontsLoaded ? (
            <ErrorBoundary source="root">
              <AuthGate>
                <OnboardingGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="delete-account" options={{ presentation: "modal" }} />
                    <Stack.Screen name="favorites" />
                    <Stack.Screen name="browse" />
                    <Stack.Screen name="review" />
                    <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
                    <Stack.Screen name="language-settings" options={{ presentation: "modal" }} />
                    {/*
                      Kitap bitirme kutlaması. Modal DEĞİL: reader'dan
                      `replace` ile geliniyor, yani bu ekran okuma akışının
                      yerini alıyor — üstüne açılan bir kart değil.
                    */}
                    <Stack.Screen name="book-finished" />
                  </Stack>
                  <ToastHost />
                  {/*
                    Hatırlatmalar uygulama arka plana alındığında yeniden
                    planlanıyor. Bileşen olarak burada duruyor çünkü
                    planlayıcı TanStack Query kullanıyor ve
                    `QueryClientProvider`'ın ALTINDA olmak zorunda —
                    RootLayout'un kendisi provider'ı render ettiği için
                    orada çağrılamıyor. Hiçbir şey render etmiyor;
                    kullanıcı ayarı kapalıysa (varsayılan) hiçbir sorgu da
                    yapmıyor.
                  */}
                  <ReminderScheduler />
                </OnboardingGate>
              </AuthGate>
            </ErrorBoundary>
          ) : (
            <View style={[styles.loading, { backgroundColor: theme.bg.primary }]}>
              <ActivityIndicator color={theme.accent} />
            </View>
          )}
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
