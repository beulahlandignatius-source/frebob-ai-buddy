// FreBob i18n — semantic keys, English fallback, browser-safe init.
// Non-English bundles are DRAFT (machine-assisted) and flagged as such.
// Missing keys fall through to English and, when auto-translate is on, are
// translated at runtime via Google AI (see src/lib/i18n-runtime.ts).

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
      saveMissing: true,
      missingKeyHandler: (lngs, _ns, key, fallbackValue) => {
        if (import.meta.env.DEV && !missingLogged.has(key)) {
          missingLogged.add(key);
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing key → ${key}`);
        }
        // Runtime auto-translate: translate the English fallback into the
        // active language when the toggle is on.
        void handleMissingKey(lngs, key, fallbackValue);
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "frebob.lang",
      },
    });
}

async function handleMissingKey(
  lngs: readonly string[] | string,
  key: string,
  fallbackValue: string,
) {
  if (typeof window === "undefined") return;
  const langs = Array.isArray(lngs) ? lngs : [lngs];
  const source = fallbackValue || key;
  try {
    const { isAutoTranslateOn, lookupCachedTranslation, queueTranslation } =
      await import("@/lib/i18n-runtime");
    for (const lng of langs) {
      if (!lng || lng === "en") continue;
      const cached = lookupCachedTranslation(lng, source);
      if (cached) {
        i18n.addResource(lng, "translation", key, cached);
        continue;
      }
      if (isAutoTranslateOn()) queueTranslation(lng, source);
    }
  } catch { /* ignore */ }
}

export default i18n;
