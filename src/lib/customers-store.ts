// FreBob Customers — prototype store (Batch 6A).
// LocalStorage-backed to match existing records / orders / payments stores.
// Derives orders + payments from the approved-records + orders stores
// so we never duplicate customer/order/payment tables.

import { listOrders, type Order } from "./orders-store";

export type PreferredLanguage =
  | "english"
  | "nigerian_pidgin"
  | "yoruba"
  | "hausa"
  | "igbo";

export const PREFERRED_LANGUAGES: { value: PreferredLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "nigerian_pidgin", label: "Nigerian Pidgin" },
  { value: "yoruba", label: "Yoruba" },
  { value: "hausa", label: "Hausa" },
  { value: "igbo", label: "Igbo" },
];

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  normalizedPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  preferredLanguage: PreferredLanguage | null;
  notesSummary: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerNote = {
  id: string;
  customerId: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type CustomerEventType =
  | "customer_created"
  | "customer_updated"
  | "order_recorded"
  | "payment_recorded"
  | "balance_changed"
  | "note_added";

export type CustomerEvent = {
  id: string;
  customerId: string;
  eventType: CustomerEventType;
  title: string;
  description?: string;
  sourceType?: "order" | "payment" | "manual" | "record";
  sourceRecordId?: string;
  createdBy: string;
  createdAt: string;
};

const CUST_KEY = "frebob.customers.v1";
const NOTE_KEY = "frebob.customerNotes.v1";
const EVENT_KEY = "frebob.customerEvents.v1";
const ORDER_LINK_KEY = "frebob.orderCustomerLinks.v1"; // { orderId: customerId }

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; }
  catch { return []; }
}
function write<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}
function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// ---- Normalisation --------------------------------------------------------

