// FreBob Orders & Payments — prototype store.
// Derives orders from approved records (source of truth for the sale/reservation
// itself) and layers additional payments + order-status overrides in
// localStorage. Matches the localStorage-first pattern used in Batch 3 & 4.

import {
  listApprovedRecords,
  type ApprovedRecord,
  type OrderStatus,
  type PaymentStatus,
} from "./records-store";

export type PaymentMethod = "cash" | "bank_transfer" | "pos" | "other";

export type Payment = {
  id: string;
  orderId: string; // matches ApprovedRecord.reference
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string; // ISO
  notes: string;
  recordedBy: string;
  createdAt: string;
};

export type OrderStatusOverride = {
  orderId: string;
  status: OrderStatus;
  cancelledAt?: string;
  updatedAt: string;
};

export type Order = {
  id: string; // human reference e.g. FB-XXXXXX
  recordId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  channel: "paste" | "upload" | "demo";
  sourceText: string;
  items: {
    product_name: string | null;
    variant: string | null;
    quantity: number | null;
    unit_price: number | null;
  }[];
  itemCount: number;
  total: number;
  paidFromRecord: number;
  paidExtra: number;
  paid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryOrPickup: string | null;
  internalNote: string | null;
  payments: Payment[];
};

const PAY_KEY = "frebob.orderPayments.v1";
const STATUS_KEY = "frebob.orderStatusOverrides.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function write<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}
function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// ----- Payments ---------------------------------------------------------------

export function listPayments(orderId?: string): Payment[] {
  const rows = read<Payment>(PAY_KEY);
  const filtered = orderId ? rows.filter((p) => p.orderId === orderId) : rows;
  return filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function recordPayment(input: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date?: string;
  notes?: string;
  recordedBy?: string;
}): Payment {
  const row: Payment = {
    id: nid("pay"),
    orderId: input.orderId,
    amount: Math.max(0, Math.round(input.amount)),
    method: input.method,
    reference: input.reference?.trim() ?? "",
    date: input.date ?? new Date().toISOString(),
    notes: input.notes?.trim() ?? "",
    recordedBy: input.recordedBy ?? "You",
    createdAt: new Date().toISOString(),
  };
  const rows = read<Payment>(PAY_KEY);
  rows.push(row);
  write(PAY_KEY, rows);
  return row;
}

// ----- Status overrides -------------------------------------------------------

export function getStatusOverride(orderId: string): OrderStatusOverride | undefined {
  return read<OrderStatusOverride>(STATUS_KEY).find((r) => r.orderId === orderId);
}

export function setOrderStatus(orderId: string, status: OrderStatus): OrderStatusOverride {
  const rows = read<OrderStatusOverride>(STATUS_KEY).filter((r) => r.orderId !== orderId);
  const row: OrderStatusOverride = {
    orderId,
    status,
    cancelledAt: status === "cancelled" ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };
  rows.push(row);
  write(STATUS_KEY, rows);
  return row;
}

// ----- Order derivation -------------------------------------------------------

function derivePaymentStatus(total: number, paid: number): PaymentStatus {
  if (total <= 0 && paid <= 0) return "unknown";
  if (paid <= 0) return "unpaid";
  if (paid < total) return "partially_paid";
  return "paid";
}

