// DEMO DATA — not real business data. Used for FreBob prototype.
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
  { key: "outstanding", label: "Outstanding Balance", value: 135000, sub: "4 customers", linkLabel: "View unpaid orders", linkTo: "/orders" },
  { key: "pending", label: "Pending Orders", value: 7, sub: "awaiting delivery", linkLabel: "View orders", linkTo: "/orders" },
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
  date: d, orders, sales, received, outstanding: sales - received,
});

export const dailyReport: ReportRow[] = [
  day("Mon", 6, 320000, 240000), day("Tue", 8, 410000, 320000), day("Wed", 5, 280000, 260000),
  day("Thu", 10, 520000, 400000), day("Fri", 12, 610000, 500000), day("Sat", 14, 720000, 580000),
  day("Today", 8, 485000, 350000),
];
export const weeklyReport: ReportRow[] = [
  day("Wk 1", 42, 2100000, 1700000), day("Wk 2", 51, 2540000, 2100000),
  day("Wk 3", 46, 2280000, 1900000), day("Wk 4", 58, 2960000, 2500000),
];
export const monthlyReport: ReportRow[] = [
  day("Jan", 180, 8600000, 7100000), day("Feb", 165, 7900000, 6600000),
  day("Mar", 210, 10400000, 8800000), day("Apr", 195, 9700000, 8100000),
  day("May", 225, 11200000, 9500000), day("Jun", 240, 12100000, 10300000),
];

export const topProducts = [
  { name: "Samsung A15", sold: 42 }, { name: "Oraimo Power Bank", sold: 38 },
  { name: "Indomie Carton", sold: 30 }, { name: "Peak Milk Sachet", sold: 24 },
  { name: "Tecno Spark", sold: 18 },
];

export const ordersByStatus = [
  { name: "Completed", value: 58 }, { name: "Pending", value: 12 },
  { name: "Partial", value: 7 }, { name: "Unpaid", value: 4 },
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

/* ------------ Inventory ------------ */
export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorder: number;
  unit: string;
  status: "in" | "low" | "out";
};

export const inventory: Product[] = [
  { id: "p1", sku: "PHN-SA15", name: "Samsung A15", category: "Phones", price: 165000, cost: 128000, stock: 3, reorder: 10, unit: "units", status: "low" },
  { id: "p2", sku: "ACC-PBK20", name: "Oraimo Power Bank 20K", category: "Accessories", price: 18500, cost: 12500, stock: 2, reorder: 8, unit: "units", status: "low" },
  { id: "p3", sku: "FOOD-IND", name: "Indomie Carton", category: "Food", price: 8200, cost: 6800, stock: 5, reorder: 15, unit: "cartons", status: "low" },
  { id: "p4", sku: "FOOD-PM", name: "Peak Milk Sachet", category: "Food", price: 250, cost: 180, stock: 0, reorder: 20, unit: "packs", status: "out" },
  { id: "p5", sku: "PHN-TSP", name: "Tecno Spark 20", category: "Phones", price: 148000, cost: 118000, stock: 12, reorder: 6, unit: "units", status: "in" },
  { id: "p6", sku: "ACC-CHG", name: "Fast Charger 25W", category: "Accessories", price: 6500, cost: 3200, stock: 24, reorder: 10, unit: "units", status: "in" },
  { id: "p7", sku: "ACC-EAR", name: "Wireless Earbuds", category: "Accessories", price: 22000, cost: 14500, stock: 9, reorder: 6, unit: "units", status: "in" },
  { id: "p8", sku: "DRK-BIG", name: "Big Cola 60cl", category: "Drinks", price: 400, cost: 260, stock: 48, reorder: 24, unit: "bottles", status: "in" },
];

/* ------------ Orders ------------ */
export type Order = {
  id: string;
  customer: string;
  items: number;
  total: number;
  paid: number;
  date: string;
  status: "completed" | "pending" | "partial" | "unpaid";
  channel: "walk-in" | "whatsapp" | "phone";
};