/** Normalise NG numbers to +234XXXXXXXXXX; return null if input has no digits. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (!digits) return null;
  let d = digits.replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0") && d.length === 11) return `+234${d.slice(1)}`;
  if (d.length === 10) return `+234${d}`;
  return `+${d}`;
}

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function trimOrNull(v: string | null | undefined) {
  const t = (v ?? "").trim();
  return t ? t : null;
}

// ---- Order links ----------------------------------------------------------

type OrderLink = { orderId: string; customerId: string };
function readLinks(): OrderLink[] { return read<OrderLink>(ORDER_LINK_KEY); }
function writeLinks(rows: OrderLink[]) { write(ORDER_LINK_KEY, rows); }
export function linkOrderToCustomer(orderId: string, customerId: string) {
  const rows = readLinks().filter((r) => r.orderId !== orderId);
  rows.push({ orderId, customerId });
  writeLinks(rows);
}
export function getCustomerIdForOrder(orderId: string): string | null {
  return readLinks().find((r) => r.orderId === orderId)?.customerId ?? null;
}

// ---- CRUD -----------------------------------------------------------------

export function listCustomers(): Customer[] {
  return read<Customer>(CUST_KEY);
}
export function getCustomer(id: string): Customer | undefined {
  return listCustomers().find((c) => c.id === id);
}

export type CustomerInput = {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  preferredLanguage?: PreferredLanguage | null;
  notesSummary?: string | null;
};

export function createCustomer(input: CustomerInput, createdBy = "You"): Customer {
  const now = new Date().toISOString();
  const phone = trimOrNull(input.phone ?? null);
  const row: Customer = {
    id: nid("cust"),
    name: input.name.trim(),
    phone,
    normalizedPhone: normalizePhone(phone),
    whatsapp: trimOrNull(input.whatsapp ?? null),
    email: trimOrNull(input.email ?? null)?.toLowerCase() ?? null,
    address: trimOrNull(input.address ?? null),
    city: trimOrNull(input.city ?? null),
    state: trimOrNull(input.state ?? null),
    preferredLanguage: input.preferredLanguage ?? null,
    notesSummary: trimOrNull(input.notesSummary ?? null),
    isActive: true,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  const rows = listCustomers();
  rows.push(row);
  write(CUST_KEY, rows);
  addEvent({
    customerId: row.id,
    eventType: "customer_created",
    title: "Customer added",
    description: `Created by ${createdBy}`,
    sourceType: "manual",
    createdBy,
  });
  return row;
}

export function updateCustomer(id: string, patch: Partial<CustomerInput>, updatedBy = "You"): Customer | undefined {
  const rows = listCustomers();
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const existing = rows[idx];
  const phone = patch.phone !== undefined ? trimOrNull(patch.phone) : existing.phone;
  const updated: Customer = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    phone,
    normalizedPhone: normalizePhone(phone),
    whatsapp: patch.whatsapp !== undefined ? trimOrNull(patch.whatsapp) : existing.whatsapp,
    email: patch.email !== undefined ? (trimOrNull(patch.email)?.toLowerCase() ?? null) : existing.email,
    address: patch.address !== undefined ? trimOrNull(patch.address) : existing.address,
    city: patch.city !== undefined ? trimOrNull(patch.city) : existing.city,
    state: patch.state !== undefined ? trimOrNull(patch.state) : existing.state,
    preferredLanguage: patch.preferredLanguage !== undefined ? (patch.preferredLanguage ?? null) : existing.preferredLanguage,
    notesSummary: patch.notesSummary !== undefined ? trimOrNull(patch.notesSummary) : existing.notesSummary,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = updated;
  write(CUST_KEY, rows);
  addEvent({
    customerId: id,
    eventType: "customer_updated",
    title: "Customer details updated",
    description: `Edited by ${updatedBy}`,
    sourceType: "manual",
    createdBy: updatedBy,
  });
  return updated;
}

// ---- Duplicate detection --------------------------------------------------

export type DuplicateMatch = {
  customer: Customer;
  reason: "phone" | "email" | "name_phone";
  strength: "strong" | "possible";
};

function similarName(a: string, b: string) {
  const na = a.toLowerCase().replace(/\s+/g, " ").trim();
  const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [af] = na.split(" ");
  const [bf] = nb.split(" ");
  return af === bf && (na.includes(nb) || nb.includes(na));
}

export function findDuplicates(input: CustomerInput, excludeId?: string): DuplicateMatch[] {
  const rows = listCustomers().filter((c) => c.id !== excludeId);
  const normPhone = normalizePhone(input.phone ?? null);
  const emailLower = input.email ? input.email.trim().toLowerCase() : null;
  const matches: DuplicateMatch[] = [];
  for (const c of rows) {
    if (normPhone && c.normalizedPhone && c.normalizedPhone === normPhone) {
      matches.push({ customer: c, reason: "phone", strength: "strong" }); continue;
    }
    if (emailLower && c.email && c.email === emailLower) {
      matches.push({ customer: c, reason: "email", strength: "strong" }); continue;
    }
    if (input.name && similarName(input.name, c.name) && normPhone && c.normalizedPhone && c.normalizedPhone.slice(-6) === normPhone.slice(-6)) {
      matches.push({ customer: c, reason: "name_phone", strength: "possible" });
    }
  }
  return matches;
}

// ---- Notes ----------------------------------------------------------------

export function listNotes(customerId: string): CustomerNote[] {
  return read<CustomerNote>(NOTE_KEY)
    .filter((n) => n.customerId === customerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addNote(customerId: string, note: string, createdBy = "You"): CustomerNote {
  const row: CustomerNote = {
    id: nid("note"), customerId, note: note.trim(),
    createdBy, createdAt: new Date().toISOString(),
  };
  const rows = read<CustomerNote>(NOTE_KEY);
  rows.push(row);
  write(NOTE_KEY, rows);
  addEvent({
    customerId, eventType: "note_added",
    title: "Note added",
    description: note.trim().slice(0, 120),
    sourceType: "manual",
    createdBy,
  });
  return row;
}

// ---- Events ---------------------------------------------------------------

export function addEvent(input: Omit<CustomerEvent, "id" | "createdAt"> & { createdAt?: string }): CustomerEvent {
  const row: CustomerEvent = {
    id: nid("evt"),
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
  };
  const rows = read<CustomerEvent>(EVENT_KEY);
  rows.push(row);
  write(EVENT_KEY, rows);
  return row;
}

function persistedEvents(customerId: string): CustomerEvent[] {
  return read<CustomerEvent>(EVENT_KEY).filter((e) => e.customerId === customerId);
}

// ---- Order/payment derivation --------------------------------------------

function orderMatchesCustomer(order: Order, c: Customer): boolean {
  const explicit = getCustomerIdForOrder(order.id);
  if (explicit) return explicit === c.id;
  // Strong match: normalised phone
  const orderPhoneN = normalizePhone(order.customerPhone);
  if (orderPhoneN && c.normalizedPhone && orderPhoneN === c.normalizedPhone) return true;
  // Fallback: exact case-insensitive name when neither party has a phone
  if (!orderPhoneN && !c.normalizedPhone && order.customerName && c.name) {
    return order.customerName.trim().toLowerCase() === c.name.trim().toLowerCase();
  }
  return false;
}

export type CustomerMetrics = {
  totalOrders: number;
  validOrders: Order[];
  totalSpent: number;
  amountPaid: number;
  outstanding: number;
  lastOrderAt: string | null;
  lastActivityAt: string;
  isRepeat: boolean;
  hasBalance: boolean;
  unpaidOrderCount: number;
  oldestUnpaidAt: string | null;
  lastPaymentAt: string | null;
};

export function getCustomerOrders(customerId: string): Order[] {
  const cust = getCustomer(customerId);
  if (!cust) return [];
  return listOrders()
    .filter((o) => orderMatchesCustomer(o, cust))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function computeMetrics(customerId: string): CustomerMetrics {
  const orders = getCustomerOrders(customerId);
  const valid = orders.filter((o) => o.orderStatus !== "cancelled");
  const totalSpent = valid.reduce((s, o) => s + o.total, 0);
  const amountPaid = valid.reduce((s, o) => s + o.paid, 0);
  const outstanding = Math.max(valid.reduce((s, o) => s + o.balance, 0), 0);
  const unpaid = valid.filter((o) => o.balance > 0).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const allPayments = valid.flatMap((o) => o.payments);
  const lastPay = allPayments.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const cust = getCustomer(customerId);
  const lastOrderAt = valid[0]?.createdAt ?? null;
  const eventsAt = persistedEvents(customerId).map((e) => e.createdAt);
  const lastActivityAt = [lastOrderAt, lastPay?.date, ...eventsAt, cust?.updatedAt]
    .filter((v): v is string => !!v)
    .sort()
    .slice(-1)[0] ?? cust?.createdAt ?? new Date().toISOString();
  return {
    totalOrders: valid.length,
    validOrders: valid,
    totalSpent, amountPaid, outstanding,
    lastOrderAt,
    lastActivityAt,
    isRepeat: valid.length >= 2,
    hasBalance: outstanding > 0,
    unpaidOrderCount: unpaid.length,
    oldestUnpaidAt: unpaid[0]?.createdAt ?? null,
    lastPaymentAt: lastPay?.date ?? null,
  };
}

export type CustomerStatus = "new" | "repeat" | "has_balance" | "active" | "inactive";

export function primaryStatus(c: Customer, m: CustomerMetrics): CustomerStatus {
  if (m.hasBalance) return "has_balance";
  if (m.isRepeat) return "repeat";
  if (!c.isActive) return "inactive";
  if (m.totalOrders === 0) return "new";
  const days = (Date.now() - new Date(m.lastActivityAt).getTime()) / 86_400_000;
  if (days > 60) return "inactive";
  if (m.totalOrders === 1) return "new";
  return "active";
}

export function statusLabel(s: CustomerStatus): string {
  return s === "has_balance" ? "Has balance"
    : s === "repeat" ? "Repeat"
    : s === "new" ? "New"
    : s === "inactive" ? "Inactive"
    : "Active";
}

// ---- Composite timeline --------------------------------------------------

export type TimelineItem = {
  time: string;
  title: string;
  description?: string;
  kind: CustomerEventType;
  linkLabel?: string;
  linkTo?: string;
};

export function buildTimeline(customerId: string): TimelineItem[] {
  const events = persistedEvents(customerId);
  const orders = getCustomerOrders(customerId);
  const items: TimelineItem[] = events.map((e) => ({
    time: e.createdAt, title: e.title, description: e.description, kind: e.eventType,
  }));
  for (const o of orders) {
    items.push({
      time: o.createdAt,
      title: `Order ${o.id} recorded`,
      description: `${o.itemCount} item${o.itemCount === 1 ? "" : "s"} · ${formatMoney(o.total)}`,
      kind: "order_recorded",
      linkLabel: "View order",
      linkTo: `/orders/${o.id}`,
    });
    for (const p of o.payments) {
      items.push({
        time: p.date,
        title: `Payment received · ${formatMoney(p.amount)}`,
        description: `Order ${o.id}`,
        kind: "payment_recorded",
        linkLabel: "View order",
        linkTo: `/orders/${o.id}`,
      });
    }
  }
  return items.sort((a, b) => (a.time < b.time ? 1 : -1));
}

// ---- Summary --------------------------------------------------------------

export type CustomersSummary = {
  total: number;
  repeat: number;
  withBalance: number;
  newThisMonth: number;
  totalOutstanding: number;
};

export function summariseCustomers(): CustomersSummary {
  const rows = listCustomers();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  let repeat = 0, withBal = 0, newThis = 0, outstanding = 0;
  for (const c of rows) {
    const m = computeMetrics(c.id);
    if (m.isRepeat) repeat += 1;
    if (m.hasBalance) { withBal += 1; outstanding += m.outstanding; }
    if (c.createdAt >= monthStart) newThis += 1;
  }
  return { total: rows.length, repeat, withBalance: withBal, newThisMonth: newThis, totalOutstanding: outstanding };
}

// ---- Formatting -----------------------------------------------------------

const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export function formatMoney(n: number) { return NGN.format(n || 0); }
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function languageLabel(l: PreferredLanguage | null): string {
  if (!l) return "—";
  return PREFERRED_LANGUAGES.find((p) => p.value === l)?.label ?? l;
}

export function initialsOf(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
}
