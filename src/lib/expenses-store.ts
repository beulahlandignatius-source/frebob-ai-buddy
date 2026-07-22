// Business expenses — localStorage prototype store. Not linked to customer sales.

export type ExpenseCategory =
  | "inventory_purchase"
  | "rent"
  | "utilities"
  | "transport"
  | "salaries"
  | "marketing"
  | "supplies"
  | "fees"
  | "other";

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  date: string; // ISO
  method: "cash" | "bank_transfer" | "pos" | "other";
  reference: string;
  receiptUrl?: string;
  receiptName?: string;
  createdAt: string;
};

const KEY = "frebob.expenses.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read(): Expense[] {
  if (!isBrowser()) return [];
  try { const raw = window.localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Expense[]) : []; } catch { return []; }
}
function write(rows: Expense[]) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* quota */ }
}
function nid() { return `exp_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`; }

export function listExpenses(): Expense[] {
  return read().sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addExpense(input: Omit<Expense, "id" | "createdAt">): Expense {
  const row: Expense = { id: nid(), createdAt: new Date().toISOString(), ...input, amount: Math.max(0, Math.round(input.amount)) };
  const rows = read();
  rows.push(row);
  write(rows);
  return row;
}

export function deleteExpense(id: string) {
  write(read().filter((e) => e.id !== id));
}

export function expensesInRange(fromISO: string, toISO: string): Expense[] {
  return read().filter((e) => e.date >= fromISO && e.date <= toISO);
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "inventory_purchase", label: "Inventory / Stock purchase" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities (power, water, internet)" },
  { value: "transport", label: "Transport / Logistics" },
  { value: "salaries", label: "Salaries / Wages" },
  { value: "marketing", label: "Marketing / Ads" },
  { value: "supplies", label: "Supplies" },
  { value: "fees", label: "Bank / POS fees" },
  { value: "other", label: "Other" },
];

const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export function fmtNaira(n: number) { return NGN.format(n || 0); }

export function categoryLabel(c: ExpenseCategory): string {
  return EXPENSE_CATEGORIES.find((e) => e.value === c)?.label ?? "Other";
}

export function summariseExpenses(rows: Expense[]) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCategory = new Map<ExpenseCategory, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
  return {
    total,
    count: rows.length,
    byCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, label: categoryLabel(category), amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
