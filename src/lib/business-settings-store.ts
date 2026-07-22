// FreBob — Batch 10A: Business Settings store.
// Persists business info + configuration in the `businesses` row (Supabase)
// with append-only audit events in `settings_audit`. Enforced by RLS.

import { supabase } from "@/integrations/supabase/client";

export type SupportedCurrency = "NGN" | "USD" | "GHS" | "KES" | "ZAR";
export type SupportedLanguage = "en" | "pcm" | "yo" | "ha" | "ig";
export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type NumberFormat = "1,000.00" | "1000.00";
export type AIResponseStyle = "short" | "balanced" | "detailed";
export type DefaultOrderStatus = "enquiry" | "pending" | "reserved";

export type RegionalSettings = {
  timezone: string;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  language: SupportedLanguage;
};

export type AISettings = {
  assistantEnabled: boolean;
  insightsEnabled: boolean;
  summaryEnabled: boolean;
  recommendationsEnabled: boolean;
  responseStyle: AIResponseStyle;
};

export type BusinessPreferences = {
  defaultOrderStatus: DefaultOrderStatus;
  warnLowStock: boolean;
  allowNegativeStock: boolean;
  showReorderAlerts: boolean;
  autoMarkPaid: boolean;
  warnOverpayment: boolean;
  requirePaymentConfirmation: boolean;
  saveOriginalDocuments: boolean;
  documentQualityChecks: boolean;
  askBeforeConversion: boolean;
};

export type BusinessSettings = {
  regional: RegionalSettings;
  ai: AISettings;
  preferences: BusinessPreferences;
};

export type BusinessInfo = {
  id: string | null;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  currency: SupportedCurrency;
  createdAt: string | null;
};

export const DEFAULT_REGIONAL: RegionalSettings = {
  timezone: "Africa/Lagos",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "1,000.00",
  language: "en",
};

export const DEFAULT_AI: AISettings = {
  assistantEnabled: true,
  insightsEnabled: true,
  summaryEnabled: true,
  recommendationsEnabled: true,
  responseStyle: "balanced",
};

export const DEFAULT_PREFERENCES: BusinessPreferences = {
  defaultOrderStatus: "pending",
  warnLowStock: true,
  allowNegativeStock: false,
  showReorderAlerts: true,
  autoMarkPaid: true,
  warnOverpayment: true,
  requirePaymentConfirmation: false,
  saveOriginalDocuments: true,
  documentQualityChecks: true,
  askBeforeConversion: true,
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  regional: DEFAULT_REGIONAL,
  ai: DEFAULT_AI,
  preferences: DEFAULT_PREFERENCES,
};

export const EMPTY_INFO: BusinessInfo = {
  id: null,
  name: "",
  description: "",
  category: "",
  logoUrl: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
  website: "",
  currency: "NGN",
  createdAt: null,
};

export const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg",
  "Africa/Cairo", "Europe/London", "America/New_York", "UTC",
];

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string }[] = [
  { code: "NGN", label: "₦ Naira (NGN)" },
  { code: "USD", label: "$ US Dollar (USD)" },
  { code: "GHS", label: "₵ Ghanaian Cedi (GHS)" },
  { code: "KES", label: "KSh Kenyan Shilling (KES)" },
  { code: "ZAR", label: "R South African Rand (ZAR)" },
];

// ---------------------------------------------------------------- load

export type LoadedBusiness = {
  info: BusinessInfo;
  settings: BusinessSettings;
  ownerId: string;
};

function mergeSettings(raw: unknown): BusinessSettings {
  const r = (raw ?? {}) as Partial<BusinessSettings>;
  return {
    regional: { ...DEFAULT_REGIONAL, ...(r.regional ?? {}) },
    ai: { ...DEFAULT_AI, ...(r.ai ?? {}) },
    preferences: { ...DEFAULT_PREFERENCES, ...(r.preferences ?? {}) },
  };
}

