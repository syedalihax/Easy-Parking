import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/locales/en.json";
import ur from "@/locales/ur.json";
import urLatn from "@/locales/ur-Latn.json";
import faIR from "@/locales/fa-IR.json";

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  "ur-Latn": { translation: urLatn },
  "fa-IR": { translation: faIR },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: ["en", "ur", "ur-Latn", "fa-IR"],
      fallbackLng: "en",
      defaultNS: "translation",
      ns: ["translation"],
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        lookupLocalStorage: "easyparking-lang",
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
