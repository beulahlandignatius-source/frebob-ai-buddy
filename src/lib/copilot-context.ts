// FreBob Copilot — client-side context builder and deterministic answer engine.
// Reads approved business records from localStorage and computes safe answers
// to common business questions. Also builds a compact JSON context that the
// server function forwards to Gemini.

import { listApprovedRecords, type ApprovedRecord } from "./records-store";
import { listUserProducts } from "./user-products-store";
import { listScans } from "./scanner-store";
import { listCustomers, computeMetrics } from "./customers-store";
import { summariseDuplicates } from "./duplicates-store";

export type CopilotLanguage = "english" | "nigerian_pidgin" | "yoruba" | "hausa" | "igbo";

export const COPILOT_LANGUAGES: { value: CopilotLanguage; label: string; native: string }[] = [
  { value: "english", label: "English", native: "English" },
  { value: "nigerian_pidgin", label: "Nigerian Pidgin", native: "Pidgin" },
  { value: "yoruba", label: "Yoruba", native: "Yorùbá" },
  { value: "hausa", label: "Hausa", native: "Hausa" },
  { value: "igbo", label: "Igbo", native: "Igbo" },
];

export type EvidenceItem = { label: string; value: string };

export type CopilotAnswer = {
  text: string;
  evidence: EvidenceItem[];
  hasData: boolean;
};

export type BusinessSnapshot = {
  totalApproved: number;
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  previousWeek: PeriodStats;
  outstandingCustomers: { name: string; phone: string | null; balance: number; reference: string }[];
  pendingOrders: { reference: string; customer: string; status: string; total: number }[];
  bestSelling: { product: string; quantity: number; revenue: number }[];
  lowStockProducts: { name: string; stock: number; reorder: number; unit: string; status: "low" | "out" }[];
  pendingScans: number;
  customerIssues: { duplicatesToReview: number; repeatDebtors: number };
};

