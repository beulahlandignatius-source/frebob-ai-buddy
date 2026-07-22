// Shared business context for FreBob (multi-business aware).
//
// A user can belong to many businesses via `business_members`. This hook
// loads every membership, tracks the *active* business id (persisted per user
// in localStorage), and exposes helpers to switch or create a business.
//
// Every module MUST resolve the current business through this hook (or the
// getCurrentBusiness helper). Do not query `businesses` directly anywhere else.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demo/mode";

export interface BusinessSummary {
  id: string;
  name: string;
  currency: string;
  role: "owner" | "admin" | "member";
}

export interface CurrentBusinessContext {
  userId: string;
  businessId: string;
  businessName: string;
  isDemo: boolean;
  preferredLanguage: string;
  currency: string;
  timezone: string;
  role: "owner" | "admin" | "member";
  businesses: BusinessSummary[];
}

const ACTIVE_KEY_PREFIX = "frebob.activeBusinessId:";
const FREBOB_CACHE_PREFIX = "frebob.";
const PROTECTED_KEYS = new Set([
  "frebob.userName",
  "frebob.userEmail",
  "frebob.userPhone",
  "frebob.demoMode",
]);

let _cache: CurrentBusinessContext | null = null;
let _inflight: Promise<CurrentBusinessContext | null> | null = null;

export function clearCurrentBusinessCache() {
  _cache = null;
  _inflight = null;
}

function getActiveIdFor(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

function setActiveIdFor(userId: string, businessId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY_PREFIX + userId, businessId);
  } catch {
    /* ignore */
  }
}

// Clear per-business local caches when switching (prevents cross-business leaks
// from prototype localStorage stores). Keeps user identity and demo flag.
function clearBusinessScopedCaches() {
  if (typeof window === "undefined") return;
  const toDelete: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith(FREBOB_CACHE_PREFIX)) continue;
    if (PROTECTED_KEYS.has(k)) continue;
    if (k.startsWith(ACTIVE_KEY_PREFIX)) continue;
    if (k.startsWith("frebob-real-backup:")) continue;
    if (k.startsWith("frebob:hint:")) continue;
    if (k === "frebob:tour_completed_v1") continue;
    toDelete.push(k);
  }
  for (const k of toDelete) window.localStorage.removeItem(k);
}

export async function getCurrentBusiness(): Promise<CurrentBusinessContext | null> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return null;

    // Every business the user is a member of (owner rows are seeded by trigger).
    const { data: memberships } = await supabase
      .from("business_members")
      .select("role, business:businesses(id, name, currency, settings)")
      .eq("user_id", user.id);

    const rows = (memberships ?? []).flatMap((m) => {
      const biz = m.business as unknown as {
        id: string;
        name: string;
        currency: string | null;
        settings: Record<string, unknown> | null;
      } | null;
      if (!biz) return [];
      return [{ role: m.role as BusinessSummary["role"], biz }];
    });

    if (rows.length === 0) return null;

    const preferredId = getActiveIdFor(user.id);
    const picked =
      rows.find((r) => r.biz.id === preferredId) ??
      rows[0];

    // Persist the picked id so next load is stable.
    setActiveIdFor(user.id, picked.biz.id);

    const settings = (picked.biz.settings ?? {}) as Record<string, unknown>;
    const ctx: CurrentBusinessContext = {
      userId: user.id,
      businessId: picked.biz.id,
      businessName: picked.biz.name,
      isDemo: isDemoMode(),
      preferredLanguage: (settings.language as string) || "en",
      currency: picked.biz.currency || "NGN",
      timezone: (settings.timezone as string) || "Africa/Lagos",
      role: picked.role,
      businesses: rows.map((r) => ({
        id: r.biz.id,
        name: r.biz.name,
        currency: r.biz.currency || "NGN",
        role: r.role,
      })),
    };
    _cache = ctx;
    return ctx;
  })().finally(() => {
    _inflight = null;
  });
  return _inflight;
}

export async function switchActiveBusiness(businessId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  setActiveIdFor(user.id, businessId);
  clearBusinessScopedCaches();
  clearCurrentBusinessCache();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export async function createBusinessWorkspace(input: {
  name: string;
  category?: string | null;
  country?: string | null;
  currency?: string;
  language?: string;
  timezone?: string;
}): Promise<{ id: string } | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      category: input.category ?? null,
      country: input.country ?? null,
      currency: input.currency ?? "NGN",
      settings: {
        language: input.language ?? "en",
        timezone: input.timezone ?? "Africa/Lagos",
      } as never,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  // Trigger auto-inserts the membership row; make this the active business.
  setActiveIdFor(user.id, data.id);
  clearBusinessScopedCaches();
  clearCurrentBusinessCache();
  return { id: data.id };
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
