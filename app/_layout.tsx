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
import { LanguagePairUiSync } from "@/features/languagePair";
import { ErrorBoundary, ToastHost } from "@/components/ui";
import { initAnalytics, trackError } from "@/lib/analytics";
import { configurePurchases } from "@/lib/revenuecat";
import { configureAudioSession } from "@/lib/audioSession";

export default function RootLayout() {
  /**
   * DENETİM BULGUSU (2026-09-19): yalnızca `fontsLoaded` okunuyordu, hata
   * yok sayılıyordu. Bir yüz yüklenemezse (bozuk asset, bellek baskısı,
   * Android'de nadiren font tablosu) `fontsLoaded` SONSUZA KADAR `false`
   * kalıyor ve bütün uygulama dönen bir spinner'ın arkasında kilitleniyor
   * -- kullanıcı için "uygulama açılmıyor". `useAuthBootstrap` içinde aynı
   * sınıf hata 2026-09-14'te zaten kapatılmıştı; açılış yolunda kalan tek
   * koşulsuz kapı buydu.
   *
   * Font olmadan açmak kozmetik bir gerileme (sistem yüzü kullanılır);
   * hiç açılmamak ise App Store incelemesinde doğrudan red.
   */
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Literata_400Regular,
    Literata_400Regular_Italic,
  });
  const { theme, themeName } = useTheme();

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

  // Yüz yüklenemedi ama uygulama yine de açılıyor -- sessizce olmasın.
  useEffect(() => {
    if (fontError) trackError("fonts.load", fontError);
  }, [fontError]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          {/*
            DENETİM BULGUSU (2026-09-19, kullanıcı bulgusu): "auto" durum
            çubuğu simgelerini CİHAZIN sistem temasına göre seçiyor --
            uygulamanın kendi tema tercihine (`useTheme`, light/sepia/dark/
            system) göre DEĞİL. İkisi bağımsız: kullanıcı cihazı koyu modda
            olsa bile okuma temasini "Açık" ya da "Sepya" seçebiliyor
            (ADR bkz. `useReaderThemeColors`). Bu durumda "auto" cihaz koyu
            olduğu için AÇIK renkli (beyaz) simgeler çiziyordu, ama ekran
            zemini uygulamanın kendi tercihiyle açık/sepya (beyaz/krem)
            kalıyordu -- beyaz simge beyaz zemin üzerinde görünmüyordu.
            Simge rengi artık cihazın değil, UYGULAMANIN çözümlenmiş
            temasından geliyor: açık/sepya zeminde koyu simge, koyu
            zeminde açık simge.
          */}
          <StatusBar style={themeName === "dark" ? "light" : "dark"} />
          {fontsLoaded || fontError ? (
            <ErrorBoundary source="root">
              <AuthGate>
                <OnboardingGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="delete-account" options={{ presentation: "modal" }} />
                    <Stack.Screen name="favorites" />
                    <Stack.Screen name="browse" />
                    <Stack.Screen name="review" />
                    {/*
                      Paywall MODAL DEĞİL, tam sayfa. Modal olarak
                      açıldığında üstte kalan boşluk ve kavisli kenarlar
                      referans tasarımın tam ekran yerleşimini (tepedeki taç,
                      alttaki sabit CTA) bozuyordu; ayrıca modalın kendi
                      kaydırma davranışı, Apple'ın 3.1.2(c) reddine sebep
                      olan "alttaki yasal blok görünmüyor" durumunu geri
                      getirme riski taşıyordu. Kapatma, ekranın kendi X
                      düğmesiyle. */}
                    <Stack.Screen name="paywall" />
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
                  <LanguagePairUiSync />
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