export type PeriodStats = {
  orders: number;
  sales: number;
  received: number;
  outstanding: number;
};

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function fmtNaira(n: number) {
  return NGN.format(n || 0);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek() {
  const d = startOfToday();
  const day = d.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // Monday-based
  d.setDate(d.getDate() - diff);
  return d;
}
function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

function inRange(rec: ApprovedRecord, from: Date) {
  return new Date(rec.approvedAt).getTime() >= from.getTime();
}

function periodStats(records: ApprovedRecord[]): PeriodStats {
  let sales = 0, received = 0, outstanding = 0, orders = 0;
  for (const r of records) {
    if (r.data.event_type === "sale_order" || r.data.event_type === "reservation") {
      orders += 1;
      const total = r.data.total_amount ?? 0;
      const paid = r.data.amount_paid ?? 0;
      sales += total;
      received += paid;
      outstanding += r.data.balance ?? Math.max(total - paid, 0);
    } else if (r.data.event_type === "payment") {
      received += r.data.amount_paid ?? 0;
    }
  }
  return { orders, sales, received, outstanding };
}

export function buildSnapshot(records: ApprovedRecord[] = listApprovedRecords()): BusinessSnapshot {
  const today = periodStats(records.filter((r) => inRange(r, startOfToday())));
  const week = periodStats(records.filter((r) => inRange(r, startOfWeek())));
  const month = periodStats(records.filter((r) => inRange(r, startOfMonth())));

  // Outstanding customers
  const outstandingCustomers = records
    .filter((r) => (r.data.balance ?? 0) > 0 && r.data.customer.name)
    .map((r) => ({
      name: r.data.customer.name!,
      phone: r.data.customer.phone,
      balance: r.data.balance ?? 0,
      reference: r.reference,
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);

  // Pending orders
  const pendingOrders = records
    .filter((r) => ["pending", "reserved", "awaiting_pickup", "awaiting_delivery"].includes(r.data.order_status))
    .map((r) => ({
      reference: r.reference,
      customer: r.data.customer.name ?? "Walk-in customer",
      status: r.data.order_status.replaceAll("_", " "),
      total: r.data.total_amount ?? 0,
    }))
    .slice(0, 8);

  // Best selling products (by quantity)
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  for (const r of records) {
    for (const item of r.data.items) {
      if (!item.product_name || !item.quantity) continue;
      const key = item.product_name;
      const prev = productMap.get(key) ?? { quantity: 0, revenue: 0 };
      prev.quantity += item.quantity;
      prev.revenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
      productMap.set(key, prev);
    }
  }
  const bestSelling = Array.from(productMap.entries())
    .map(([product, v]) => ({ product, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return { totalApproved: records.length, today, week, month, outstandingCustomers, pendingOrders, bestSelling };
}

// -------- Deterministic answers -------------------------------------------

type Intent =
  | "today_sales"
  | "outstanding"
  | "pending_orders"
  | "best_selling"
  | "low_stock"
  | "daily_summary"
  | "weekly_summary"
  | "monthly_summary"
  | "unknown";

export function detectIntent(question: string): Intent {
  const q = question.toLowerCase();
  if (/(low\s*stock|running\s*low|finish|wetin.*finish|out of stock)/i.test(q)) return "low_stock";
  if (/(pending|awaiting|reserv|to deliver|to pick)/i.test(q)) return "pending_orders";
  if (/(best sell|top sell|move pass|sell pass|selling most|hot cake|best product)/i.test(q)) return "best_selling";
  if (/(owe|balance|debtor|outstand|never pay|never balance|no pay finish)/i.test(q)) return "outstanding";
  if (/(week|weekly)/i.test(q)) return "weekly_summary";
  if (/(month|monthly)/i.test(q)) return "monthly_summary";
  if (/(summary|summarise|summarize|overall|how business|how work)/i.test(q)) return "daily_summary";
  if (/(today|dis\s*day|sell.*today|sales?.*today|money.*today|wetin.*today)/i.test(q)) return "today_sales";
  return "unknown";
}

const NO_DATA: Record<CopilotLanguage, string> = {
  english: "I don't have enough approved business information to answer this. Add and approve a few records so I can help.",
  nigerian_pidgin: "I no get enough approved business record to answer this one. Abeg add and approve small record make I fit help.",
  yoruba: "Mi ò ní àkọsílẹ̀ ìṣòwò tí a ti fọwọ́sí tó láti dáhùn èyí. Jọ̀wọ́ ṣàfikún kí o sì fọwọ́sí àwọn àkọsílẹ̀ díẹ̀.",
  hausa: "Ba ni da isasshiyar bayanan kasuwanci da aka amince da su don amsa wannan. Da fatan ka ƙara wasu.",
  igbo: "Enweghị m ozi azụmahịa akwadoro zuru ezu iji zaa nke a. Biko tinye ma kwado ndekọ ole na ole.",
};

export function deterministicAnswer(intent: Intent, snap: BusinessSnapshot, lang: CopilotLanguage): CopilotAnswer | null {
  const empty = snap.totalApproved === 0;

  if (intent === "low_stock") {
    return {
      text: lang === "english"
        ? "Low-stock tracking needs inventory data. Approved records don't yet include current stock levels, so I can't confirm what is running low."
        : "I no fit confirm low stock — approved records no dey carry current stock levels.",
      evidence: [{ label: "Data source", value: "Business Memory" }, { label: "Approved records", value: String(snap.totalApproved) }],
      hasData: false,
    };
  }

  if (empty) return { text: NO_DATA[lang], evidence: [{ label: "Approved Records", value: "0" }], hasData: false };

  if (intent === "today_sales") {
    const { orders, sales, received, outstanding } = snap.today;
    if (orders === 0) return {
      text: lang === "english"
        ? "No approved sales recorded today yet."
        : "No sales approved for today yet.",
      evidence: [{ label: "Orders today", value: "0" }, { label: "Approved Records", value: String(snap.totalApproved) }],
      hasData: true,
    };
    const line = lang === "nigerian_pidgin"
      ? `You don record ${orders} approved sale${orders === 1 ? "" : "s"} today wey worth ${fmtNaira(sales)}. Money wey enter: ${fmtNaira(received)}. Balance wey remain: ${fmtNaira(outstanding)}.`
      : `You recorded ${orders} approved sale${orders === 1 ? "" : "s"} today worth ${fmtNaira(sales)}. Money received: ${fmtNaira(received)}. Outstanding balance: ${fmtNaira(outstanding)}.`;
    return {
      text: line,
      evidence: [
        { label: "Orders today", value: String(orders) },
        { label: "Approved Records", value: String(orders) },
        { label: "Source", value: "Business Memory" },
      ],
      hasData: true,
    };
  }

  if (intent === "outstanding") {
    if (snap.outstandingCustomers.length === 0) {
      return {
        text: lang === "english" ? "Everyone has cleared their balance in your approved records. Nothing outstanding." : "Nobody dey owe you for approved records.",
        evidence: [{ label: "Debtors", value: "0" }, { label: "Approved Records", value: String(snap.totalApproved) }],
        hasData: true,
      };
    }
    const lines = snap.outstandingCustomers.map((c) => `• ${c.name} — ${fmtNaira(c.balance)} (${c.reference})`).join("\n");
    const total = snap.outstandingCustomers.reduce((s, c) => s + c.balance, 0);
    return {
      text: (lang === "english"
        ? `${snap.outstandingCustomers.length} customer${snap.outstandingCustomers.length === 1 ? "" : "s"} still owe you a total of ${fmtNaira(total)}:\n\n`
        : `${snap.outstandingCustomers.length} customer never balance you finish. Total: ${fmtNaira(total)}:\n\n`) + lines,
      evidence: [
        { label: "Debtors", value: String(snap.outstandingCustomers.length) },
        { label: "Total outstanding", value: fmtNaira(total) },
        { label: "Source", value: "Approved Records" },
      ],
      hasData: true,
    };
  }

  if (intent === "pending_orders") {
    if (snap.pendingOrders.length === 0) {
      return {
        text: lang === "english" ? "No pending orders in your approved records." : "No pending order for now.",
        evidence: [{ label: "Pending orders", value: "0" }],
        hasData: true,
      };
    }
    const lines = snap.pendingOrders.map((o) => `• ${o.reference} — ${o.customer} · ${o.status} · ${fmtNaira(o.total)}`).join("\n");
    return {
      text: `${snap.pendingOrders.length} pending order${snap.pendingOrders.length === 1 ? "" : "s"}:\n\n${lines}`,
      evidence: [
        { label: "Pending orders", value: String(snap.pendingOrders.length) },
        { label: "Source", value: "Approved Records" },
      ],
      hasData: true,
    };
  }

  if (intent === "best_selling") {
    if (snap.bestSelling.length === 0) {
      return {
        text: lang === "english" ? "No product sales recorded yet in approved records." : "No product sale never enter approved record.",
        evidence: [{ label: "Products tracked", value: "0" }],
        hasData: true,
      };
    }
    const lines = snap.bestSelling.map((p, i) => `${i + 1}. ${p.product} — ${p.quantity} sold · ${fmtNaira(p.revenue)}`).join("\n");
    return {
      text: `Your best-selling products so far:\n\n${lines}`,
      evidence: [
        { label: "Products tracked", value: String(snap.bestSelling.length) },
        { label: "Source", value: "Approved Records" },
      ],
      hasData: true,
    };
  }

  if (intent === "daily_summary" || intent === "weekly_summary" || intent === "monthly_summary") {
    const period = intent === "daily_summary" ? snap.today : intent === "weekly_summary" ? snap.week : snap.month;
    const label = intent === "daily_summary" ? "Today" : intent === "weekly_summary" ? "This week" : "This month";
    return {
      text:
        `${label} in a snapshot:\n\n` +
        `• Orders: ${period.orders}\n` +
        `• Sales: ${fmtNaira(period.sales)}\n` +
        `• Money received: ${fmtNaira(period.received)}\n` +
        `• Outstanding: ${fmtNaira(period.outstanding)}\n\n` +
        (period.orders === 0 ? "No approved activity in this window yet." : "All figures come from records you already approved."),
      evidence: [
        { label: "Window", value: label },
        { label: "Approved Records", value: String(snap.totalApproved) },
        { label: "Source", value: "Business Memory" },
      ],
      hasData: true,
    };
  }

  return null;
}

export function mockAnswer(question: string, snap: BusinessSnapshot, lang: CopilotLanguage): CopilotAnswer {
  const intent = detectIntent(question);
  const answer = deterministicAnswer(intent, snap, lang);
  if (answer) return answer;

  // Unknown intent fallback
  if (snap.totalApproved === 0) {
    return { text: NO_DATA[lang], evidence: [{ label: "Approved Records", value: "0" }], hasData: false };
  }
  return {
    text:
      (lang === "english"
        ? "I can only answer from records you've approved. Try asking about today's sales, outstanding balances, pending orders, best-selling products, or ask for a daily summary."
        : "I fit only answer from record wey you don approve. Try ask about today sales, who dey owe, pending orders, or ask for daily summary."),
    evidence: [
      { label: "Approved Records", value: String(snap.totalApproved) },
      { label: "Source", value: "Business Memory" },
    ],
    hasData: false,
  };
}
