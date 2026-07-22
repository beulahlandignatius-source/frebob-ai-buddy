// FreBob — Batch 9A: Smart Notification Centre.
// LocalStorage-backed prototype store consistent with other FreBob stores.
// Operational records generate notifications; humans read, dismiss, and act.

import { listUserProducts } from "./user-products-store";
import { lowStock as demoLowStock } from "./mock-data";
import { listOrders, listPayments } from "./orders-store";
import { listCustomers, computeMetrics } from "./customers-store";
import { summariseDuplicates } from "./duplicates-store";
import { listScans } from "./scanner-store";
import { listApprovedRecords } from "./records-store";

export type NotifCategory =
  | "inventory"
  | "order"
  | "payment"
  | "customer"
  | "scanner"
  | "report"
  | "ai"
  | "system";

export type NotifPriority = "critical" | "high" | "medium" | "low" | "info";

export type NotifActionKind =
  | "view_product"
  | "view_order"
  | "record_payment"
  | "view_customer"
  | "review_scan"
  | "convert_scan"
  | "view_report"
  | "open_bob"
  | "review_duplicates"
  | "open_business_setup";

export type NotifAction = { kind: NotifActionKind; label: string; href: string };

export type Notification = {
  id: string;
  businessId: string;
  userId: string;
  category: NotifCategory;
  priority: NotifPriority;
  title: string;
  description: string;
  relatedModule: string;
  relatedRecordId: string | null;
  actionUrl: string;
  action: NotifAction | null;
  dedupeKey: string; // stable identity for a live event
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
};

export type NotifSettings = Record<NotifCategory, boolean>;

const KEY = "frebob.notifications.v1";
const SETTINGS_KEY = "frebob.notifications.settings.v1";
const LAST_GEN_KEY = "frebob.notifications.lastgen.v1";
const DEFAULT_BUSINESS = "demo-business";
const DEFAULT_USER = "demo-user";

const isBrowser = () => typeof window !== "undefined";
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() { listeners.forEach((fn) => fn()); }

function read(): Notification[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Notification[]; }
  catch { return []; }
}
function write(items: Notification[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export const DEFAULT_SETTINGS: NotifSettings = {
  inventory: true, order: true, payment: true, customer: true,
  scanner: true, report: true, ai: true, system: true,
};

export function getSettings(): NotifSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return raw ? { ...DEFAULT_SETTINGS, ...raw } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
export function setSettings(patch: Partial<NotifSettings>) {
  const next = { ...getSettings(), ...patch };
  if (isBrowser()) localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  emit();
}

// -------------------------------------------- CRUD

export function listNotifications(): Notification[] {
  return [...read()].sort((a, b) => {
    // critical first, then newest first
    const pw = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (pw !== 0) return pw;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function unreadCount(): number {
  return read().filter((n) => !n.isRead).length;
}

export function criticalUnread(): Notification[] {
  return listNotifications().filter((n) => n.priority === "critical" && !n.isRead);
}

export function markRead(id: string) {
  const now = new Date().toISOString();
  write(read().map((n) => (n.id === id ? { ...n, isRead: true, readAt: now, updatedAt: now } : n)));
}
export function markUnread(id: string) {
  const now = new Date().toISOString();
  write(read().map((n) => (n.id === id ? { ...n, isRead: false, readAt: null, updatedAt: now } : n)));
}
export function markAllRead() {
  const now = new Date().toISOString();
  write(read().map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: now, updatedAt: now })));
}
export function dismiss(id: string) {
  write(read().filter((n) => n.id !== id));
}
export function clearAll() { write([]); }

// -------------------------------------------- Upsert with dedupe

type NotifInput = Omit<Notification,
  "id" | "businessId" | "userId" | "isRead" | "createdAt" | "updatedAt" | "readAt">;

function upsert(input: NotifInput): Notification {
  const now = new Date().toISOString();
  const items = read();
  const existing = items.find((n) => n.dedupeKey === input.dedupeKey);
  if (existing) {
    // Do not spam — update timestamp + latest description/priority
    const next: Notification = {
      ...existing,
      title: input.title,
      description: input.description,
      priority: input.priority,
      actionUrl: input.actionUrl,
      action: input.action,
      relatedModule: input.relatedModule,
      relatedRecordId: input.relatedRecordId,
      updatedAt: now,
    };
    write(items.map((n) => (n.id === existing.id ? next : n)));
    return next;
  }
  const created: Notification = {
    ...input,
    id: `nt_${Math.random().toString(36).slice(2, 10)}`,
    businessId: DEFAULT_BUSINESS,
    userId: DEFAULT_USER,
    isRead: false,
    createdAt: now,
    updatedAt: now,
    readAt: null,
  };
  write([created, ...items]);
  return created;
}

// -------------------------------------------- Priority helpers

function priorityWeight(p: NotifPriority) {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[p];
}

export const PRIORITY_LABEL: Record<NotifPriority, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info",
};

export const CATEGORY_LABEL: Record<NotifCategory, string> = {
  inventory: "Inventory", order: "Orders", payment: "Payments", customer: "Customers",
  scanner: "Scanner", report: "Reports", ai: "AI Assistant", system: "System",
};

// -------------------------------------------- Grouping

export type GroupKey = "today" | "yesterday" | "this_week" | "this_month" | "older";
export const GROUP_LABEL: Record<GroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "Earlier this week",
  this_month: "Earlier this month",
  older: "Older",
};