export async function loadBusiness(): Promise<LoadedBusiness | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      info: { ...EMPTY_INFO, email: user.email ?? "" },
      settings: DEFAULT_SETTINGS,
      ownerId: user.id,
    };
  }

  const row = data as Record<string, unknown>;
  const info: BusinessInfo = {
    id: (row.id as string) ?? null,
    name: (row.name as string) ?? "",
    description: (row.description as string) ?? "",
    category: (row.category as string) ?? "",
    logoUrl: (row.logo_url as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? user.email ?? "",
    address: (row.address as string) ?? "",
    city: (row.city as string) ?? "",
    state: (row.state as string) ?? "",
    country: (row.country as string) ?? "Nigeria",
    website: (row.website as string) ?? "",
    currency: ((row.currency as SupportedCurrency) ?? "NGN") as SupportedCurrency,
    createdAt: (row.created_at as string) ?? null,
  };
  return { info, settings: mergeSettings(row.settings), ownerId: user.id };
}

// ---------------------------------------------------------------- save + audit

type AuditEntry = {
  section: string;
  setting_key: string;
  old_value: unknown;
  new_value: unknown;
};

function diffFlat(section: string, before: Record<string, unknown>, after: Record<string, unknown>): AuditEntry[] {
  const out: AuditEntry[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      out.push({ section, setting_key: k, old_value: before[k] ?? null, new_value: after[k] ?? null });
    }
  }
  return out;
}

export async function saveBusiness(params: {
  ownerId: string;
  before: LoadedBusiness;
  info: BusinessInfo;
  settings: BusinessSettings;
}): Promise<{ businessId: string; auditCount: number }> {
  const { ownerId, before, info, settings } = params;
  const row = {
    owner_id: ownerId,
    name: info.name.trim(),
    description: info.description.trim() || null,
    category: info.category || null,
    logo_url: info.logoUrl || null,
    phone: info.phone.trim() || null,
    email: info.email.trim() || null,
    address: info.address.trim() || null,
    city: info.city.trim() || null,
    state: info.state.trim() || null,
    country: info.country.trim() || null,
    website: info.website.trim() || null,
    currency: info.currency,
    settings: settings as unknown as object,
  };

  let businessId: string;
  if (before.info.id) {
    const { data, error } = await supabase
      .from("businesses")
      .update(row)
      .eq("id", before.info.id)
      .eq("owner_id", ownerId)
      .select("id")
      .single();
    if (error) throw error;
    businessId = data.id;
  } else {
    const { data, error } = await supabase
      .from("businesses")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    businessId = data.id;
  }

  // Build audit
  const audit: AuditEntry[] = [];
  audit.push(...diffFlat("business_info", before.info as unknown as Record<string, unknown>, info as unknown as Record<string, unknown>));
  audit.push(...diffFlat("regional", before.settings.regional as unknown as Record<string, unknown>, settings.regional as unknown as Record<string, unknown>));
  audit.push(...diffFlat("ai", before.settings.ai as unknown as Record<string, unknown>, settings.ai as unknown as Record<string, unknown>));
  audit.push(...diffFlat("preferences", before.settings.preferences as unknown as Record<string, unknown>, settings.preferences as unknown as Record<string, unknown>));

  if (audit.length > 0) {
    const rows = audit.map((a) => ({
      business_id: businessId,
      actor_id: ownerId,
      section: a.section,
      setting_key: a.setting_key,
      old_value: a.old_value ?? null,
      new_value: a.new_value ?? null,
    }));
    await supabase.from("settings_audit").insert(rows);
  }

  return { businessId, auditCount: audit.length };
}

export async function loadRecentAudit(businessId: string, limit = 20) {
  const { data, error } = await supabase
    .from("settings_audit")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------- helpers

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function isValidEmail(v: string) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
export function isValidPhone(v: string) {
  if (!v) return true;
  return /^[+()\d\s-]{7,20}$/.test(v.trim());
}
export function isValidUrl(v: string) {
  if (!v) return true;
  try { new URL(v.startsWith("http") ? v : `https://${v}`); return true; }
  catch { return false; }
}

export function equalDeep<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}
