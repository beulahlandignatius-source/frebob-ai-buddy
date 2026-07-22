// B4 — Cloud sync layer.
// Hydrates the localStorage-backed prototype stores (approved records,
// order payments, order-status overrides, products) from the Cloud tables
// (`approved_records`, `approved_record_items`, `orders`, `order_items`,
// `payments`, `products`) for the signed-in user's active business.
//
// Rationale: rather than rewriting every reader (Dashboard / Inventory /
// Reports / Business Memory), we mirror the Cloud rows into the exact
// localStorage shapes the existing consumers already understand. This keeps
// this batch small and reversible while ensuring the app only shows APPROVED
// data from Cloud for real users. Demo mode is untouched (namespaced state).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useDemo } from "@/lib/demo/context";
import type { ApprovedRecord, Extraction, ExtractionItem } from "@/lib/records-store";
import type { Payment, PaymentMethod, OrderStatusOverride } from "@/lib/orders-store";
import type { UserProduct, Quality } from "@/lib/user-products-store";
import type { Product } from "@/lib/mock-data";

const APPROVED_KEY = "frebob.approvedRecords.v1";
const PAY_KEY = "frebob.orderPayments.v1";
const STATUS_KEY = "frebob.orderStatusOverrides.v1";
const PRODUCTS_KEY = "frebob.user-products.v1";
const LAST_SYNC_KEY = "frebob.cloudSync.lastAt";

// Minimum interval between silent re-syncs on the same tab.
const MIN_INTERVAL_MS = 15_000;

type ApprovedRow = {
  id: string;
  reference: string;
  conversation_id: string | null;
  approved_at: string;
  approved_by_label: string | null;
  data: Extraction;
  source_text: string | null;
  source_type: string | null;
};

type OrderRow = {
  id: string;
  reference: string;
  approved_record_id: string | null;
  status: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  order_reference: string;
  amount: number | string;
  method: string;
  reference: string | null;
  date: string;
  notes: string | null;
  recorded_by_label: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  variant: string | null;
  sku: string | null;
  unit_price: number | string | null;
  selling_price: number | string | null;
  cost_price: number | string | null;
  reorder_level: number | string | null;
  available_stock: number | string | null;
  image_url: string | null;
  quality_tier: string | null;
  attributes: Record<string, unknown> | null;
  created_at: string;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function methodOf(m: string): PaymentMethod {
  return m === "cash" || m === "bank_transfer" || m === "pos" ? m : "other";
}

function productStatus(stock: number, reorder: number): Product["status"] {
  if (stock <= 0) return "out";
  if (stock <= reorder) return "low";
  return "in";
}

function toApproved(r: ApprovedRow): ApprovedRecord {
  const items: ExtractionItem[] = Array.isArray(r.data?.items) ? r.data.items : [];
  const data: Extraction = { ...r.data, items };
  const st = (r.source_type ?? "paste") as ApprovedRecord["sourceType"];
  return {
    id: r.id,
    reference: r.reference,
    conversationId: r.conversation_id ?? r.id,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by_label ?? "You",
    data,
    sourceText: r.source_text ?? "",
    sourceType: (["paste","upload","demo","voice","whatsapp_audio"] as const).includes(st)
      ? st
      : "paste",
  };
}

function toPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    orderId: r.order_reference,
    amount: num(r.amount),
    method: methodOf(r.method),
    kind: "payment",
    reference: r.reference ?? "",
    date: r.date,
    notes: r.notes ?? "",
    recordedBy: r.recorded_by_label ?? "You",
    createdAt: r.created_at,
  };
}

