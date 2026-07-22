// Shared business context for FreBob.
// Every module MUST resolve the current business through this hook (or the
// getCurrentBusiness helper for imperative code). Do not query `businesses`
// or invent a business id anywhere else.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demo/mode";

export interface CurrentBusinessContext {
  userId: string;
  businessId: string;
  businessName: string;
  isDemo: boolean;
  preferredLanguage: string;
  currency: string;
  timezone: string;
  role: "owner" | "member";
}

let _cache: CurrentBusinessContext | null = null;
let _inflight: Promise<CurrentBusinessContext | null> | null = null;

export function clearCurrentBusinessCache() {
  _cache = null;
  _inflight = null;
}

export async function getCurrentBusiness(): Promise<CurrentBusinessContext | null> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return null;

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, currency, settings")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!biz) return null;

    const settings = (biz.settings ?? {}) as Record<string, unknown>;
    const ctx: CurrentBusinessContext = {
      userId: user.id,
      businessId: biz.id,
      businessName: biz.name,
      isDemo: isDemoMode(),
      preferredLanguage: (settings.language as string) || "en",
      currency: biz.currency || "NGN",
      timezone: (settings.timezone as string) || "Africa/Lagos",
      role: "owner",
    };
    _cache = ctx;
    return ctx;
  })().finally(() => {
    _inflight = null;
  });
  return _inflight;
}

export function useCurrentBusiness() {
  const [ctx, setCtx] = useState<CurrentBusinessContext | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      clearCurrentBusinessCache();
      const next = await getCurrentBusiness();
      setCtx(next);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getCurrentBusiness();
        if (!cancelled) setCtx(next);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearCurrentBusinessCache();
        setCtx(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void refresh();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return { context: ctx, loading, error, refresh };
}
