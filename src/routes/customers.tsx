import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { UserPlus, Search, Users, Phone, MapPin } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, StatusBadge,
  LoadingSkeleton, ErrorState, EmptyState,
} from "@/components/dash";
import { customers, fmt, type Customer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — FreBob" },
      { name: "description", content: "Track your customers, their spending and outstanding balances." },
      { property: "og:title", content: "Customers — FreBob" },
      { property: "og:description", content: "Grow relationships with your regulars, one order at a time." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  const rows = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.location.toLowerCase().includes(q));
  }, [query]);

  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);
  const totalOwed = customers.reduce((s, c) => s + c.owes, 0);

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Customers"
          title="Your customer list"
          subtitle={`${customers.length} customers · ${fmt(totalOwed)} outstanding`}
          action={
            <Button size="sm" onClick={() => toast("Add customer coming soon")}>
              <UserPlus className="h-4 w-4 mr-1" /> Add customer
            </Button>
          }
        />

        <section className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="Customers" value={String(customers.length)} />
          <MiniStat label="Lifetime spend" value={fmt(totalSpent)} tone="success" />
          <MiniStat label="Owed to you" value={fmt(totalOwed)} tone="accent" />
        </section>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or city"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setState("loading"); setTimeout(() => setState("ready"), 700); }}>
            Refresh
          </Button>
        </div>

        <SectionLabel>Customers</SectionLabel>
        {state === "loading" ? (
          <LoadingSkeleton rows={5} />
        ) : state === "error" ? (
          <ErrorState onRetry={() => setState("ready")} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers match"
            description="Try a different search or add your first customer."
            action={<Button size="sm" onClick={() => setQuery("")}>Clear search</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((c) => <CustomerCard key={c.id} c={c} />)}
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function CustomerCard({ c }: { c: Customer }) {
  const initials = c.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return (
    <div className="bg-card border border-secondary rounded-[20px] p-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full brand-gradient text-primary-foreground font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate">{c.name}</p>
            <StatusBadge tone={c.tag === "vip" ? "success" : c.tag === "new" ? "info" : "neutral"}>
              {c.tag === "vip" ? "VIP" : c.tag === "new" ? "New" : "Regular"}
            </StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders</p>
          <p className="font-display text-sm font-extrabold mt-0.5">{c.orders}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</p>
          <p className="font-display text-sm font-extrabold mt-0.5 text-[var(--success)]">{fmt(c.spent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owes</p>
          <p className={cn("font-display text-sm font-extrabold mt-0.5", c.owes > 0 ? "text-accent" : "text-muted-foreground")}>
            {c.owes > 0 ? fmt(c.owes) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
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
