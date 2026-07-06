import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const isBrowser = typeof window !== "undefined";
const savedLanguage = isBrowser ? (localStorage.getItem("app-language") || "en") : "en";

if (isBrowser) {
  document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = savedLanguage;
}

i18n
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    defaultNS: "common",
  });

const loadLang = async (lng: string) => {
  if (lng === "ar") {
    const res = await import("../locales/ar/common.json");
    i18n.addResourceBundle("ar", "common", res.default, true, true);
  } else {
    const res = await import("../locales/en/common.json");
    i18n.addResourceBundle("en", "common", res.default, true, true);
  }
};

loadLang(savedLanguage);

export const changeLanguage = async (lng: string) => {
  await loadLang(lng);
  if (isBrowser) {
    localStorage.setItem("app-language", lng);
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  }
  i18n.changeLanguage(lng);
};

export default i18n;