export function groupOf(iso: string, now = new Date()): GroupKey {
  const d = new Date(iso);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const wk = new Date(today); wk.setDate(wk.getDate() - 7);
  const mo = new Date(today); mo.setDate(mo.getDate() - 30);
  if (d >= today) return "today";
  if (d >= y) return "yesterday";
  if (d >= wk) return "this_week";
  if (d >= mo) return "this_month";
  return "older";
}

export function timeAgo(iso: string, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// -------------------------------------------- Generation

// Reads live stores, upserts notifications per rule. Idempotent.
export function generateNotifications(): { created: number; total: number } {
  if (!isBrowser()) return { created: 0, total: 0 };
  const settings = getSettings();
  const before = read().length;

  // Inventory: low / out of stock
  if (settings.inventory) {
    const user = listUserProducts();
    const combined = [
      ...user.map((p) => ({
        id: p.id, name: p.name, stock: p.stock, reorder: p.reorder, unit: p.unit,
      })),
      ...demoLowStock.map((p) => ({
        id: p.id, name: p.name, stock: p.stock, reorder: p.reorder, unit: p.unit,
      })),
    ];
    for (const p of combined) {
      const out = p.stock <= 0;
      const low = !out && p.stock <= p.reorder;
      if (!out && !low) continue;
      upsert({
        category: "inventory",
        priority: out ? "critical" : "high",
        title: out ? "Out of stock" : "Low stock",
        description: out
          ? `${p.name} has run out. Restock to keep sales going.`
          : `${p.name} is at ${p.stock} ${p.unit} (reorder at ${p.reorder}).`,
        relatedModule: "inventory",
        relatedRecordId: p.id,
        actionUrl: "/inventory",
        action: { kind: "view_product", label: "View product", href: "/inventory" },
        dedupeKey: `inventory:${out ? "out" : "low"}:${p.id}`,
      });
    }
  }

  // Orders: pending, cancelled, new
  if (settings.order) {
    const orders = listOrders();
    for (const o of orders) {
      if (o.orderStatus === "cancelled") {
        upsert({
          category: "order",
          priority: "medium",
          title: "Order cancelled",
          description: `Order ${o.orderNumber} was cancelled.`,
          relatedModule: "orders",
          relatedRecordId: o.id,
          actionUrl: `/orders/${o.id}`,
          action: { kind: "view_order", label: "View order", href: `/orders/${o.id}` },
          dedupeKey: `order:cancelled:${o.id}`,
        });
        continue;
      }
      if (o.orderStatus === "pending" || o.orderStatus === "processing") {
        upsert({
          category: "order",
          priority: "high",
          title: "Order awaiting action",
          description: `${o.orderNumber} is ${o.orderStatus.replace("_", " ")}.`,
          relatedModule: "orders",
          relatedRecordId: o.id,
          actionUrl: `/orders/${o.id}`,
          action: { kind: "view_order", label: "View order", href: `/orders/${o.id}` },
          dedupeKey: `order:pending:${o.id}`,
        });
      }
      if (o.orderStatus === "awaiting_delivery" || o.orderStatus === "awaiting_pickup") {
        upsert({
          category: "order",
          priority: "medium",
          title: o.orderStatus === "awaiting_pickup" ? "Awaiting pickup" : "Awaiting delivery",
          description: `${o.orderNumber} is ready — customer collection pending.`,
          relatedModule: "orders",
          relatedRecordId: o.id,
          actionUrl: `/orders/${o.id}`,
          action: { kind: "view_order", label: "View order", href: `/orders/${o.id}` },
          dedupeKey: `order:${o.orderStatus}:${o.id}`,
        });
      }
    }
  }

  // Payments: outstanding + recently recorded
  if (settings.payment) {
    const orders = listOrders();
    for (const o of orders) {
      if (o.balance > 0 && o.orderStatus !== "cancelled") {
        upsert({
          category: "payment",
          priority: o.balance > 100000 ? "high" : "medium",
          title: "Outstanding balance",
          description: `${o.orderNumber} still owes ₦${o.balance.toLocaleString("en-NG")}.`,
          relatedModule: "orders",
          relatedRecordId: o.id,
          actionUrl: `/orders/${o.id}/payment`,
          action: { kind: "record_payment", label: "Record payment", href: `/orders/${o.id}/payment` },
          dedupeKey: `payment:outstanding:${o.id}`,
        });
      }
    }
    // Recent payments (informational)
    const payments = listPayments().slice(0, 20);
    for (const p of payments) {
      upsert({
        category: "payment",
        priority: "info",
        title: "Payment recorded",
        description: `₦${p.amount.toLocaleString("en-NG")} received via ${p.method.replace("_", " ")}.`,
        relatedModule: "orders",
        relatedRecordId: p.orderId,
        actionUrl: `/orders/${p.orderId}`,
        action: { kind: "view_order", label: "View order", href: `/orders/${p.orderId}` },
        dedupeKey: `payment:recorded:${p.id}`,
      });
    }
  }

  // Customers: outstanding balances + duplicates
  if (settings.customer) {
    const customers = listCustomers();
    for (const c of customers) {
      const m = computeMetrics(c.id);
      if (m.balance > 0) {
        upsert({
          category: "customer",
          priority: m.balance > 200000 ? "high" : "medium",
          title: "Customer has balance",
          description: `${c.name} owes ₦${m.balance.toLocaleString("en-NG")}.`,
          relatedModule: "customers",
          relatedRecordId: c.id,
          actionUrl: `/customers/${c.id}`,
          action: { kind: "view_customer", label: "View customer", href: `/customers/${c.id}` },
          dedupeKey: `customer:balance:${c.id}`,
        });
      }
    }
    const dup = summariseDuplicates();
    if (dup.pendingGroups > 0) {
      upsert({
        category: "customer",
        priority: "high",
        title: "Duplicate customers detected",
        description: `${dup.pendingGroups} customer${dup.pendingGroups === 1 ? "" : "s"} may be duplicated. Review before merging.`,
        relatedModule: "customers",
        relatedRecordId: null,
        actionUrl: "/customers/duplicates",
        action: { kind: "review_duplicates", label: "Review duplicates", href: "/customers/duplicates" },
        dedupeKey: `customer:duplicates:pending`,
      });
    }
  }

  // Scanner: review required, extraction failed, conversion ready
  if (settings.scanner) {
    const scans = listScans();
    for (const s of scans) {
      if (s.status === "extraction_failed") {
        upsert({
          category: "scanner",
          priority: "high",
          title: "Extraction failed",
          description: `${s.title || "Scan"} could not be read. Retry or edit manually.`,
          relatedModule: "scanner",
          relatedRecordId: s.id,
          actionUrl: `/scanner/${s.id}`,
          action: { kind: "review_scan", label: "Review scan", href: `/scanner/${s.id}` },
          dedupeKey: `scanner:failed:${s.id}`,
        });
        continue;
      }
      if (s.reviewStatus === "unreviewed" || s.reviewStatus === "in_progress") {
        upsert({
          category: "scanner",
          priority: "medium",
          title: "Scan review required",
          description: `${s.title || "New scan"} is waiting for your approval.`,
          relatedModule: "scanner",
          relatedRecordId: s.id,
          actionUrl: `/scanner/${s.id}`,
          action: { kind: "review_scan", label: "Review scan", href: `/scanner/${s.id}` },
          dedupeKey: `scanner:review:${s.id}`,
        });
      }
      if (s.status === "approved" && s.reviewStatus === "approved") {
        upsert({
          category: "scanner",
          priority: "low",
          title: "Conversion ready",
          description: `${s.title || "Scan"} approved. Convert to an order, payment or stock update.`,
          relatedModule: "scanner",
          relatedRecordId: s.id,
          actionUrl: `/scanner/${s.id}/convert`,
          action: { kind: "convert_scan", label: "Convert now", href: `/scanner/${s.id}/convert` },
          dedupeKey: `scanner:convert:${s.id}`,
        });
      }
    }
  }

  // Reports: weekly summary if approved records exist
  if (settings.report) {
    const records = listApprovedRecords();
    if (records.length > 0) {
      const week = weekTag(new Date());
      upsert({
        category: "report",
        priority: "info",
        title: "Weekly summary available",
        description: `Your ${week} sales, payments and stock recap is ready.`,
        relatedModule: "reports",
        relatedRecordId: null,
        actionUrl: "/reports?preset=this_week&compare=previous",
        action: { kind: "view_report", label: "View report", href: "/reports?preset=this_week&compare=previous" },
        dedupeKey: `report:weekly:${week}`,
      });
    }
  }

  // AI: nudge to talk to Bob if there are open recommendations
  if (settings.ai) {
    const unresolved = read().filter((n) => n.priority === "high" || n.priority === "critical").length;
    if (unresolved >= 3) {
      upsert({
        category: "ai",
        priority: "low",
        title: "Ask Bob for a plan",
        description: `You have ${unresolved} priority alerts. Bob can suggest what to handle first.`,
        relatedModule: "ai",
        relatedRecordId: null,
        actionUrl: "/ai-assistant",
        action: { kind: "open_bob", label: "Open Bob", href: "/ai-assistant" },
        dedupeKey: `ai:plan:${new Date().toISOString().slice(0, 10)}`,
      });
    }
  }

  // System: welcome
  if (settings.system) {
    upsert({
      category: "system",
      priority: "info",
      title: "Welcome to FreBob",
      description: "Your smart business assistant is set up. Explore the dashboard to get started.",
      relatedModule: "system",
      relatedRecordId: null,
      actionUrl: "/dashboard",
      action: null,
      dedupeKey: "system:welcome",
    });
  }

  if (isBrowser()) localStorage.setItem(LAST_GEN_KEY, new Date().toISOString());
  const after = read().length;
  return { created: Math.max(0, after - before), total: after };
}

function weekTag(d: Date) {
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const wk = Math.ceil((days + start.getDay() + 1) / 7);
  return `W${wk} ${y}`;
}

// -------------------------------------------- Summary

export type NotifSummary = {
  total: number;
  unread: number;
  critical: number;
  today: number;
  thisWeek: number;
};

export function summarise(): NotifSummary {
  const items = read();
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const wkStart = new Date(today); wkStart.setDate(wkStart.getDate() - 6);
  return {
    total: items.length,
    unread: items.filter((n) => !n.isRead).length,
    critical: items.filter((n) => n.priority === "critical" && !n.isRead).length,
    today: items.filter((n) => new Date(n.createdAt) >= today).length,
    thisWeek: items.filter((n) => new Date(n.createdAt) >= wkStart).length,
  };
}
