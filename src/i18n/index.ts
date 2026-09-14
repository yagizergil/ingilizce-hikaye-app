import { I18nManager } from "react-native";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import "@formatjs/intl-pluralrules/polyfill-force.js";
import "@formatjs/intl-pluralrules/locale-data/tr.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/de.js";
import "@formatjs/intl-pluralrules/locale-data/fr.js";
import "@formatjs/intl-pluralrules/locale-data/it.js";
import "@formatjs/intl-pluralrules/locale-data/es.js";
import "@formatjs/intl-pluralrules/locale-data/ru.js";
import "@formatjs/intl-pluralrules/locale-data/ar.js";
import "@formatjs/intl-pluralrules/locale-data/zh.js";
import "@formatjs/intl-pluralrules/locale-data/ja.js";

import { isRtlLanguage, UI_LANGUAGE_CODES } from "@/lib/languages";
import { readStoredUiLanguage } from "@/i18n/uiLanguage";

import tr from "@/i18n/locales/tr.json";
import en from "@/i18n/locales/en.json";
import de from "@/i18n/locales/de.json";
import fr from "@/i18n/locales/fr.json";
import it from "@/i18n/locales/it.json";
import es from "@/i18n/locales/es.json";
import ru from "@/i18n/locales/ru.json";
import ar from "@/i18n/locales/ar.json";
import zh from "@/i18n/locales/zh.json";
import ja from "@/i18n/locales/ja.json";

/**
 * v2 (dil çiftleri, 2026-09-13): tek dil (tr/en) yerine 11 dilin tamamı
 * kayıtlı. Cihaz dili bu 11'den biriyse doğrudan o dil açılıyor; değilse
 * Türkçe'ye düşülüyor (uygulamanın kuruluş kitlesi ve varsayılan ilk çift).
 *
 * Gerçek seçim `LanguagePairScreen`'de (onboarding) kullanıcıdan alınıyor
 * ve `i18n.changeLanguage()` ile burada değil ORADA tetikleniyor -- bu
 * dosya yalnızca AÇILIŞTAKİ ilk tahmini kuruyor.
 *
 * NEDEN HER DİL `{ translation: ... }` İÇİNDE SARILI: i18next varsayılan
 * ad alanı (namespace) "translation" -- `t("home.empty.title")` gerçekte
 * `resources[lng].translation.home.empty.title`'a bakıyor. Bu sarmalama
 * olmadan (v2'nin ilk sürümünde OLMADIĞI gibi) her arama boşa çıkıyor ve
 * i18next hiçbir çeviri bulamadığında ANAHTARIN KENDİSİNİ ekrana basıyor
 * ("home.empty.title" gibi) -- tam olarak bu regresyon yaşandı ve 11
 * dilin TAMAMINI etkiledi (İngilizce'de "gerçek İngilizce metin" gibi
 * görünmediği için en belirgin oydu).
 */
const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  es: { translation: es },
  ru: { translation: ru },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
};

/**
 * Cihazın dili taşıdığımız on dilden biriyse arayüz o dilde açılıyor;
 * DEĞİLSE İngilizce.
 *
 * NEDEN TÜRKÇE DEĞİL (eski hâli buydu): uygulama tek dil çiftiyle
 * (İngilizce içerik / Türkçe arayüz) başlamıştı ve varsayılan oradan
 * kalmıştı. Artık on arayüz dili var, yani Portekizce ya da Lehçe bir
 * telefonda açılan ilk ekran -- splash ve karşılama dâhil -- kullanıcının
 * hiç bilmediği bir dilde çıkıyordu. İngilizce, bu on dilden birini
 * konuşmayan biri için en yüksek anlaşılma şansı olan seçenek; zaten
 * `fallbackLng` de o.
 */
const deviceLocale = getLocales()[0]?.languageCode ?? "en";
const initialLanguage = (UI_LANGUAGE_CODES as string[]).includes(deviceLocale)
  ? deviceLocale
  : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/**
 * KULLANICININ SEÇTİĞİ DİL, CİHAZIN DİLİNİ EZER.
 *
 * `init` senkron olmak zorunda (ilk render onu bekleyemez), kalıcı depo
 * ise asenkron. Bu yüzden açılış cihaz diliyle yapılıyor ve kayıtlı bir
 * seçim varsa hemen ardından uygulanıyor. Aradaki fark bir karelik ve
 * yalnızca seçim cihaz dilinden FARKLIYSA görünür.
 *
 * Bu olmadan dil seçimi kalıcı değildi: kullanıcı ana dilini seçiyor,
 * uygulamayı kapatıp açtığında arayüz yine cihazın diline dönüyordu.
 */
void readStoredUiLanguage().then((stored) => {
  if (stored && stored !== i18n.language) {
    void i18n.changeLanguage(stored);
  }
});

/**
 * RTL (Arapça) desteği.
 *
 * NEDEN AÇILIŞTA UYGULANIYOR, DEĞİŞİKLİKTE DEĞİL: React Native'de
 * `I18nManager.forceRTL()` yalnızca BİR SONRAKİ native render ağacı
 * kurulumunda etkili oluyor -- yani JS tarafında anında bir "layout
 * flip" YAPMIYOR, uygulamanın YENİDEN BAŞLATILMASINI gerektiriyor. Bu
 * yüzden `LanguagePairScreen`'de Arapça seçildiğinde burada bir şey
 * DEĞİŞTİRMİYORUZ; bunun yerine kullanıcıya "uygulamayı yeniden aç"
 * istendiğini söylüyoruz (bkz. o ekranın RTL notu) ve gerçek flip bir
 * SONRAKİ açılışta, işte tam burada, olur.
 *
 * `allowRTL(true)` DAİMA çağrılıyor (dil ne olursa olsun): bu, RN'in RTL
 * YETENEĞİNİ açık bırakır, `forceRTL` çağrısının etkili olabilmesi için
 * gerekli bir ön koşuldur ve LTR dillerde hiçbir görünür etkisi yoktur.
 */
I18nManager.allowRTL(true);

/**
 * RTL kararı KAYITLI SEÇİME göre veriliyor, cihaz diline göre değil.
 *
 * Eskiden yalnızca `initialLanguage` (yani cihazın dili) okunuyordu:
 * Arapçayı uygulama içinden seçen kullanıcı, uygulamayı yeniden başlatsa
 * bile LTR bir düzende kalıyordu -- çünkü cihazı Arapça değildi.
 */
void readStoredUiLanguage().then((stored) => {
  const shouldBeRtl = isRtlLanguage(stored ?? initialLanguage);
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.forceRTL(shouldBeRtl);
  }
});

export default i18n;
