// Single source of truth for FreBob reports.
// Pure functions over existing local stores — no side effects, no fetches.
// Rule: operational records calculate numbers; AI only explains them.
//
// Exclusions applied consistently:
//   - orderStatus === "cancelled"        → excluded from sales/AOV/completion base
//   - payments belong to non-cancelled orders → we exclude payments on cancelled orders
//   - customers.createdBy source only counts manually-created customers
//     (matches customers-store's contract)
//
// Note for Batch 8B: the return shapes here are stable, so a future cached
// summary table can slot in behind the same signatures.

import { listOrders, type Order, type PaymentMethod, methodLabel, statusLabel } from "@/lib/orders-store";
import { listCustomers, computeMetrics, type Customer } from "@/lib/customers-store";
import { listUserProducts, type UserProduct } from "@/lib/user-products-store";
import { inventory as demoInventory, type Product } from "@/lib/mock-data";
import { listInventoryEvents, type InventoryEvent } from "@/lib/inventory-events-store";
import { listApprovedRecords } from "@/lib/records-store";
import { buildBuckets, inRange, type DateRange } from "./period";

// ---------- helpers ----------
export function validOrders(all = listOrders()): Order[] {
  return all.filter((o) => o.orderStatus !== "cancelled");
}
function ordersCreatedIn(range: DateRange, all = listOrders()): Order[] {
  return all.filter((o) => inRange(o.createdAt, range));
}
function paymentsIn(range: DateRange, all = listOrders()) {
  const rows: { order: Order; date: string; amount: number; method: PaymentMethod }[] = [];
  for (const o of all) {
    if (o.orderStatus === "cancelled") continue;
    for (const p of o.payments) if (inRange(p.date, range)) {
      rows.push({ order: o, date: p.date, amount: p.amount, method: p.method });
    }
    // paidFromRecord captured at approval time
    if (o.paidFromRecord > 0 && inRange(o.createdAt, range)) {
      rows.push({ order: o, date: o.createdAt, amount: o.paidFromRecord, method: "other" });
    }
  }
  return rows;
}

// ---------- Sales ----------
export type SalesReport = {
  totals: {
    grossOrderValue: number;
    validSales: number;
    completedSales: number;
    cancelledValue: number;
    orderCount: number;
    completedOrderCount: number;
    avgOrderValue: number;
    highestOrder: { id: string; total: number } | null;
    bestDay: { label: string; total: number } | null;
  };
  trend: { key: string; label: string; sales: number; previous?: number }[];
  byProduct: { name: string; variant: string | null; quantity: number; sales: number; avgPrice: number; orders: number; share: number }[];
  byCategory: { category: string; quantity: number; sales: number; share: number }[] | null;
  byDay: { date: string; label: string; orders: number; sales: number; received: number; outstandingCreated: number }[];
};

