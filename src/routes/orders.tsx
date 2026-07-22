// Orders Dashboard — Batch 5B
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs,
  LoadingSkeleton, ErrorState, EmptyState,
} from "@/components/dash";
import { OrderCard, OrderTable, OrderSummaryStat } from "@/components/orders";
import { formatMoney, listOrders, summariseOrders, type Order } from "@/lib/orders-store";
import type { OrderStatus, PaymentStatus } from "@/lib/records-store";
import { toast } from "sonner";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — FreBob" },
      { name: "description", content: "Track orders, payments and outstanding balances across your business." },
      { property: "og:title", content: "Orders — FreBob" },
      { property: "og:description", content: "Simple order management with real payment tracking." },
    ],
  }),
  component: OrdersPage,
});

type StatusTab = "all" | "pending" | "reserved" | "completed" | "cancelled";
type PayTab = "all" | "paid" | "partially_paid" | "unpaid";
type DateTab = "all" | "today" | "week" | "month";

function inDate(o: Order, tab: DateTab) {
  if (tab === "all") return true;
  const d = new Date(o.createdAt);
  const now = new Date();
  if (tab === "today") return d.toDateString() === now.toDateString();
  if (tab === "week") {
    const start = new Date(now); start.setDate(now.getDate() - 7); return d >= start;
  }
  if (tab === "month") {
    const start = new Date(now); start.setMonth(now.getMonth() - 1); return d >= start;
  }
  return true;
}

function matchStatus(o: Order, tab: StatusTab): boolean {
  if (tab === "all") return true;
  if (tab === "pending") return ["pending", "awaiting_pickup", "awaiting_delivery"].includes(o.orderStatus);
  return o.orderStatus === (tab as OrderStatus);
}

function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusTab>("all");
  const [payment, setPayment] = useState<PayTab>("all");
  const [dateTab, setDateTab] = useState<DateTab>("all");
  const [query, setQuery] = useState("");
  const [ui, setUi] = useState<"ready" | "loading" | "error">("ready");

  const allOrders = useMemo(() => listOrders(), []);
  const summary = useMemo(() => summariseOrders(allOrders), [allOrders]);

  const rows = useMemo(() => {
    return allOrders.filter((o) => {
      if (!matchStatus(o, status)) return false;
      if (payment !== "all" && o.paymentStatus !== (payment as PaymentStatus)) return false;
      if (!inDate(o, dateTab)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!o.id.toLowerCase().includes(q) && !o.customerName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allOrders, status, payment, dateTab, query]);

  return (
    <AppShell>
      <DemoHint hintKey="orders-v1" title="Track every sale">Orders combine what Bob extracts from conversations with what you scan. Open one to record a payment.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Orders & Payments"
          title="Orders"
          subtitle={`${summary.total} orders · ${formatMoney(summary.outstandingValue)} outstanding`}
          action={
            <Button size="sm" onClick={() => toast("Manual new-order flow coming soon. Approve a conversation to create an order.")}>
              <Plus className="h-4 w-4 mr-1" /> New order
            </Button>
          }
        />

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <OrderSummaryStat label="Total orders" value={summary.total} />
          <OrderSummaryStat label="Pending" value={summary.pending} tone="info" />
          <OrderSummaryStat label="Reserved" value={summary.reserved} tone="accent" />
          <OrderSummaryStat label="Completed" value={summary.completed} tone="success" />
          <OrderSummaryStat label="Outstanding" value={formatMoney(summary.outstandingValue)} tone="accent" />
        </section>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order # or customer"
                className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus-ring focus:border-primary/40"
              />
            </div>
            <Button
              size="sm" variant="ghost"
              onClick={() => { setUi("loading"); setTimeout(() => setUi("ready"), 700); }}
            >Refresh</Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => setUi(ui === "error" ? "ready" : "error")}
            >Toggle error</Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <FilterGroup label="Status">
              <PeriodTabs
                value={status} onChange={setStatus}
                options={[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "reserved", label: "Reserved" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </FilterGroup>
            <FilterGroup label="Payment">
              <PeriodTabs
                value={payment} onChange={setPayment}
                options={[
                  { value: "all", label: "All" },
                  { value: "paid", label: "Paid" },
                  { value: "partially_paid", label: "Partial" },
                  { value: "unpaid", label: "Unpaid" },
                ]}
              />
            </FilterGroup>
            <FilterGroup label="Date">
              <PeriodTabs
                value={dateTab} onChange={setDateTab}
                options={[
                  { value: "all", label: "All" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
              />
            </FilterGroup>
          </div>
        </div>

        <SectionLabel>{rows.length} order{rows.length === 1 ? "" : "s"}</SectionLabel>
        {ui === "loading" ? (
          <LoadingSkeleton rows={5} />
        ) : ui === "error" ? (
          <ErrorState onRetry={() => setUi("ready")} message="Unable to load orders." />
        ) : allOrders.length === 0 ? (
          <IntelligentEmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Orders created from conversations and approved documents will appear here."
            primary={{ label: "Create Order", icon: Plus, onClick: () => navigate({ to: "/add-record" }) }}
            secondary={[{ label: "Scan a Document", to: "/scanner" }]}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders match those filters"
            description="Try clearing filters or a different search term."
            action={<Button size="sm" variant="outline" onClick={() => { setStatus("all"); setPayment("all"); setDateTab("all"); setQuery(""); }}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="hidden md:block"><OrderTable orders={rows} /></div>
            <div className="md:hidden space-y-2.5">
              {rows.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50 shrink-0">{label}</span>
      {children}
    </div>
  );
}
