import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import arCommon from "../locales/ar/common.json";

const isBrowser = typeof window !== "undefined";

const savedLanguage = isBrowser ? (localStorage.getItem("app-language") || "en") : "en";

if (isBrowser) {
  document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = savedLanguage;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
      },
      ar: {
        common: arCommon,
      },
    },
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    defaultNS: "common",
  });

export const changeLanguage = (lng: string) => {
  if (isBrowser) {
    localStorage.setItem("app-language", lng);
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  }
  i18n.changeLanguage(lng);
};

export default i18n;