export function getSalesReport(range: DateRange, compareRange?: DateRange | null): SalesReport {
  const all = listOrders();
  const inR = ordersCreatedIn(range, all);
  const valid = inR.filter((o) => o.orderStatus !== "cancelled");
  const cancelled = inR.filter((o) => o.orderStatus === "cancelled");
  const completed = valid.filter((o) => o.orderStatus === "completed");

  const grossOrderValue = inR.reduce((s, o) => s + o.total, 0);
  const validSales = valid.reduce((s, o) => s + o.total, 0);
  const completedSales = completed.reduce((s, o) => s + o.total, 0);
  const cancelledValue = cancelled.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = valid.length ? validSales / valid.length : 0;
  const highest = valid.slice().sort((a, b) => b.total - a.total)[0];

  const buckets = buildBuckets(range);
  const compareBuckets = compareRange ? buildBuckets(compareRange) : null;
  const trend = buckets.map((b, i) => {
    const sales = valid.filter((o) => inRange(o.createdAt, { ...range, from: b.from, to: b.to }))
      .reduce((s, o) => s + o.total, 0);
    let previous: number | undefined;
    if (compareBuckets && compareBuckets[i]) {
      const cb = compareBuckets[i];
      previous = validOrders(all)
        .filter((o) => inRange(o.createdAt, { ...range, from: cb.from, to: cb.to }))
        .reduce((s, o) => s + o.total, 0);
    }
    return { key: b.key, label: b.label, sales, previous };
  });

  // By-product
  type Row = { name: string; variant: string | null; quantity: number; sales: number; orders: Set<string> };
  const rowMap = new Map<string, Row>();
  for (const o of valid) {
    for (const it of o.items) {
      if (!it.product_name) continue;
      const k = `${it.product_name.toLowerCase()}|${it.variant?.toLowerCase() ?? ""}`;
      const r = rowMap.get(k) ?? { name: it.product_name, variant: it.variant, quantity: 0, sales: 0, orders: new Set() };
      r.quantity += it.quantity ?? 0;
      r.sales += (it.quantity ?? 0) * (it.unit_price ?? 0);
      r.orders.add(o.id);
      rowMap.set(k, r);
    }
  }
  const totalProductSales = [...rowMap.values()].reduce((s, r) => s + r.sales, 0);
  const byProduct = [...rowMap.values()]
    .map((r) => ({
      name: r.name, variant: r.variant, quantity: r.quantity, sales: r.sales,
      avgPrice: r.quantity ? r.sales / r.quantity : 0,
      orders: r.orders.size,
      share: totalProductSales ? (r.sales / totalProductSales) * 100 : 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  // By-category — matches on product name in known inventory (mock + user).
  const catalog = new Map<string, string>();
  for (const p of [...demoInventory, ...listUserProducts()]) catalog.set(p.name.toLowerCase(), p.category);
  const catMap = new Map<string, { quantity: number; sales: number }>();
  for (const r of byProduct) {
    const cat = catalog.get(r.name.toLowerCase());
    if (!cat) continue;
    const c = catMap.get(cat) ?? { quantity: 0, sales: 0 };
    c.quantity += r.quantity; c.sales += r.sales;
    catMap.set(cat, c);
  }
  const catTotal = [...catMap.values()].reduce((s, c) => s + c.sales, 0);
  const byCategory = catMap.size
    ? [...catMap.entries()]
        .map(([category, c]) => ({ category, ...c, share: catTotal ? (c.sales / catTotal) * 100 : 0 }))
        .sort((a, b) => b.sales - a.sales)
    : null;

  // By-day
  const dayBuckets = buildBuckets(range);
  const byDay = dayBuckets.map((b) => {
    const os = valid.filter((o) => inRange(o.createdAt, { ...range, from: b.from, to: b.to }));
    const received = os.reduce((s, o) => s + o.paid, 0);
    const sales = os.reduce((s, o) => s + o.total, 0);
    return {
      date: b.from.toISOString(), label: b.label, orders: os.length, sales,
      received, outstandingCreated: Math.max(sales - received, 0),
    };
  });

  const bestDay = byDay.slice().sort((a, b) => b.sales - a.sales)[0] ?? null;

  return {
    totals: {
      grossOrderValue, validSales, completedSales, cancelledValue,
      orderCount: valid.length, completedOrderCount: completed.length, avgOrderValue,
      highestOrder: highest ? { id: highest.id, total: highest.total } : null,
      bestDay: bestDay && bestDay.sales > 0 ? { label: bestDay.label, total: bestDay.sales } : null,
    },
    trend, byProduct, byCategory, byDay,
  };
}

// ---------- Payments ----------
export type PaymentsReport = {
  totals: {
    moneyReceived: number;
    paymentCount: number;
    avgPayment: number;
    byMethod: Record<PaymentMethod, number>;
    outstandingCurrent: number;
    outstandingCreatedInPeriod: number;
  };
  methodBreakdown: { method: PaymentMethod; label: string; count: number; amount: number; share: number }[];
  trend: { key: string; label: string; received: number }[];
  outstandingByCustomer: { name: string; phone: string | null; balance: number; unpaidOrders: number; oldestUnpaid: string | null; lastPayment: string | null }[];
  statusBreakdown: { paid: number; partial: number; unpaid: number };
};

export function getPaymentsReport(range: DateRange): PaymentsReport {
  const all = listOrders();
  const pays = paymentsIn(range, all);
  const moneyReceived = pays.reduce((s, p) => s + p.amount, 0);
  const byMethod: Record<PaymentMethod, number> = { cash: 0, bank_transfer: 0, pos: 0, other: 0 };
  const cntMethod: Record<PaymentMethod, number> = { cash: 0, bank_transfer: 0, pos: 0, other: 0 };
  for (const p of pays) { byMethod[p.method] += p.amount; cntMethod[p.method] += 1; }

  const methodBreakdown: PaymentsReport["methodBreakdown"] = (["cash", "bank_transfer", "pos", "other"] as PaymentMethod[]).map((m) => ({
    method: m, label: methodLabel(m), count: cntMethod[m], amount: byMethod[m],
    share: moneyReceived ? (byMethod[m] / moneyReceived) * 100 : 0,
  }));

  const buckets = buildBuckets(range);
  const trend = buckets.map((b) => ({
    key: b.key, label: b.label,
    received: pays.filter((p) => inRange(p.date, { ...range, from: b.from, to: b.to })).reduce((s, p) => s + p.amount, 0),
  }));

  // Outstanding (current, across all open orders)
  const valid = validOrders(all);
  const outstandingCurrent = valid.reduce((s, o) => s + o.balance, 0);
  const outstandingCreatedInPeriod = valid
    .filter((o) => inRange(o.createdAt, range))
    .reduce((s, o) => s + Math.max(o.total - o.paid, 0), 0);

  // Group by customer identity (phone > name)
  type Bucket = { name: string; phone: string | null; balance: number; unpaidOrders: number; oldestUnpaid: string | null; lastPayment: string | null };
  const map = new Map<string, Bucket>();
  for (const o of valid) {
    if (o.balance <= 0) continue;
    const key = o.customerPhone ?? o.customerName;
    const b = map.get(key) ?? { name: o.customerName, phone: o.customerPhone, balance: 0, unpaidOrders: 0, oldestUnpaid: null, lastPayment: null };
    b.balance += o.balance;
    b.unpaidOrders += 1;
    if (!b.oldestUnpaid || o.createdAt < b.oldestUnpaid) b.oldestUnpaid = o.createdAt;
    const lastPay = o.payments[0]?.date;
    if (lastPay && (!b.lastPayment || lastPay > b.lastPayment)) b.lastPayment = lastPay;
    map.set(key, b);
  }
  const outstandingByCustomer = [...map.values()].sort((a, b) => b.balance - a.balance);

  let paid = 0, partial = 0, unpaid = 0;
  for (const o of valid) {
    if (o.paymentStatus === "paid") paid++;
    else if (o.paymentStatus === "partially_paid") partial++;
    else if (o.paymentStatus === "unpaid") unpaid++;
  }

  return {
    totals: {
      moneyReceived, paymentCount: pays.length,
      avgPayment: pays.length ? moneyReceived / pays.length : 0,
      byMethod, outstandingCurrent, outstandingCreatedInPeriod,
    },
    methodBreakdown, trend, outstandingByCustomer,
    statusBreakdown: { paid, partial, unpaid },
  };
}

// ---------- Orders ----------
export type OrdersReport = {
  totals: {
    total: number;
    completed: number;
    pending: number;
    reserved: number;
    cancelled: number;
    avgOrderValue: number;
    completionRate: number | null;
    cancellationRate: number | null;
  };
  statusTrend: { key: string; label: string; created: number; completed: number; cancelled: number }[];
  byDay: { date: string; label: string; created: number; completed: number; cancelled: number; total: number; outstanding: number }[];
  statusBreakdown: { status: string; label: string; count: number }[];
  delayed: { id: string; customer: string; status: string; total: number; balance: number; days: number }[];
};

export function getOrdersReport(range: DateRange): OrdersReport {
  const all = ordersCreatedIn(range);
  const valid = all.filter((o) => o.orderStatus !== "cancelled");
  const completed = valid.filter((o) => o.orderStatus === "completed");
  const pending = all.filter((o) => o.orderStatus === "pending" || o.orderStatus === "awaiting_pickup" || o.orderStatus === "awaiting_delivery");
  const reserved = all.filter((o) => o.orderStatus === "reserved");
  const cancelled = all.filter((o) => o.orderStatus === "cancelled");

  const completionRate = valid.length ? (completed.length / valid.length) * 100 : null;
  const cancellationRate = all.length ? (cancelled.length / all.length) * 100 : null;
  const avgOrderValue = valid.length ? valid.reduce((s, o) => s + o.total, 0) / valid.length : 0;

  const buckets = buildBuckets(range);
  const statusTrend = buckets.map((b) => {
    const created = all.filter((o) => inRange(o.createdAt, { ...range, from: b.from, to: b.to }));
    return {
      key: b.key, label: b.label,
      created: created.length,
      completed: created.filter((o) => o.orderStatus === "completed").length,
      cancelled: created.filter((o) => o.orderStatus === "cancelled").length,
    };
  });
  const byDay = buckets.map((b) => {
    const created = all.filter((o) => inRange(o.createdAt, { ...range, from: b.from, to: b.to }));
    return {
      date: b.from.toISOString(), label: b.label,
      created: created.length,
      completed: created.filter((o) => o.orderStatus === "completed").length,
      cancelled: created.filter((o) => o.orderStatus === "cancelled").length,
      total: created.reduce((s, o) => s + o.total, 0),
      outstanding: created.reduce((s, o) => s + (o.orderStatus === "cancelled" ? 0 : o.balance), 0),
    };
  });

  const statusList = ["enquiry", "reserved", "pending", "awaiting_pickup", "awaiting_delivery", "completed", "cancelled"] as const;
  const statusBreakdown = statusList.map((s) => ({
    status: s, label: statusLabel(s),
    count: all.filter((o) => o.orderStatus === s).length,
  }));

  const now = Date.now();
  const delayed = pending
    .map((o) => ({
      id: o.id, customer: o.customerName, status: statusLabel(o.orderStatus),
      total: o.total, balance: o.balance,
      days: Math.floor((now - new Date(o.createdAt).getTime()) / 86_400_000),
    }))
    .filter((o) => o.days >= 3)
    .sort((a, b) => b.days - a.days);

  return {
    totals: { total: all.length, completed: completed.length, pending: pending.length, reserved: reserved.length, cancelled: cancelled.length, avgOrderValue, completionRate, cancellationRate },
    statusTrend, byDay, statusBreakdown, delayed,
  };
}

// ---------- Inventory ----------
export type InventoryReport = {
  totals: {
    productCount: number;
    availableUnits: number;
    lowStock: number;
    outOfStock: number;
    adjustedInPeriod: number;
    inventoryValue: number | null; // null when cost coverage incomplete
  };
  statusBreakdown: { in: number; low: number; out: number };
  topSellers: { name: string; quantity: number; sales: number; stock: number; reorder: number; status: Product["status"] }[];
  slowMovers: { name: string; stock: number; category: string }[];
  movements: { key: string; label: string; received: number; sold: number; adjusted: number }[];
  attention: { name: string; reason: string; stock: number; reorder: number; status: Product["status"] }[];
};

export function getInventoryReport(range: DateRange): InventoryReport {
  const products: (Product | UserProduct)[] = [...demoInventory, ...listUserProducts()];
  const productCount = products.length;
  const availableUnits = products.reduce((s, p) => s + Math.max(p.stock, 0), 0);
  const lowStock = products.filter((p) => p.status === "low").length;
  const outOfStock = products.filter((p) => p.status === "out").length;

  const withCost = products.filter((p) => typeof p.cost === "number" && p.cost > 0);
  const coverageComplete = withCost.length === products.length && products.length > 0;
  const inventoryValue = coverageComplete ? products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0) : null;

  const events = listInventoryEvents().filter((e) => inRange(e.createdAt, range));
  const adjustedInPeriod = new Set(events.map((e) => e.productName.toLowerCase())).size;

  const sales = getSalesReport(range);
  const salesByName = new Map(sales.byProduct.map((r) => [r.name.toLowerCase(), r]));

  const topSellers = products
    .map((p) => {
      const sr = salesByName.get(p.name.toLowerCase());
      return { name: p.name, quantity: sr?.quantity ?? 0, sales: sr?.sales ?? 0, stock: p.stock, reorder: p.reorder, status: p.status };
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const slowMovers = products
    .filter((p) => p.stock > 0 && !salesByName.has(p.name.toLowerCase()))
    .map((p) => ({ name: p.name, stock: p.stock, category: p.category }))
    .slice(0, 10);

  const buckets = buildBuckets(range);
  const movements = buckets.map((b) => {
    const evs: InventoryEvent[] = events.filter((e) => inRange(e.createdAt, { ...range, from: b.from, to: b.to }));
    return {
      key: b.key, label: b.label,
      received: evs.filter((e) => e.eventType === "received").reduce((s, e) => s + e.quantityDelta, 0),
      sold: -evs.filter((e) => e.eventType === "sold").reduce((s, e) => s + e.quantityDelta, 0),
      adjusted: evs.filter((e) => e.eventType === "adjusted" || e.eventType === "corrected").reduce((s, e) => s + Math.abs(e.quantityDelta), 0),
    };
  });

  const attention: InventoryReport["attention"] = [];
  for (const p of products) {
    if (p.status === "out") attention.push({ name: p.name, reason: "Out of stock", stock: p.stock, reorder: p.reorder, status: p.status });
    else if (p.status === "low") attention.push({ name: p.name, reason: "Below reorder level", stock: p.stock, reorder: p.reorder, status: p.status });
  }
  // Prioritise top-sellers among attention
  attention.sort((a, b) => (salesByName.get(b.name.toLowerCase())?.sales ?? 0) - (salesByName.get(a.name.toLowerCase())?.sales ?? 0));

  return {
    totals: { productCount, availableUnits, lowStock, outOfStock, adjustedInPeriod, inventoryValue },
    statusBreakdown: {
      in: products.filter((p) => p.status === "in").length,
      low: lowStock, out: outOfStock,
    },
    topSellers, slowMovers, movements, attention,
  };
}

// ---------- Customers ----------
export type CustomersReport = {
  totals: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    withBalance: number;
    activeInPeriod: number;
    avgCustomerValue: number;
    highestCustomer: { name: string; total: number } | null;
    repeatRate: number | null;
  };
  topCustomers: { id: string; name: string; orders: number; spent: number; paid: number; balance: number; lastOrder: string | null }[];
  newVsRepeat: { newCustomers: number; repeatCustomers: number; returningActive: number };
  dormant: { id: string; name: string; lastOrder: string | null; totalSpent: number }[];
};

export function getCustomersReport(range: DateRange): CustomersReport {
  const customers = listCustomers();
  const enriched = customers.map((c) => ({ c, m: computeMetrics(c.id) }));

  const newCustomers = customers.filter((c) => inRange(c.createdAt, range)).length;
  const withBalance = enriched.filter((e) => e.m.hasBalance).length;
  const activeInPeriod = enriched.filter((e) => e.m.validOrders.some((o) => inRange(o.createdAt, range))).length;
  const repeatCustomers = enriched.filter((e) => e.m.isRepeat).length;
  const anyOrders = enriched.filter((e) => e.m.totalOrders > 0).length;
  const repeatRate = anyOrders ? (repeatCustomers / anyOrders) * 100 : null;
  const totalValue = enriched.reduce((s, e) => s + e.m.totalSpent, 0);
  const avgCustomerValue = customers.length ? totalValue / customers.length : 0;
  const top = enriched.slice().sort((a, b) => b.m.totalSpent - a.m.totalSpent)[0];

  const topCustomers = enriched
    .filter((e) => e.m.totalOrders > 0)
    .sort((a, b) => b.m.totalSpent - a.m.totalSpent)
    .slice(0, 10)
    .map((e) => ({
      id: e.c.id, name: e.c.name,
      orders: e.m.totalOrders, spent: e.m.totalSpent, paid: e.m.amountPaid, balance: e.m.outstanding,
      lastOrder: e.m.lastOrderAt,
    }));

  const returningActive = enriched.filter((e) =>
    e.m.isRepeat && e.m.validOrders.some((o) => inRange(o.createdAt, range))
  ).length;

  const dormant = enriched
    .filter((e) => e.m.totalOrders > 0 && !e.m.validOrders.some((o) => inRange(o.createdAt, range)))
    .sort((a, b) => (a.m.lastOrderAt ?? "").localeCompare(b.m.lastOrderAt ?? ""))
    .slice(0, 10)
    .map((e) => ({ id: e.c.id, name: e.c.name, lastOrder: e.m.lastOrderAt, totalSpent: e.m.totalSpent }));

  return {
    totals: {
      totalCustomers: customers.length,
      newCustomers, repeatCustomers, withBalance, activeInPeriod,
      avgCustomerValue,
      highestCustomer: top ? { name: top.c.name, total: top.m.totalSpent } : null,
      repeatRate,
    },
    topCustomers,
    newVsRepeat: { newCustomers, repeatCustomers: enriched.filter((e) => e.m.isRepeat).length, returningActive },
    dormant,
  };
}

// ---------- Overview ----------
export type OverviewMetric = {
  key: string; label: string; value: number; isCurrency?: boolean;
  previous?: number; hasPrev: boolean; changePct: number | null;
  direction: "up" | "down" | "flat" | "none";
  explanation: string;
  linkTo: string;
};

export type Overview = {
  metrics: OverviewMetric[];
  approvedRecordCount: number;
  totalOrdersEver: number;
  hasAnyData: boolean;
  updatedAt: string;
};

function totalsForRange(range: DateRange) {
  const orders = ordersCreatedIn(range);
  const valid = orders.filter((o) => o.orderStatus !== "cancelled");
  const sales = valid.reduce((s, o) => s + o.total, 0);
  const received = paymentsIn(range).reduce((s, p) => s + p.amount, 0);
  const avg = valid.length ? sales / valid.length : 0;
  const newCust = listCustomers().filter((c) => inRange(c.createdAt, range)).length;
  return { sales, received, orderCount: valid.length, avg, newCust };
}

export function getOverview(range: DateRange, compareRange: DateRange | null): Overview {
  const cur = totalsForRange(range);
  const prev = compareRange ? totalsForRange(compareRange) : null;
  const outstandingCurrent = validOrders().reduce((s, o) => s + o.balance, 0);

  const make = (key: string, label: string, value: number, prevValue: number | undefined, isCurrency: boolean, explanation: string, linkTo: string): OverviewMetric => {
    const hasPrev = prevValue !== undefined;
    const changePct = hasPrev && prevValue !== 0 ? ((value - prevValue) / prevValue) * 100 : null;
    const direction: OverviewMetric["direction"] = !hasPrev ? "none" : value === prevValue ? "flat" : value > prevValue ? "up" : "down";
    return { key, label, value, isCurrency, previous: prevValue, hasPrev, changePct, direction, explanation, linkTo };
  };

  const metrics: OverviewMetric[] = [
    make("sales", "Total sales", cur.sales, prev?.sales, true, "Sum of non-cancelled orders in period.", "/orders"),
    make("received", "Money received", cur.received, prev?.received, true, "Payments captured in period.", "/orders"),
    make("outstanding", "Outstanding balance", outstandingCurrent, undefined, true, "Balance across all open orders (not period-limited).", "/customers"),
    make("orders", "Total orders", cur.orderCount, prev?.orderCount, false, "Valid orders created in period.", "/orders"),
    make("aov", "Average order value", cur.avg, prev?.avg, true, "Total sales / valid order count.", "/orders"),
    make("new_customers", "New customers", cur.newCust, prev?.newCust, false, "Customers created in period.", "/customers"),
  ];

  const approvedRecordCount = listApprovedRecords().length;
  const totalOrdersEver = listOrders().length;
  return {
    metrics,
    approvedRecordCount, totalOrdersEver,
    hasAnyData: totalOrdersEver > 0 || approvedRecordCount > 0 || listCustomers().length > 0,
    updatedAt: new Date().toISOString(),
  };
}

// ---------- Formatting ----------
const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const fmtNaira = (n: number) => NGN.format(n || 0);
export const fmtPct = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
