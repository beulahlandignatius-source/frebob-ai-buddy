// Runtime AI translator that plugs into i18next as a missing-key fallback.
// When "auto-translate" is enabled and a key is missing in the active
// language, we translate the English fallback via Google Gemini (server
// function) and inject it back into i18next. Results are cached in
// localStorage so a given string is only ever translated once.

import i18n from "@/i18n/config";
import { translateTexts } from "@/lib/translate.functions";

type LangCode = "en" | "pcm" | "yo" | "ha" | "ig";

const AUTOTRANSLATE_KEY = "frebob.autoTranslate";
const CACHE_KEY = "frebob.translationCache.v1";

// ------ toggle ---------------------------------------------------------------

export function isAutoTranslateOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTOTRANSLATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAutoTranslate(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTOTRANSLATE_KEY, on ? "1" : "0");
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("frebob:autotranslate", { detail: { on } }));
}

// ------ cache ----------------------------------------------------------------

type Cache = Record<string, Record<string, string>>; // lang -> (source -> translated)

function loadCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch { return {}; }
}

function saveCache(c: Cache) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export function clearTranslationCache() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

// ------ batched translator ---------------------------------------------------

let pending: Map<string, Set<string>> = new Map(); // lang -> source strings queued
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

async function flush() {
  flushTimer = null;
  if (inFlight) return;
  const snapshot = pending;
  pending = new Map();
  if (snapshot.size === 0) return;
  inFlight = true;
  try {
    const cache = loadCache();
    for (const [lang, set] of snapshot) {
      const texts = Array.from(set);
      if (texts.length === 0) continue;
      try {
        const res = await translateTexts({ data: { texts, targetLanguage: lang, sourceLanguage: "en" } });
        if (!res.ok) continue;
        cache[lang] = cache[lang] ?? {};
        res.translations.forEach((t, i) => {
          const src = texts[i];
          if (t && t !== src) cache[lang][src] = t;
        });
      } catch { /* skip this lang batch */ }
    }
    saveCache(cache);
    // Force i18next consumers to re-render with the new strings.
    void i18n.reloadResources();
    i18n.emit("languageChanged", i18n.resolvedLanguage);
  } finally {
    inFlight = false;
    // If more items queued during flight, kick another flush.
    if (pending.size > 0) scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { void flush(); }, 400);
}

export function queueTranslation(lang: string, source: string) {
  if (!source || !source.trim()) return;
  if (lang === "en") return;
  const cache = loadCache();
  if (cache[lang]?.[source]) return; // already cached
  const set = pending.get(lang) ?? new Set<string>();
  set.add(source);
  pending.set(lang, set);
  scheduleFlush();
}

// ------ i18next lookup hook --------------------------------------------------

// Reads from the localStorage cache synchronously. Returns undefined when we
// don't have a translation yet — the caller falls back to English and we
// enqueue a background translation so the next render replaces it.
export function lookupCachedTranslation(lang: string, source: string): string | undefined {
  if (!source) return undefined;
  const cache = loadCache();
  return cache[lang]?.[source];
}

// Install the missing-key handler. Called once from i18n/config.
export function installAutoTranslate() {
  if (typeof window === "undefined") return;

  const attach = () => {
    // On language change, prewarm any strings we already saw missing.
    // (No-op: i18next re-renders and missingKeyHandler will re-fire.)
  };
  i18n.on("languageChanged", attach);

  // The missing-key hook lives in i18n/config's init so it can consult us.
}

// Translate an arbitrary blob of English text and cache it. Used by the
// "Translate this page" button and Bob's answer post-processing.
export async function translateOne(text: string, targetLang: LangCode): Promise<string> {
  if (!text || targetLang === "en") return text;
  const cache = loadCache();
  const hit = cache[targetLang]?.[text];
  if (hit) return hit;
  try {
    const res = await translateTexts({ data: { texts: [text], targetLanguage: targetLang, sourceLanguage: "en" } });
    if (res.ok && res.translations[0]) {
      cache[targetLang] = cache[targetLang] ?? {};
      cache[targetLang][text] = res.translations[0];
      saveCache(cache);
      return res.translations[0];
    }
  } catch { /* fall through */ }
  return text;
}