export const orders: Order[] = [
  { id: "FB-1025", customer: "Emeka Umeh", items: 2, total: 68000, paid: 0, date: "Today · 10:24", status: "unpaid", channel: "whatsapp" },
  { id: "FB-1024", customer: "Blessing Ade", items: 3, total: 245000, paid: 100000, date: "Today · 09:12", status: "partial", channel: "walk-in" },
  { id: "FB-1023", customer: "Musa Ibrahim", items: 1, total: 148000, paid: 148000, date: "Today · 08:30", status: "pending", channel: "phone" },
  { id: "FB-1022", customer: "Ngozi Okafor", items: 4, total: 34800, paid: 34800, date: "Yesterday", status: "completed", channel: "walk-in" },
  { id: "FB-1021", customer: "Tunde Bello", items: 2, total: 41000, paid: 41000, date: "Yesterday", status: "completed", channel: "whatsapp" },
  { id: "FB-1020", customer: "Aisha Suleiman", items: 1, total: 22000, paid: 22000, date: "2 days ago", status: "completed", channel: "walk-in" },
  { id: "FB-1019", customer: "Kingsley Obi", items: 5, total: 96500, paid: 50000, date: "2 days ago", status: "partial", channel: "phone" },
];

/* ------------ Customers ------------ */
export type Customer = {
  id: string;
  name: string;
  phone: string;
  location: string;
  orders: number;
  spent: number;
  owes: number;
  lastSeen: string;
  tag: "regular" | "new" | "vip";
};

export const customers: Customer[] = [
  { id: "c1", name: "Emeka Umeh", phone: "0803 000 1122", location: "Alaba, Lagos", orders: 14, spent: 1240000, owes: 68000, lastSeen: "Today", tag: "vip" },
  { id: "c2", name: "Blessing Ade", phone: "0812 456 7788", location: "Yaba, Lagos", orders: 6, spent: 480000, owes: 145000, lastSeen: "Today", tag: "regular" },
  { id: "c3", name: "Musa Ibrahim", phone: "0905 234 1010", location: "Kano", orders: 3, spent: 210000, owes: 0, lastSeen: "Today", tag: "regular" },
  { id: "c4", name: "Ngozi Okafor", phone: "0708 998 0033", location: "Onitsha", orders: 2, spent: 68000, owes: 0, lastSeen: "Yesterday", tag: "new" },
  { id: "c5", name: "Kingsley Obi", phone: "0813 445 2299", location: "Aba", orders: 9, spent: 720000, owes: 46500, lastSeen: "2 days ago", tag: "regular" },
  { id: "c6", name: "Aisha Suleiman", phone: "0906 771 0022", location: "Abuja", orders: 1, spent: 22000, owes: 0, lastSeen: "2 days ago", tag: "new" },
];

/* ------------ Business Memory ------------ */
export type MemoryNote = {
  id: string;
  category: "supplier" | "pricing" | "customer" | "operations";
  title: string;
  body: string;
  updated: string;
};

export const memoryNotes: MemoryNote[] = [
  { id: "m1", category: "supplier", title: "Samsung distributor — Ikeja", body: "Kunle at Ikeja Plaza delivers Wednesdays. Best price on A-series when I buy 5+.", updated: "Yesterday" },
  { id: "m2", category: "pricing", title: "Rule: minimum margin", body: "Never sell phones below 18% margin. Accessories minimum 30%.", updated: "3 days ago" },
  { id: "m3", category: "customer", title: "Emeka — credit terms", body: "Regular customer. Allow up to ₦100k credit, weekly repayment.", updated: "1 week ago" },
  { id: "m4", category: "operations", title: "Shop hours", body: "Mon–Sat 8am–7pm. Closed Sundays. Half-day on public holidays.", updated: "2 weeks ago" },
];

/* ------------ AI Assistant ------------ */
export type ChatMsg = { id: string; role: "user" | "assistant"; text: string; time: string };
export const chatSample: ChatMsg[] = [
  { id: "1", role: "assistant", text: "Good morning Chinedu — you've made ₦485,000 in sales today, up 12% from yesterday. Want a breakdown?", time: "9:02" },
  { id: "2", role: "user", text: "How much do I have outstanding?", time: "9:03" },
  { id: "3", role: "assistant", text: "You have ₦135,000 outstanding across 4 customers. Emeka owes the most at ₦68,000.", time: "9:03" },
];

export const chatSuggestions = [
  "Which product sold most this week?",
  "Who still owes me money?",
  "What should I restock today?",
  "Summarise this week's business",
];
