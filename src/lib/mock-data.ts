// DEMO DATA — not real business data. Used for FreBob Batch 2 prototype.
export const DEMO_USER = { firstName: "Chinedu", businessName: "Alaba Smart Electronics" };
export const CURRENCY = "₦";

export const fmt = (n: number) =>
  `${CURRENCY}${new Intl.NumberFormat("en-NG").format(Math.round(n))}`;

export type Metric = {
  key: string;
  label: string;
  value: number;
  changePct?: number;
  sub?: string;
  linkLabel: string;
  linkTo: string;
};

export const dashboardMetrics: Metric[] = [
  { key: "sales", label: "Today's Sales", value: 485000, changePct: 12, linkLabel: "View transactions", linkTo: "/reports" },
  { key: "received", label: "Money Received", value: 350000, changePct: 4, linkLabel: "View payments", linkTo: "/reports" },
  { key: "outstanding", label: "Outstanding Balance", value: 135000, sub: "4 customers", linkLabel: "View unpaid orders", linkTo: "/reports" },
  { key: "pending", label: "Pending Orders", value: 7, sub: "awaiting delivery", linkLabel: "View orders", linkTo: "/reports" },
];

export type LowStock = { id: string; name: string; stock: number; reorder: number; unit: string; status: "low" | "out" };
export const lowStock: LowStock[] = [
  { id: "p1", name: "Samsung A15", stock: 3, reorder: 10, unit: "units", status: "low" },
  { id: "p2", name: "Oraimo Power Bank", stock: 2, reorder: 8, unit: "units", status: "low" },
  { id: "p3", name: "Indomie Carton", stock: 5, reorder: 15, unit: "cartons", status: "low" },
  { id: "p4", name: "Peak Milk Sachet", stock: 0, reorder: 20, unit: "packs", status: "out" },
];

export type Activity = {
  id: string;
  type: "sale" | "payment" | "order" | "restock" | "correction" | "customer";
  description: string;
  time: string;
  amount?: number;
  status?: "completed" | "partial" | "pending" | "updated";
};

export const recentActivities: Activity[] = [
  { id: "a1", type: "payment", description: "Payment recorded for Order #FB-1024", time: "12 min ago", amount: 100000, status: "partial" },
  { id: "a2", type: "sale", description: "Sale approved — 2× Samsung A15", time: "34 min ago", amount: 245000, status: "completed" },
  { id: "a3", type: "order", description: "New order #FB-1025 from Emeka", time: "1 hr ago", amount: 68000, status: "pending" },
  { id: "a4", type: "restock", description: "Restocked Oraimo Power Bank (+20)", time: "2 hr ago", status: "updated" },
  { id: "a5", type: "correction", description: "Corrected quantity on Order #FB-1019", time: "3 hr ago", status: "updated" },
];

export type NotificationItem = {
  id: string;
  category: "inventory" | "payment" | "order" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export const notifications: NotificationItem[] = [
  { id: "n1", category: "inventory", title: "Low stock alert", body: "Samsung A15 is below its reorder level.", time: "10 min ago", read: false },
  { id: "n2", category: "payment", title: "Outstanding balance", body: "Customer Emeka still owes ₦70,000 on Order #FB-1018.", time: "1 hr ago", read: false },
  { id: "n3", category: "order", title: "Awaiting delivery", body: "Order #FB-1023 is still awaiting delivery.", time: "3 hr ago", read: false },
  { id: "n4", category: "system", title: "Setup complete", body: "Your business profile setup is complete.", time: "Yesterday", read: true },
  { id: "n5", category: "inventory", title: "Out of stock", body: "Peak Milk Sachet ran out today.", time: "Yesterday", read: true },
  { id: "n6", category: "payment", title: "Payment received", body: "₦100,000 received on Order #FB-1024.", time: "2 days ago", read: true },
];

export type ReportRow = {
  date: string;
  orders: number;
  sales: number;
  received: number;
  outstanding: number;
};

const day = (d: string, orders: number, sales: number, received: number) => ({
  date: d,
  orders,
  sales,
  received,
  outstanding: sales - received,
});

export const dailyReport: ReportRow[] = [
  day("Mon", 6, 320000, 240000),
  day("Tue", 8, 410000, 320000),
  day("Wed", 5, 280000, 260000),
  day("Thu", 10, 520000, 400000),
  day("Fri", 12, 610000, 500000),
  day("Sat", 14, 720000, 580000),
  day("Today", 8, 485000, 350000),
];

export const weeklyReport: ReportRow[] = [
  day("Wk 1", 42, 2100000, 1700000),
  day("Wk 2", 51, 2540000, 2100000),
  day("Wk 3", 46, 2280000, 1900000),
  day("Wk 4", 58, 2960000, 2500000),
];

export const monthlyReport: ReportRow[] = [
  day("Jan", 180, 8600000, 7100000),
  day("Feb", 165, 7900000, 6600000),
  day("Mar", 210, 10400000, 8800000),
  day("Apr", 195, 9700000, 8100000),
  day("May", 225, 11200000, 9500000),
  day("Jun", 240, 12100000, 10300000),
];

export const topProducts = [
  { name: "Samsung A15", sold: 42 },
  { name: "Oraimo Power Bank", sold: 38 },
  { name: "Indomie Carton", sold: 30 },
  { name: "Peak Milk Sachet", sold: 24 },
  { name: "Tecno Spark", sold: 18 },
];

export const ordersByStatus = [
  { name: "Completed", value: 58 },
  { name: "Pending", value: 12 },
  { name: "Partial", value: 7 },
  { name: "Unpaid", value: 4 },
];

export const reportSummary = {
  daily: { sales: 485000, received: 350000, outstanding: 135000, orders: 8, avg: 60625, top: "Samsung A15" },
  weekly: { sales: 2960000, received: 2500000, outstanding: 460000, orders: 58, avg: 51034, top: "Samsung A15" },
  monthly: { sales: 12100000, received: 10300000, outstanding: 1800000, orders: 240, avg: 50416, top: "Oraimo Power Bank" },
};

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
