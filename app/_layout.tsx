import "@/i18n";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_600SemiBold,
  Gabarito_700Bold,
  Gabarito_800ExtraBold,
} from "@expo-google-fonts/gabarito";
import { Literata_400Regular, Literata_400Regular_Italic } from "@expo-google-fonts/literata";

import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/theme/useTheme";
import { AuthGate, LaunchOverlay, OnboardingGate } from "@/features/onboarding";
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
    Gabarito_400Regular,
    Gabarito_500Medium,
    Gabarito_600SemiBold,
    Gabarito_700Bold,
    Gabarito_800ExtraBold,
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
                  {/*
                    GEÇİŞLER (2026-10-05, Apple HIG / Material Motion):
                    - Hiyerarşide derine inen sayfa sağdan kayar ve ekranın
                      HER YERİNDEN kaydırılarak geri dönülür (yalnızca sol
                      kenardan değil) -- iOS uygulamalarının alışılmış hissi.
                    - Odaklı oturumlar (tekrar, pratik, quiz, paywall) aşağıdan
                      açılır: "bir göreve girdin, bitince aşağı kaydırıp çık".
                    - Okuyucu ve kitap bitti ekranı solarak gelir: okumaya
                      geçiş bir sayfa değil, bir ortam değişikliği.
                  */}
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: "slide_from_right",
                      gestureEnabled: true,
                      fullScreenGestureEnabled: true,
                      animationMatchesGesture: true,
                    }}
                  >
                    <Stack.Screen name="delete-account" options={{ presentation: "modal" }} />
                    <Stack.Screen name="favorites" />
                    <Stack.Screen name="browse" />
                    <Stack.Screen name="categories" />
                    <Stack.Screen
                      name="quiz-question"
                      options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
                    />
                    <Stack.Screen
                      name="review"
                      options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
                    />
                    <Stack.Screen
                      name="practice"
                      options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
                    />
                    <Stack.Screen name="pack/[level]" />
                    {/*
                      Paywall MODAL DEĞİL, tam sayfa. Modal olarak
                      açıldığında üstte kalan boşluk ve kavisli kenarlar
                      referans tasarımın tam ekran yerleşimini (tepedeki taç,
                      alttaki sabit CTA) bozuyordu; ayrıca modalın kendi
                      kaydırma davranışı, Apple'ın 3.1.2(c) reddine sebep
                      olan "alttaki yasal blok görünmüyor" durumunu geri
                      getirme riski taşıyordu. Kapatma, ekranın kendi X
                      düğmesiyle. */}
                    <Stack.Screen
                      name="paywall"
                      options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }}
                    />
                    <Stack.Screen name="language-settings" options={{ presentation: "modal" }} />
                    {/*
                      Kitap bitirme kutlaması. Modal DEĞİL: reader'dan
                      `replace` ile geliniyor, yani bu ekran okuma akışının
                      yerini alıyor — üstüne açılan bir kart değil.
                    */}
                    <Stack.Screen name="book-finished" options={{ animation: "fade" }} />
                    {/* Okuyucuda sayfalar yatay kaydırılıyor: tam ekran geri hareketi
                        sayfa çevirmeyi çalardı, geri dönüş yalnızca kenardan. */}
                    <Stack.Screen
                      name="reader/[chapterId]"
                      options={{ animation: "fade", fullScreenGestureEnabled: false }}
                    />
                    <Stack.Screen name="dev-splash" options={{ animation: "fade" }} />
                    <Stack.Screen name="dev-onboarding" options={{ animation: "fade" }} />
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
            // Dönen simge YOK: fontlar yüklenirken açılış splash'i üstte.
            <View style={[styles.loading, { backgroundColor: theme.bg.primary }]} />
          )}
          <LaunchOverlay fontsReady={fontsLoaded || Boolean(fontError)} />
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
