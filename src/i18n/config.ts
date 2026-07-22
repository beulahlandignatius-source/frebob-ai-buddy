// FreBob i18n — semantic keys, English fallback, browser-safe init.
// Non-English bundles are DRAFT (machine-assisted) and flagged as such.
// Missing keys fall through to English and log once in dev.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import pcm from "./locales/pcm.json";
import yo from "./locales/yo.json";
import ha from "./locales/ha.json";
import ig from "./locales/ig.json";

let initialised = false;

export function initI18n() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  const missingLogged = new Set<string>();

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        pcm: { translation: pcm },
        yo: { translation: yo },
        ha: { translation: ha },
        ig: { translation: ig },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "pcm", "yo", "ha", "ig"],
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      returnEmptyString: false,
      saveMissing: import.meta.env.DEV,
      missingKeyHandler: (_lng, _ns, key) => {
        if (!import.meta.env.DEV) return;
        if (missingLogged.has(key)) return;
        missingLogged.add(key);
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing key → ${key}`);
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "frebob.lang",
      },
    });
}

export default i18n;
