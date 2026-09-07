import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import "@formatjs/intl-pluralrules/polyfill-force.js";
import "@formatjs/intl-pluralrules/locale-data/tr.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import tr from "@/i18n/locales/tr.json";
import en from "@/i18n/locales/en.json";

const deviceLocale = getLocales()[0]?.languageCode ?? "tr";

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: deviceLocale === "en" ? "en" : "tr",
  fallbackLng: "tr",
  interpolation: { escapeValue: false },
});

export default i18n;
