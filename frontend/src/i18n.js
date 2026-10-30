import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import faIR from './locales/fa-IR/translation.json';
import ur from './locales/ur/translation.json';
import urLatn from './locales/ur-Latn/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'fa-IR': { translation: faIR },
      ur: { translation: ur },
      'ur-Latn': { translation: urLatn },
    },
    supportedLngs: ['en', 'fa-IR', 'ur', 'ur-Latn'],
    fallbackLng: 'en',
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'easyparking_language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
