import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, Search, Users, AlertTriangle, GitMerge } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Select } from "@/components/fb/Input";
import {
  PageCanvas, SurfaceHeader, SectionLabel,
  LoadingSkeleton, ErrorState, EmptyState,
} from "@/components/dash";
import {
  CustomerCard, CustomerTable, CustomerSummaryCard, OutstandingCustomerCard,
} from "@/components/customers";
import {
  listCustomers, computeMetrics, primaryStatus, summariseCustomers,
  formatMoney, normalizePhone,
  type Customer, type CustomerMetrics, type CustomerStatus,
} from "@/lib/customers-store";
import { DemoHint } from "@/components/demo/DemoHint";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — FreBob" },
      { name: "description", content: "Manage your customers, orders, balances and activity." },
      { property: "og:title", content: "Customers — FreBob" },
      { property: "og:description", content: "Grow relationships with your regulars, one order at a time." },
    ],
  }),
  component: CustomersPage,
});

type Filter = "all" | "new" | "repeat" | "with_balance" | "without_balance" | "recent" | "inactive";
type Sort = "smart" | "recent" | "outstanding_desc" | "spent_desc" | "orders_desc" | "name" | "newest";

type Row = { customer: Customer; metrics: CustomerMetrics; status: CustomerStatus };

function CustomersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("smart");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // ensure client-only render triggers metrics from localStorage
    setTick((t) => t + 1);
  }, []);

  const rows: Row[] = useMemo(() => {
    void tick;
    const raw = listCustomers();
    return raw.map((c) => {
      const m = computeMetrics(c.id);
      return { customer: c, metrics: m, status: primaryStatus(c, m) };
    });
  }, [tick]);

  const summary = useMemo(() => { void tick; return summariseCustomers(); }, [tick]);

  const filtered: Row[] = useMemo(() => {
    let list = rows;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const qPhone = normalizePhone(q);
      list = list.filter((r) => {
        const c = r.customer;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (qPhone && c.normalizedPhone && c.normalizedPhone === qPhone)
        );
      });
    }
    const recentCutoff = Date.now() - 30 * 86_400_000;
    const inactiveCutoff = Date.now() - 60 * 86_400_000;
    switch (filter) {
      case "new": list = list.filter((r) => r.status === "new"); break;
      case "repeat": list = list.filter((r) => r.metrics.isRepeat); break;
      case "with_balance": list = list.filter((r) => r.metrics.hasBalance); break;
      case "without_balance": list = list.filter((r) => !r.metrics.hasBalance); break;
      case "recent": list = list.filter((r) => new Date(r.metrics.lastActivityAt).getTime() >= recentCutoff); break;
      case "inactive": list = list.filter((r) => new Date(r.metrics.lastActivityAt).getTime() < inactiveCutoff); break;
    }
    const sorted = [...list];
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => (a.metrics.lastActivityAt < b.metrics.lastActivityAt ? 1 : -1)); break;
      case "outstanding_desc":
        sorted.sort((a, b) => b.metrics.outstanding - a.metrics.outstanding); break;
      case "spent_desc":
        sorted.sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent); break;
      case "orders_desc":
        sorted.sort((a, b) => b.metrics.totalOrders - a.metrics.totalOrders); break;
      case "name":
        sorted.sort((a, b) => a.customer.name.localeCompare(b.customer.name)); break;
      case "newest":
        sorted.sort((a, b) => (a.customer.createdAt < b.customer.createdAt ? 1 : -1)); break;
      case "smart":
      default:
        sorted.sort((a, b) => {
          if (a.metrics.hasBalance !== b.metrics.hasBalance) return a.metrics.hasBalance ? -1 : 1;
          if (a.metrics.hasBalance && b.metrics.hasBalance) return b.metrics.outstanding - a.metrics.outstanding;
          const ta = new Date(a.metrics.lastActivityAt).getTime();
          const tb = new Date(b.metrics.lastActivityAt).getTime();
          if (ta !== tb) return tb - ta;
          return a.customer.name.localeCompare(b.customer.name);
        });
    }
    return sorted;
  }, [rows, query, filter, sort]);

  const outstandingRows = useMemo(
    () => rows.filter((r) => r.metrics.hasBalance).sort((a, b) => b.metrics.outstanding - a.metrics.outstanding),
    [rows],
  );

  return (
    <AppShell>
      <DemoHint hintKey="customers-v1" title="Know your regulars">Customers are auto-linked from orders. Amaka's demo has a duplicate pair — try the Duplicates review to merge them.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Customers"
          title="Your customer list"
          subtitle="Manage customer details, orders and balances"
          action={
            <div className="flex gap-2">
              <Link to="/customers/duplicates">
                <Button size="sm" variant="outline">
                  <GitMerge className="h-4 w-4 mr-1" /> Duplicates
                </Button>
              </Link>
              <Button size="sm" onClick={() => navigate({ to: "/customers/new" })}>
                <UserPlus className="h-4 w-4 mr-1" /> Add customer
              </Button>
            </div>
          }
        />


        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <CustomerSummaryCard label="Total customers" value={summary.total} />
          <CustomerSummaryCard label="Repeat" value={summary.repeat} tone="success" />
          <CustomerSummaryCard label="With balance" value={summary.withBalance} hint={summary.totalOutstanding > 0 ? formatMoney(summary.totalOutstanding) : undefined} tone={summary.withBalance ? "warning" : undefined} />
          <CustomerSummaryCard label="New this month" value={summary.newThisMonth} tone="accent" />
        </section>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or email"
              className="w-full h-11 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="!h-11 !rounded-full">
              <option value="all">All customers</option>
              <option value="new">New</option>
              <option value="repeat">Repeat</option>
              <option value="with_balance">With balances</option>
              <option value="without_balance">Without balances</option>
              <option value="recent">Recently active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="!h-11 !rounded-full">
              <option value="smart">Smart order</option>
              <option value="recent">Recently active</option>
              <option value="outstanding_desc">Highest balance</option>
              <option value="spent_desc">Highest spend</option>
              <option value="orders_desc">Most orders</option>
              <option value="name">Name A–Z</option>
              <option value="newest">Newest</option>
            </Select>
          </div>
        </div>

        {outstandingRows.length > 0 && (
          <section className="mb-6">
            <SectionLabel right={<span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{formatMoney(summary.totalOutstanding)} outstanding</span>}>
              Customers who owe you
            </SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {outstandingRows.slice(0, 4).map((r) => (
                <OutstandingCustomerCard key={r.customer.id} customer={r.customer} metrics={r.metrics} />
              ))}
            </div>
          </section>
        )}

        <SectionLabel right={<span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>}>
          All customers
        </SectionLabel>

        {state === "loading" ? (
          <LoadingSkeleton rows={5} />
        ) : state === "error" ? (
          <ErrorState onRetry={() => setState("ready")} message="FreBob could not load your customers. Please try again." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer or approve a customer record to start building your customer list."
            action={<Link to="/customers/new"><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add customer</Button></Link>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers match"
            description="No customers match your search or filters."
            action={<Button size="sm" variant="ghost" onClick={() => { setQuery(""); setFilter("all"); }}>Reset filters</Button>}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {filtered.map((r) => (
                <CustomerCard key={r.customer.id} customer={r.customer} metrics={r.metrics} status={r.status} />
              ))}
            </div>
            <CustomerTable rows={filtered} />
          </>
        )}
      </PageCanvas>
    </AppShell>
  );
}