function toProduct(r: ProductRow): UserProduct {
  const attrs = (r.attributes ?? {}) as { category?: string; unit?: string; notes?: string };
  const stock = num(r.available_stock);
  const reorder = num(r.reorder_level) || Math.max(1, Math.floor(stock * 0.2));
  const price = num(r.selling_price) || num(r.unit_price);
  const q = (r.quality_tier ?? undefined) as Quality | undefined;
  return {
    id: r.id,
    sku: r.sku ?? r.id.slice(0, 6).toUpperCase(),
    name: r.name,
    category: attrs.category ?? "General",
    price,
    cost: num(r.cost_price) || Math.round(price * 0.7),
    stock,
    reorder,
    unit: attrs.unit ?? "units",
    status: productStatus(stock, reorder),
    image: r.image_url ?? undefined,
    quality: q,
    notes: attrs.notes,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function statusOverridesFrom(orders: OrderRow[], approved: ApprovedRecord[]): OrderStatusOverride[] {
  const byRecord = new Map(approved.map((a) => [a.id, a]));
  const out: OrderStatusOverride[] = [];
  for (const o of orders) {
    const base = o.approved_record_id ? byRecord.get(o.approved_record_id) : undefined;
    const baseStatus = base?.data.order_status;
    if (baseStatus && baseStatus !== o.status) {
      out.push({
        orderId: o.reference,
        status: o.status as OrderStatusOverride["status"],
        cancelledAt: o.status === "cancelled" ? o.updated_at : undefined,
        updatedAt: o.updated_at,
      });
    }
  }
  return out;
}

export async function syncFromCloud(businessId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const [rec, ord, pay, prod] = await Promise.all([
    supabase.from("approved_records")
      .select("id,reference,conversation_id,approved_at,approved_by_label,data,source_text,source_type")
      .eq("business_id", businessId)
      .order("approved_at", { ascending: false }),
    supabase.from("orders")
      .select("id,reference,approved_record_id,status,updated_at")
      .eq("business_id", businessId),
    supabase.from("payments")
      .select("id,order_reference,amount,method,reference,date,notes,recorded_by_label,created_at")
      .eq("business_id", businessId),
    supabase.from("products")
      .select("id,name,variant,sku,unit_price,selling_price,cost_price,reorder_level,available_stock,image_url,quality_tier,attributes,created_at")
      .eq("business_id", businessId)
      .eq("is_active", true),
  ]);

  const approved = (rec.data ?? []).map((r) => toApproved(r as ApprovedRow));
  const payments = (pay.data ?? []).map((r) => toPayment(r as PaymentRow));
  const overrides = statusOverridesFrom((ord.data ?? []) as OrderRow[], approved);
  const products = (prod.data ?? []).map((r) => toProduct(r as ProductRow));

  try {
    window.localStorage.setItem(APPROVED_KEY, JSON.stringify(approved));
    window.localStorage.setItem(PAY_KEY, JSON.stringify(payments));
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    // Notify user-products subscribers.
    window.dispatchEvent(new StorageEvent("storage", { key: PRODUCTS_KEY }));
  } catch (err) {
    console.warn("[cloud-sync] persist failed", err);
  }
}

/**
 * Hydrates local stores from Cloud on mount for real (non-demo) signed-in
 * users. Returns a `ready` flag + tick that callers can key off to re-render.
 * Silent no-op for demo mode or before the business context resolves.
 */
export function useCloudSync(): { ready: boolean; tick: number } {
  const { active: demoActive } = useDemo();
  const { context } = useCurrentBusiness();
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (demoActive) { setReady(true); return; }
    if (!context?.businessId) return;
    let cancelled = false;
    (async () => {
      try {
        const lastRaw = window.localStorage.getItem(LAST_SYNC_KEY);
        const last = lastRaw ? Number(lastRaw) : 0;
        if (Date.now() - last < MIN_INTERVAL_MS && last > 0) {
          if (!cancelled) { setReady(true); setTick((t) => t + 1); }
          return;
        }
        await syncFromCloud(context.businessId);
      } catch (err) {
        console.warn("[cloud-sync] failed", err);
      } finally {
        if (!cancelled) { setReady(true); setTick((t) => t + 1); }
      }
    })();
    return () => { cancelled = true; };
  }, [demoActive, context?.businessId]);

  return { ready, tick };
}
