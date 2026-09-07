import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "İngilizce Hikaye",
  slug: "ingilizce-hikaye",
  scheme: "ingilizcehikaye",
  // App Store Connect'te 1.0 olarak açıldı; ikisi ayrışırsa yüklenen
  // derleme "Prepare for Submission" sürümüne bağlanmaz.
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // Uygulama arayüzü Türkçe; İngilizce olan yalnızca okunan hikâye metni.
  // Bu alan hem RN'in yerelleştirme davranışını hem de store'daki birincil
  // dili etkiliyor.
  locales: {
    tr: "./store/locales/tr.json",
  },
  description:
    "Seviyene göre İngilizce hikâyeler oku, kelime öğren. " +
    "Anlamadığın kelimeye dokun, Türkçe karşılığı anında açılsın.",
  icon: "./assets/icon.png",
  // Yükleme ekranı ve bazı native yüzeylerdeki vurgu rengi — uygulamanın
  // kendi accent token'ıyla aynı (src/theme/tokens/colors.ts).
  primaryColor: "#A6572E",
  // OTA güncellemelerin hangi native derlemeyle uyumlu olduğunu belirler.
  // "appVersion" politikası: `version` alanı değişmediği sürece aynı
  // native derleme güncelleme alabilir.
  runtimeVersion: {
    policy: "appVersion",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.ingilizcehikaye.app",
    usesAppleSignIn: true,
    config: {
      // Uygulama yalnızca standart HTTPS kullanıyor, özel şifreleme yok.
      // Bu alan olmadan App Store Connect her gönderimde ihracat uyumluluğu
      // sorusu soruyor ve gönderim beklemede kalıyor.
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      // Arayüz Türkçe ama cihaz dili başka olabilir; karışık yerelleştirmeye
      // izin vermezsek iOS bazı sistem metinlerini beklenmedik dilde gösterir.
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    package: "com.ingilizcehikaye.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FAF8F4",
    },
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    "expo-apple-authentication",
    // Kelime telaffuzu (expo-speech) iOS'ta AVAudioSession uzerinden
    // calisiyor; sessiz moda ragmen duyulmasi icin oturum kategorisinin
    // "playback" olmasi gerekiyor. Bunu ayarlayan API expo-audio'da —
    // bkz. src/lib/audioSession.ts.
    //
    // UC SECENEGIN DE KAPATILMASI ZORUNLU. Plugin'in varsayilanlari bu
    // uygulama icin yanlis ve ikisi dogrudan red sebebi. Ilk uretim
    // derlemesinin IPA'si incelenerek bulundu:
    //
    //  - `enableBackgroundPlayback` varsayilani TRUE ve Info.plist'e
    //    `UIBackgroundModes: ["audio"]` yaziyor. Uygulama arka planda ses
    //    CALMIYOR (audioSession.ts `shouldPlayInBackground: false`).
    //    Kullanilmayan bir arka plan modu beyan etmek Guideline 2.5.4
    //    kapsaminda bilinen bir red gerekcesi.
    //  - `microphonePermission` varsayilani bir NSMicrophoneUsageDescription
    //    metni ekliyor. Uygulama mikrofonu HIC kullanmiyor; kullanilmayan
    //    bir izin beyani hem gereksiz hem de denetimde soru isareti.
    //  - `recordAudioAndroid` ayni sebeple kapali: kayit yok.
    [
      "expo-audio",
      {
        microphonePermission: false,
        enableBackgroundPlayback: false,
        recordAudioAndroid: false,
      },
    ],
    // `aps-environment` yetkilendirmesini siler. expo-notifications onu
    // push kullanilmasa bile kosulsuz ekliyor; bu uygulama yalnizca YEREL
    // bildirim kullandigi icin (ADR-010) o yetkilendirme gereksiz ve
    // zararli — App ID'de Push Notifications yetkinligi acmayi zorunlu
    // kilar ve uretim derlemesinde development/production uyusmazligi
    // yaratir. Ayrintili gerekce ve dogrulama komutu plugin dosyasinda.
    //
    // SIRA TERSTIR: Expo mod'lari kayit sirasinin TERSINE calisiyor, bu
    // yuzden silme plugin'i expo-notifications'tan ONCE yaziliyor.
    "./plugins/withoutPushEntitlement",
    // Hatirlatmalar YEREL bildirimle gonderiliyor (tekrar zamani, yarim
    // kalan hikaye, seri) — uzak/push bildirim, APNs sertifikasi ve
    // bildirim sunucusu YOK, ihtiyac da yok: uc hatirlatmanin verisi de
    // cihazda. Bkz. src/lib/notifications.ts.
    [
      "expo-notifications",
      {
        // Bildirim ikonu/rengi Android'e ozel; iOS uygulama ikonunu
        // kullaniyor. Renk uygulamanin accent token'iyla ayni.
        color: "#A6572E",
      },
    ],
    // SDK 57'de ust duzey `splash` alani kaldirildi; acilis ekrani artik
    // expo-splash-screen config plugin'i uzerinden tanimlaniyor.
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#FAF8F4",
        dark: {
          image: "./assets/splash-dark.png",
          backgroundColor: "#1C1712",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // Abonelik ekranındaki zorunlu yasal bağlantılar.
    //
    // App Store Review Guideline 3.1.2(a) bir abonelik satın alma ekranında
    // Kullanım Koşulları (EULA) ve Gizlilik Politikası bağlantılarının
    // GÖRÜNÜR olmasını şart koşuyor. Bunlar olmadan gönderim reddedilir.
    //
    // EULA varsayılanı Apple'ın standart lisans metnidir; kendi EULA'n
    // yoksa Apple bunu kabul ediyor. Gizlilik politikası URL'i ise
    // ZORUNLU OLARAK senin barındırdığın bir sayfa olmalı — metin
    // docs/PRIVACY.md içinde hazır. Boş bırakılırsa paywall bağlantı
    // yerine bir uyarı gösterir ve gönderim yapılmamalıdır.
    termsUrl:
      process.env.EXPO_PUBLIC_TERMS_URL ??
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL,
    // EAS proje kimliği. `eas init` dinamik config'e kendisi yazamadığı
    // için elle eklendi; OTA güncelleme ve derleme bunu okuyor.
    eas: {
      projectId: "2de57729-cc72-4cba-80d8-bd273e65d16c",
    },
  },
  updates: {
    url: "https://u.expo.dev/2de57729-cc72-4cba-80d8-bd273e65d16c",
  },
};

export default config;
