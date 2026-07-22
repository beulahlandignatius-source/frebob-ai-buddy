// B5 — Notifications cloud sync.
// pushNotifications: upsert local notifications into Cloud by dedupe_key.
// listCloudNotifications: fetch persisted notifications for a business.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PushItem = {
  category: string;
  severity: string;
  title: string;
  body: string;
  dedupeKey: string;
  relatedType?: string | null;
  relatedId?: string | null;
  metadata?: Record<string, unknown>;
};

export const pushNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { businessId: string; items: PushItem[] };
    if (!d?.businessId) throw new Error("businessId is required");
    if (!Array.isArray(d.items)) throw new Error("items must be an array");
    return { businessId: d.businessId, items: d.items.slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    if (data.items.length === 0) return { upserted: 0 };
    const rows = data.items.map((it) => ({
      business_id: data.businessId,
      category: it.category,
      severity: it.severity,
      title: it.title,
      body: it.body,
      dedupe_key: it.dedupeKey,
      related_type: it.relatedType ?? null,
      related_id: it.relatedId ?? null,
      metadata: (it.metadata ?? {}) as never,
    }));
    const { error, count } = await context.supabase
      .from("notifications")
      .upsert(rows, { onConflict: "business_id,dedupe_key", count: "exact" });
    if (error) throw new Error(error.message);
    return { upserted: count ?? rows.length };
  });

export const listCloudNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { businessId: string };
    if (!d?.businessId) throw new Error("businessId is required");
    return { businessId: d.businessId };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markCloudNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { businessId: string; dedupeKey: string; read: boolean };
    if (!d?.businessId || !d?.dedupeKey) throw new Error("businessId and dedupeKey are required");
    return { businessId: d.businessId, dedupeKey: d.dedupeKey, read: d.read !== false };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null })
      .eq("business_id", data.businessId)
      .eq("dedupe_key", data.dedupeKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
