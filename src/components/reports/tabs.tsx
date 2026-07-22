// Report tabs — one component per tab, all sharing primitives.

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";
import { BobAvatar } from "@/components/copilot/BobAvatar";
import { Button } from "@/components/fb/Button";
import {
  MetricCard, ChartCard, TrendChart, BarCompareChart, StatusDonut, RankBar, ReportTable,
  type Column,
} from "./primitives";
import {
  getOverview, getSalesReport, getPaymentsReport, getOrdersReport, getInventoryReport, getCustomersReport,
  fmtNaira, fmtPct,
  type SalesReport, type PaymentsReport, type OrdersReport, type InventoryReport, type CustomersReport, type Overview,
} from "@/lib/reporting/service";
import type { DateRange } from "@/lib/reporting/period";
import { formatRange } from "@/lib/reporting/period";
import { generateInsight } from "@/lib/reporting/ai-insights.functions";

type TabProps = { range: DateRange; compareRange: DateRange | null; refreshKey: number };

/* -------- Overview -------- */
export function OverviewTab({ range, compareRange, refreshKey }: TabProps) {
  const [data, setData] = useState<Overview | null>(null);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [orders, setOrders] = useState<OrdersReport | null>(null);
  const [pay, setPay] = useState<PaymentsReport | null>(null);
  const [inv, setInv] = useState<InventoryReport | null>(null);
  const [cust, setCust] = useState<CustomersReport | null>(null);

  useEffect(() => {
    setData(getOverview(range, compareRange));
    setSales(getSalesReport(range, compareRange));
    setOrders(getOrdersReport(range));
    setPay(getPaymentsReport(range));
    setInv(getInventoryReport(range));
    setCust(getCustomersReport(range));
  }, [range, compareRange, refreshKey]);

  if (!data || !sales || !orders || !pay || !inv || !cust) return <TabSkeleton />;
  if (!data.hasAnyData) return <EmptyBanner text="No approved records yet. Approve conversations, scans, or orders to see reports." />;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {data.metrics.map((m) => (
          <MetricCard key={m.key} label={m.label} value={m.value} isCurrency={m.isCurrency ?? true}
            previous={m.previous} hasPrev={m.hasPrev} changePct={m.changePct} direction={m.direction}
            explanation={m.explanation} linkTo={m.linkTo} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sales trend" description={`Sales over ${range.label.toLowerCase()}`}
          empty={sales.trend.every((t) => !t.sales)}
          textSummary={`Total sales ${fmtNaira(sales.totals.validSales)} across ${sales.totals.orderCount} valid orders.`}>
          <TrendChart data={sales.trend} previousKey={compareRange ? "previous" : undefined} />
        </ChartCard>
        <ChartCard title="Money received vs outstanding" description="Paid in period, plus current outstanding balance"
          empty={pay.totals.moneyReceived === 0 && pay.totals.outstandingCurrent === 0}
          textSummary={`Received ${fmtNaira(pay.totals.moneyReceived)}, outstanding ${fmtNaira(pay.totals.outstandingCurrent)}.`}>
          <BarCompareChart
            data={[
              { label: "Sales", value: sales.totals.validSales },
              { label: "Received", value: pay.totals.moneyReceived },
              { label: "Outstanding", value: pay.totals.outstandingCurrent },
            ]}
            keys={[{ key: "value", label: "Amount (₦)", color: "#4b1fa6" }]}
          />
        </ChartCard>
        <ChartCard title="Order status" description="How orders created in this period ended up"
          empty={orders.statusBreakdown.every((s) => s.count === 0)}
          textSummary={orders.statusBreakdown.map((s) => `${s.label}: ${s.count}`).join(", ")}>
          <StatusDonut data={orders.statusBreakdown.filter((s) => s.count > 0).map((s) => ({ name: s.label, value: s.count }))} />
        </ChartCard>
        <ChartCard title="Top products" description="Highest sales value"
          empty={sales.byProduct.length === 0}
          textSummary={sales.byProduct.slice(0, 5).map((p) => `${p.name}: ${fmtNaira(p.sales)}`).join("; ")}>
          <RankBar data={sales.byProduct.slice(0, 5).map((p) => ({ name: p.name, value: p.sales }))} />
        </ChartCard>
      </section>

      <section>
        <SectionTitle>Customers with outstanding balances</SectionTitle>
        <ReportTable
          rows={pay.outstandingByCustomer.slice(0, 5)}
          empty="No outstanding balances. Nice work."
          columns={[
            { key: "name", header: "Customer", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "balance", header: "Balance", render: (r) => <span className="font-semibold text-accent">{fmtNaira(r.balance)}</span> },
            { key: "orders", header: "Unpaid orders", render: (r) => r.unpaidOrders },
            { key: "oldest", header: "Oldest unpaid", render: (r) => (r.oldestUnpaid ? new Date(r.oldestUnpaid).toLocaleDateString("en-NG") : "—") },
          ]}
        />
      </section>

      <section>
        <SectionTitle>Inventory attention</SectionTitle>
        <ReportTable
          rows={inv.attention.slice(0, 5)}
          empty="All products are within healthy stock levels."
          columns={[
            { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "reason", header: "Why", render: (r) => r.reason },
            { key: "stock", header: "Stock", render: (r) => `${r.stock} / reorder ${r.reorder}` },
          ]}
        />
      </section>
    </div>
  );
}

/* -------- Sales -------- */
export function SalesTab({ range, compareRange, refreshKey }: TabProps) {
  const [d, setD] = useState<SalesReport | null>(null);
  useEffect(() => { setD(getSalesReport(range, compareRange)); }, [range, compareRange, refreshKey]);
  if (!d) return <TabSkeleton />;
  const t = d.totals;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Valid sales" value={fmtNaira(t.validSales)} />
        <SmallStat label="Completed sales" value={fmtNaira(t.completedSales)} />
        <SmallStat label="Orders" value={String(t.orderCount)} />
        <SmallStat label="Avg. order value" value={t.orderCount ? fmtNaira(t.avgOrderValue) : "—"} />
        <SmallStat label="Highest order" value={t.highestOrder ? fmtNaira(t.highestOrder.total) : "—"} sub={t.highestOrder ? `#${t.highestOrder.id}` : undefined} />
        <SmallStat label="Best day" value={t.bestDay ? t.bestDay.label : "—"} sub={t.bestDay ? fmtNaira(t.bestDay.total) : undefined} />
        <SmallStat label="Cancelled value" value={fmtNaira(t.cancelledValue)} />
        <SmallStat label="Gross order value" value={fmtNaira(t.grossOrderValue)} sub="Includes cancelled" />
      </section>

      <ChartCard title="Sales trend" description={`Sales over ${range.label.toLowerCase()}${compareRange ? " vs " + compareRange.label.toLowerCase() : ""}`}
        empty={d.trend.every((r) => !r.sales)}>
        <TrendChart data={d.trend} previousKey={compareRange ? "previous" : undefined} />
      </ChartCard>

      <section>
        <SectionTitle>Sales by product</SectionTitle>
        <ReportTable
          rows={d.byProduct}
          columns={[
            { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}{r.variant ? ` · ${r.variant}` : ""}</span> },
            { key: "qty", header: "Qty", render: (r) => r.quantity },
            { key: "sales", header: "Sales", render: (r) => fmtNaira(r.sales) },
            { key: "avg", header: "Avg price", render: (r) => fmtNaira(r.avgPrice) },
            { key: "orders", header: "Orders", render: (r) => r.orders },
            { key: "share", header: "% of sales", render: (r) => `${r.share.toFixed(1)}%` },
          ]}
        />
      </section>

      {d.byCategory && (
        <section>
          <SectionTitle>Sales by category</SectionTitle>
          <ReportTable
            rows={d.byCategory}
            columns={[
              { key: "cat", header: "Category", render: (r) => r.category },
              { key: "qty", header: "Qty", render: (r) => r.quantity },
              { key: "sales", header: "Sales", render: (r) => fmtNaira(r.sales) },
              { key: "share", header: "% of sales", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </section>
      )}

      <section>
        <SectionTitle>Sales by day</SectionTitle>
        <ReportTable
          rows={d.byDay}
          columns={[
            { key: "date", header: "Date", render: (r) => r.label },
            { key: "orders", header: "Orders", render: (r) => r.orders },
            { key: "sales", header: "Sales", render: (r) => fmtNaira(r.sales) },
            { key: "received", header: "Received", render: (r) => fmtNaira(r.received) },
            { key: "out", header: "Outstanding created", render: (r) => fmtNaira(r.outstandingCreated) },
          ]}
        />
      </section>
    </div>
  );
}

/* -------- Payments -------- */
export function PaymentsTab({ range, refreshKey }: TabProps) {
  const [d, setD] = useState<PaymentsReport | null>(null);
  useEffect(() => { setD(getPaymentsReport(range)); }, [range, refreshKey]);
  if (!d) return <TabSkeleton />;
  const t = d.totals;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Money received" value={fmtNaira(t.moneyReceived)} sub={`${t.paymentCount} payment${t.paymentCount === 1 ? "" : "s"}`} />
        <SmallStat label="Average payment" value={t.paymentCount ? fmtNaira(t.avgPayment) : "—"} />
        <SmallStat label="Cash" value={fmtNaira(t.byMethod.cash)} />
        <SmallStat label="Bank transfer" value={fmtNaira(t.byMethod.bank_transfer)} />
        <SmallStat label="POS" value={fmtNaira(t.byMethod.pos)} />
        <SmallStat label="Other" value={fmtNaira(t.byMethod.other)} />
        <SmallStat label="Outstanding (current)" value={fmtNaira(t.outstandingCurrent)} sub="All open orders" />
        <SmallStat label="Outstanding created in period" value={fmtNaira(t.outstandingCreatedInPeriod)} sub="From orders created this period" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Payment methods" description="Share of money received in period"
          empty={t.moneyReceived === 0}>
          <StatusDonut data={d.methodBreakdown.filter((m) => m.amount > 0).map((m) => ({ name: m.label, value: m.amount }))} />
        </ChartCard>
        <ChartCard title="Money received over time" empty={d.trend.every((r) => !r.received)}>
          <TrendChart data={d.trend.map((r) => ({ label: r.label, received: r.received }))} valueKey="received" />
        </ChartCard>
      </div>

      <section>
        <SectionTitle>Payment methods</SectionTitle>
        <ReportTable rows={d.methodBreakdown} columns={[
          { key: "m", header: "Method", render: (r) => r.label },
          { key: "n", header: "Payments", render: (r) => r.count },
          { key: "amt", header: "Amount", render: (r) => fmtNaira(r.amount) },
          { key: "share", header: "% share", render: (r) => `${r.share.toFixed(1)}%` },
        ]} />
      </section>

      <section>
        <SectionTitle>Outstanding balances by customer</SectionTitle>
        <ReportTable
          rows={d.outstandingByCustomer}
          empty="No outstanding balances."
          columns={[
            { key: "n", header: "Customer", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "b", header: "Balance", render: (r) => <span className="font-semibold text-accent">{fmtNaira(r.balance)}</span> },
            { key: "u", header: "Unpaid orders", render: (r) => r.unpaidOrders },
            { key: "o", header: "Oldest unpaid", render: (r) => (r.oldestUnpaid ? new Date(r.oldestUnpaid).toLocaleDateString("en-NG") : "—") },
            { key: "lp", header: "Last payment", render: (r) => (r.lastPayment ? new Date(r.lastPayment).toLocaleDateString("en-NG") : "—") },
          ]}
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <SmallStat label="Paid" value={String(d.statusBreakdown.paid)} />
        <SmallStat label="Partially paid" value={String(d.statusBreakdown.partial)} />
        <SmallStat label="Unpaid" value={String(d.statusBreakdown.unpaid)} />
      </section>
    </div>
  );
}

/* -------- Orders -------- */
export function OrdersTab({ range, refreshKey }: TabProps) {
  const [d, setD] = useState<OrdersReport | null>(null);
  useEffect(() => { setD(getOrdersReport(range)); }, [range, refreshKey]);
  if (!d) return <TabSkeleton />;
  const t = d.totals;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Total orders" value={String(t.total)} />
        <SmallStat label="Completed" value={String(t.completed)} />
        <SmallStat label="Pending" value={String(t.pending)} />
        <SmallStat label="Reserved" value={String(t.reserved)} />
        <SmallStat label="Cancelled" value={String(t.cancelled)} />
        <SmallStat label="Avg. order value" value={t.total ? fmtNaira(t.avgOrderValue) : "—"} />
        <SmallStat label="Completion rate" value={t.completionRate === null ? "No valid orders" : `${t.completionRate.toFixed(1)}%`} />
        <SmallStat label="Cancellation rate" value={t.cancellationRate === null ? "—" : `${t.cancellationRate.toFixed(1)}%`} />
      </section>

      <ChartCard title="Order status over time" empty={d.statusTrend.every((r) => !r.created)}>
        <BarCompareChart
          data={d.statusTrend.map((r) => ({ label: r.label, Created: r.created, Completed: r.completed, Cancelled: r.cancelled }))}
          keys={[
            { key: "Created", label: "Created", color: "#4b1fa6" },
            { key: "Completed", label: "Completed", color: "#2f9e6a" },
            { key: "Cancelled", label: "Cancelled", color: "#e5484d" },
          ]}
        />
      </ChartCard>

      <section>
        <SectionTitle>Orders by day</SectionTitle>
        <ReportTable rows={d.byDay} columns={[
          { key: "d", header: "Date", render: (r) => r.label },
          { key: "c", header: "Created", render: (r) => r.created },
          { key: "cp", header: "Completed", render: (r) => r.completed },
          { key: "x", header: "Cancelled", render: (r) => r.cancelled },
          { key: "v", header: "Value", render: (r) => fmtNaira(r.total) },
          { key: "o", header: "Outstanding", render: (r) => fmtNaira(r.outstanding) },
        ]} />
      </section>

      <section>
        <SectionTitle>Orders needing follow-up</SectionTitle>
        <ReportTable
          rows={d.delayed}
          empty="No pending orders older than 3 days."
          columns={[
            { key: "id", header: "Order", render: (r) => <Link to="/orders/$id" params={{ id: r.id }} className="text-primary font-semibold hover:underline">#{r.id}</Link> },
            { key: "c", header: "Customer", render: (r) => r.customer },
            { key: "s", header: "Status", render: (r) => r.status },
            { key: "t", header: "Total", render: (r) => fmtNaira(r.total) },
            { key: "b", header: "Balance", render: (r) => fmtNaira(r.balance) },
            { key: "d", header: "Days outstanding", render: (r) => r.days },
          ]}
        />
      </section>
    </div>
  );
}

/* -------- Inventory -------- */
export function InventoryTab({ range, refreshKey }: TabProps) {
  const [d, setD] = useState<InventoryReport | null>(null);
  useEffect(() => { setD(getInventoryReport(range)); }, [range, refreshKey]);
  if (!d) return <TabSkeleton />;
  const t = d.totals;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Total products" value={String(t.productCount)} />
        <SmallStat label="Available units" value={new Intl.NumberFormat("en-NG").format(t.availableUnits)} />
        <SmallStat label="Low stock" value={String(t.lowStock)} />
        <SmallStat label="Out of stock" value={String(t.outOfStock)} />
        <SmallStat label="Adjusted in period" value={String(t.adjustedInPeriod)} />
        <SmallStat
          label="Inventory value"
          value={t.inventoryValue === null ? "Unavailable" : fmtNaira(t.inventoryValue)}
          sub={t.inventoryValue === null ? "Some products have no cost price" : undefined}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Stock status" empty={t.productCount === 0}>
          <StatusDonut data={[
            { name: "In stock", value: d.statusBreakdown.in },
            { name: "Low stock", value: d.statusBreakdown.low },
            { name: "Out of stock", value: d.statusBreakdown.out },
          ]} />
        </ChartCard>
        <ChartCard title="Stock movements" empty={d.movements.every((m) => !m.received && !m.sold && !m.adjusted)}>
          <BarCompareChart
            data={d.movements.map((m) => ({ label: m.label, Received: m.received, Sold: m.sold, Adjusted: m.adjusted }))}
            keys={[
              { key: "Received", label: "Received", color: "#2f9e6a" },
              { key: "Sold", label: "Sold", color: "#4b1fa6" },
              { key: "Adjusted", label: "Adjusted", color: "#f7931e" },
            ]}
          />
        </ChartCard>
      </div>

      <section>
        <SectionTitle>Top-selling products</SectionTitle>
        <ReportTable rows={d.topSellers} empty="No sales in this period." columns={[
          { key: "n", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "q", header: "Qty sold", render: (r) => r.quantity },
          { key: "v", header: "Sales", render: (r) => fmtNaira(r.sales) },
          { key: "s", header: "Stock", render: (r) => `${r.stock} / reorder ${r.reorder}` },
          { key: "st", header: "Status", render: (r) => r.status === "out" ? "Out" : r.status === "low" ? "Low" : "In stock" },
        ]} />
      </section>

      <section>
        <SectionTitle>Products with no recorded sales during this period</SectionTitle>
        <ReportTable rows={d.slowMovers} empty="Every stocked product had a sale." columns={[
          { key: "n", header: "Product", render: (r) => r.name },
          { key: "c", header: "Category", render: (r) => r.category },
          { key: "s", header: "Stock", render: (r) => r.stock },
        ]} />
      </section>

      <section>
        <SectionTitle>Inventory attention</SectionTitle>
        <ReportTable rows={d.attention} empty="Nothing needs attention right now." columns={[
          { key: "n", header: "Product", render: (r) => r.name },
          { key: "r", header: "Reason", render: (r) => r.reason },
          { key: "s", header: "Stock / reorder", render: (r) => `${r.stock} / ${r.reorder}` },
        ]} />
      </section>
    </div>
  );
}

/* -------- Customers -------- */
export function CustomersTab({ range, refreshKey }: TabProps) {
  const [d, setD] = useState<CustomersReport | null>(null);
  useEffect(() => { setD(getCustomersReport(range)); }, [range, refreshKey]);
  if (!d) return <TabSkeleton />;
  const t = d.totals;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Total customers" value={String(t.totalCustomers)} />
        <SmallStat label="New in period" value={String(t.newCustomers)} />
        <SmallStat label="Repeat customers" value={String(t.repeatCustomers)} />
        <SmallStat label="Active in period" value={String(t.activeInPeriod)} />
        <SmallStat label="With outstanding" value={String(t.withBalance)} />
        <SmallStat label="Average value" value={t.totalCustomers ? fmtNaira(t.avgCustomerValue) : "—"} />
        <SmallStat label="Highest customer" value={t.highestCustomer?.name ?? "—"} sub={t.highestCustomer ? fmtNaira(t.highestCustomer.total) : undefined} />
        <SmallStat label="Repeat rate" value={t.repeatRate === null ? "—" : `${t.repeatRate.toFixed(1)}%`} />
      </section>

      <section>
        <SectionTitle>Top customers</SectionTitle>
        <ReportTable rows={d.topCustomers} empty="No customer activity yet." columns={[
          { key: "n", header: "Customer", render: (r) => <Link to="/customers/$id" params={{ id: r.id }} className="text-primary font-semibold hover:underline">{r.name}</Link> },
          { key: "o", header: "Orders", render: (r) => r.orders },
          { key: "s", header: "Spent", render: (r) => fmtNaira(r.spent) },
          { key: "p", header: "Paid", render: (r) => fmtNaira(r.paid) },
          { key: "b", header: "Balance", render: (r) => fmtNaira(r.balance) },
          { key: "l", header: "Last order", render: (r) => (r.lastOrder ? new Date(r.lastOrder).toLocaleDateString("en-NG") : "—") },
        ]} />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <SmallStat label="New" value={String(d.newVsRepeat.newCustomers)} />
        <SmallStat label="Repeat" value={String(d.newVsRepeat.repeatCustomers)} />
        <SmallStat label="Returning active" value={String(d.newVsRepeat.returningActive)} />
      </section>

      <section>
        <SectionTitle>Customers with no recent orders</SectionTitle>
        <ReportTable rows={d.dormant} empty="All active customers ordered in this period." columns={[
          { key: "n", header: "Customer", render: (r) => <Link to="/customers/$id" params={{ id: r.id }} className="text-primary font-semibold hover:underline">{r.name}</Link> },
          { key: "l", header: "Last order", render: (r) => (r.lastOrder ? new Date(r.lastOrder).toLocaleDateString("en-NG") : "—") },
          { key: "s", header: "Total spent", render: (r) => fmtNaira(r.totalSpent) },
        ]} />
      </section>
    </div>
  );
}