function toOrder(rec: ApprovedRecord, payments: Payment[], override?: OrderStatusOverride): Order {
  const recPays = payments.filter((p) => p.orderId === rec.reference);
  const total = rec.data.total_amount ?? 0;
  const paidFromRecord = rec.data.amount_paid ?? 0;
  const paidExtra = recPays.reduce((s, p) => s + p.amount, 0);
  const paid = paidFromRecord + paidExtra;
  const balance = Math.max(total - paid, 0);
  const paymentStatus = derivePaymentStatus(total, paid);

  // Auto-complete when paid in full unless override says otherwise
  let orderStatus: OrderStatus = override?.status ?? rec.data.order_status;
  if (!override && paymentStatus === "paid" && orderStatus !== "cancelled" && orderStatus !== "completed") {
    // keep record's status; auto-completion happens through explicit updates
  }

  return {
    id: rec.reference,
    recordId: rec.id,
    createdAt: rec.approvedAt,
    customerName: rec.data.customer.name ?? "Walk-in customer",
    customerPhone: rec.data.customer.phone,
    channel: rec.sourceType,
    sourceText: rec.sourceText,
    items: rec.data.items,
    itemCount: rec.data.items.filter((i) => i.product_name).length || rec.data.items.length,
    total,
    paidFromRecord,
    paidExtra,
    paid,
    balance,
    paymentStatus,
    orderStatus,
    deliveryOrPickup: rec.data.delivery_or_pickup,
    internalNote: rec.data.internal_note,
    payments: recPays.sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}

export function listOrders(): Order[] {
  const payments = read<Payment>(PAY_KEY);
  const overrides = read<OrderStatusOverride>(STATUS_KEY);
  return listApprovedRecords()
    .filter((r) => r.data.event_type === "sale_order" || r.data.event_type === "reservation" || r.data.event_type === "enquiry")
    .map((r) => toOrder(r, payments, overrides.find((o) => o.orderId === r.reference)))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(id: string): Order | undefined {
  return listOrders().find((o) => o.id === id);
}

// ----- Timeline ---------------------------------------------------------------

export type TimelineEvent = {
  time: string;
  title: string;
  detail?: string;
  kind: "created" | "payment" | "status" | "cancelled";
};

export function buildTimeline(order: Order): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  events.push({
    time: order.createdAt,
    title: `Order ${order.id} approved`,
    detail: `${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${order.channel}`,
    kind: "created",
  });
  if (order.paidFromRecord > 0) {
    events.push({
      time: order.createdAt,
      title: "Initial payment on record",
      detail: `${formatMoney(order.paidFromRecord)} captured at approval`,
      kind: "payment",
    });
  }
  for (const p of order.payments.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) {
    events.push({
      time: p.date,
      title: `Payment received · ${formatMoney(p.amount)}`,
      detail: `${methodLabel(p.method)}${p.reference ? ` · ref ${p.reference}` : ""}`,
      kind: "payment",
    });
  }
  const override = getStatusOverride(order.id);
  if (override) {
    events.push({
      time: override.updatedAt,
      title: override.status === "cancelled" ? "Order cancelled" : `Status updated to ${statusLabel(override.status)}`,
      kind: override.status === "cancelled" ? "cancelled" : "status",
    });
  }
  return events.sort((a, b) => (a.time < b.time ? -1 : 1));
}

// ----- Labels & formatting ----------------------------------------------------

const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export function formatMoney(n: number) { return NGN.format(n || 0); }

export function methodLabel(m: PaymentMethod) {
  return m === "cash" ? "Cash" : m === "bank_transfer" ? "Bank transfer" : m === "pos" ? "POS" : "Other";
}

export function statusLabel(s: OrderStatus) {
  switch (s) {
    case "enquiry": return "Inquiry";
    case "reserved": return "Reserved";
    case "pending": return "Pending";
    case "awaiting_pickup": return "Awaiting pickup";
    case "awaiting_delivery": return "Awaiting delivery";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return "Unknown";
  }
}

export function paymentStatusLabel(s: PaymentStatus) {
  return s === "paid" ? "Paid" : s === "partially_paid" ? "Partially paid" : s === "unpaid" ? "Unpaid" : "—";
}

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "enquiry", "reserved", "pending", "awaiting_pickup", "awaiting_delivery", "completed", "cancelled",
];

// ----- Summary ---------------------------------------------------------------

export type OrdersSummary = {
  total: number;
  pending: number;
  reserved: number;
  completed: number;
  cancelled: number;
  outstandingValue: number;
  receivedValue: number;
  salesValue: number;
};

export function summariseOrders(orders: Order[]): OrdersSummary {
  const s: OrdersSummary = {
    total: orders.length, pending: 0, reserved: 0, completed: 0, cancelled: 0,
    outstandingValue: 0, receivedValue: 0, salesValue: 0,
  };
  for (const o of orders) {
    if (o.orderStatus === "pending" || o.orderStatus === "awaiting_pickup" || o.orderStatus === "awaiting_delivery") s.pending += 1;
    else if (o.orderStatus === "reserved") s.reserved += 1;
    else if (o.orderStatus === "completed") s.completed += 1;
    else if (o.orderStatus === "cancelled") s.cancelled += 1;

    if (o.orderStatus !== "cancelled") {
      s.salesValue += o.total;
      s.receivedValue += o.paid;
      s.outstandingValue += o.balance;
    }
  }
  return s;
}
