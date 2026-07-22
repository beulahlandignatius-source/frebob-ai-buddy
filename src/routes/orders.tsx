import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ShoppingCart, Phone, MessageCircle, Store } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs, StatusBadge,
  LoadingSkeleton, ErrorState, EmptyState,
} from "@/components/dash";
import { orders, fmt, type Order } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — FreBob" },
      { name: "description", content: "Manage orders, payments and delivery status for your business." },
      { property: "og:title", content: "Orders — FreBob" },
      { property: "og:description", content: "Track every order from creation to payment." },
    ],
  }),
  component: Orders,
});

type Tab = "all" | "pending" | "partial" | "unpaid" | "completed";

function Orders() {
  const [tab, setTab] = useState<Tab>("all");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  const rows = useMemo(() => tab === "all" ? orders : orders.filter((o) => o.status === tab), [tab]);
  const totalOutstanding = orders.reduce((s, o) => s + (o.total - o.paid), 0);
  const totalSales = orders.reduce((s, o) => s + o.total, 0);

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Orders"
          title="Orders & payments"
          subtitle={`${orders.length} orders · ${fmt(totalOutstanding)} outstanding`}
          action={
            <Button size="sm" onClick={() => toast("New order flow coming soon")}>
              <Plus className="h-4 w-4 mr-1" /> New order
            </Button>
          }
        />

        <section className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="Total sales" value={fmt(totalSales)} />
          <MiniStat label="Received" value={fmt(orders.reduce((s, o) => s + o.paid, 0))} tone="success" />
          <MiniStat label="Outstanding" value={fmt(totalOutstanding)} tone="accent" />
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <PeriodTabs
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "partial", label: "Partial" },
              { value: "unpaid", label: "Unpaid" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setState("loading"); setTimeout(() => setState("ready"), 700); }}>
              Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setState(state === "error" ? "ready" : "error")}>
              Toggle error
            </Button>
          </div>
        </div>

        <SectionLabel>Orders</SectionLabel>
        {state === "loading" ? (
          <LoadingSkeleton rows={5} />
        ) : state === "error" ? (
          <ErrorState onRetry={() => setState("ready")} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders here yet"
            description="Once orders are logged they'll appear in this list."
            action={<Button size="sm" onClick={() => toast("New order flow coming soon")}><Plus className="h-4 w-4 mr-1" /> Add order</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {rows.map((o) => <OrderRow key={o.id} o={o} />)}
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function OrderRow({ o }: { o: Order }) {
  const owed = o.total - o.paid;
  const Ch = channelIcon[o.channel];
  return (
    <div className="bg-card border border-secondary rounded-[20px] p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
        <Ch className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">#{o.id}</p>
          <StatusBadge tone={statusTone(o.status)}>{statusLabel(o.status)}</StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {o.customer} · {o.items} item{o.items > 1 ? "s" : ""} · {o.date}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-sm font-extrabold">{fmt(o.total)}</p>
        {owed > 0 && <p className="text-[11px] text-accent font-semibold mt-0.5">{fmt(owed)} owed</p>}
      </div>
    </div>
  );
}

const channelIcon = { "walk-in": Store, whatsapp: MessageCircle, phone: Phone };
function statusTone(s: Order["status"]) {
  return s === "completed" ? "success" : s === "partial" ? "warning" : s === "pending" ? "info" : "danger";
}
function statusLabel(s: Order["status"]) {
  return s === "completed" ? "Completed" : s === "partial" ? "Partial" : s === "pending" ? "Pending" : "Unpaid";
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "accent" }) {
  return (
    <div className="bg-card p-4 rounded-[20px] border border-secondary">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className={cn(
        "mt-2 font-display text-[18px] sm:text-[20px] font-extrabold tracking-tight leading-none truncate",
        tone === "success" ? "text-[var(--success)]" : tone === "accent" ? "text-accent" : "text-foreground",
      )}>{value}</p>
    </div>
  );
}