/* -------- AI Insights -------- */
export function AIInsightsTab({ range, compareRange, refreshKey }: TabProps) {
  const [text, setText] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState<{ label: string; value: string }[]>([]);
  const [language, setLanguage] = useState<"english" | "nigerian_pidgin" | "yoruba" | "hausa" | "igbo">("english");
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const runInsight = useServerFn(generateInsight);

  useEffect(() => {
    // Build the snapshot from computed reports — AI never touches raw records.
    const overview = getOverview(range, compareRange);
    const sales = getSalesReport(range, compareRange);
    const pay = getPaymentsReport(range);
    const orders = getOrdersReport(range);
    const inv = getInventoryReport(range);
    const cust = getCustomersReport(range);
    setSnapshot({
      period: formatRange(range),
      compare: compareRange ? formatRange(compareRange) : null,
      overview: overview.metrics.map((m) => ({ key: m.key, label: m.label, value: m.value, previous: m.previous, changePct: m.changePct })),
      sales_totals: sales.totals,
      top_products: sales.byProduct.slice(0, 5),
      payments_totals: pay.totals,
      outstanding_top: pay.outstandingByCustomer.slice(0, 5),
      order_status: orders.statusBreakdown,
      inventory_totals: inv.totals,
      inventory_attention: inv.attention.slice(0, 5),
      top_customers: cust.topCustomers.slice(0, 5),
      customers_totals: cust.totals,
      approved_records_total: overview.approvedRecordCount,
      total_orders_ever: overview.totalOrdersEver,
    });
    setText(""); setNote(""); setEvidence([]);
  }, [range, compareRange, refreshKey]);

  const canRun = snapshot && ((snapshot.total_orders_ever as number) > 0 || (snapshot.approved_records_total as number) > 0);

  async function run() {
    if (!snapshot) return;
    setLoading(true);
    try {
      const res = await runInsight({ data: { language, periodLabel: formatRange(range), metrics: snapshot } });
      setText(res.text); setEvidence(res.evidence); setNote(res.note ?? "");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Failed to generate insight.");
    } finally { setLoading(false); }
  }

  if (!snapshot) return <TabSkeleton />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl glass-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <BobAvatar size="sm" className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-primary">Bob's business insight</h3>
              <span className="text-[10px] uppercase tracking-wider text-subtle-foreground">Period: {formatRange(range)}</span>
            </div>
            <p className="mt-1 text-[11px] text-subtle-foreground">
              Operational records calculate the numbers. Bob only explains them.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="text-xs bg-card border border-secondary rounded-full px-3 py-1.5">
                <option value="english">English</option>
                <option value="nigerian_pidgin">Nigerian Pidgin</option>
                <option value="yoruba">Yoruba</option>
                <option value="hausa">Hausa</option>
                <option value="igbo">Igbo</option>
              </select>
              <Button size="sm" onClick={run} disabled={loading || !canRun}>
                {loading ? "Bob is thinking…" : text ? "Regenerate insight" : "Generate insight"}
              </Button>
            </div>
            {!canRun && (
              <p className="mt-3 text-sm text-foreground/80">
                FreBob does not have enough approved business records to create an insight for this period.
              </p>
            )}
            {text && (
              <div className="mt-4 rounded-xl bg-card/70 backdrop-blur p-4 border border-secondary">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{text}</p>
                {evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-subtle-foreground border-t border-secondary pt-3">
                    {evidence.map((e, i) => (
                      <span key={i} className="inline-flex items-center gap-1"><Info className="h-3 w-3" /> {e.label}: <strong className="text-foreground/80">{e.value}</strong></span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {note && !text && <p className="mt-3 text-xs text-destructive">{note}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-secondary bg-card p-4 text-xs text-subtle-foreground">
        <p className="font-semibold text-foreground mb-1">What Bob will not do</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Invent sales, payments, customers, or stock.</li>
          <li>Predict guaranteed future results.</li>
          <li>Change any records or send messages.</li>
          <li>Give financial or legal advice.</li>
        </ul>
      </div>
    </div>
  );
}

/* -------- Shared bits -------- */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/50 mb-3">{children}</h2>
  );
}

function SmallStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-3.5 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className="mt-1 font-display text-lg sm:text-xl font-extrabold tracking-tight truncate">{value}</p>
      {sub && <p className="text-[11px] text-subtle-foreground truncate">{sub}</p>}
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/50" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-muted/50" />
    </div>
  );
}

function EmptyBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-secondary bg-card p-10 text-center">
      <p className="font-semibold">Nothing to report yet</p>
      <p className="text-sm text-subtle-foreground mt-1">{text}</p>
    </div>
  );
}
