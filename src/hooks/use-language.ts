// Small hook wrapping i18n change + persistence.
// Persists to localStorage immediately; profile sync is fire-and-forget so
// a failing network call never blocks the language switch.

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { LanguageCode } from "@/i18n/languages";

const STORAGE_KEY = "frebob.lang";

export function useLanguage() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage as LanguageCode) || "en";

  const change = useCallback(async (code: LanguageCode) => {
    await i18n.changeLanguage(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch {}
    // Best-effort profile sync — silent failures are fine.
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update({ preferred_language: code }).eq("id", uid);
    } catch {}
  }, [i18n]);

  return { current, change, t };
}
