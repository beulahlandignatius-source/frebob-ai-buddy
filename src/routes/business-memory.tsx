import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Brain, Plus, Search, Truck, Tag, Users, Clock, FileCheck, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs,
  LoadingSkeleton, ErrorState, EmptyState, SuccessBanner,
} from "@/components/dash";
import { memoryNotes, type MemoryNote, fmt } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { listApprovedRecords, type ApprovedRecord } from "@/lib/records-store";
import { humanise, StatusPill } from "@/components/record";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";

export const Route = createFileRoute("/business-memory")({
  head: () => ({
    meta: [
      { title: "Business Memory — FreBob" },
      { name: "description", content: "Approved business records and the notes your assistant remembers." },
      { property: "og:title", content: "Business Memory — FreBob" },
      { property: "og:description", content: "The trusted, human-approved memory of your business." },
    ],
  }),
  component: BusinessMemory,
});

type Tab = "records" | "notes";
type Cat = "all" | MemoryNote["category"];

function BusinessMemory() {
  const [tab, setTab] = useState<Tab>("records");
  const [cat, setCat] = useState<Cat>("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [saved, setSaved] = useState<string | null>(null);
  const [records, setRecords] = useState<ApprovedRecord[]>([]);

  useEffect(() => { setRecords(listApprovedRecords()); }, []);

  const notes = useMemo(() => memoryNotes.filter((n) => {
    if (cat !== "all" && n.category !== cat) return false;
    if (query && !(n.title.toLowerCase().includes(query.toLowerCase()) || n.body.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [cat, query]);

  const filteredRecords = useMemo(() => records.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const item = r.data.items[0];
    return (
      r.reference.toLowerCase().includes(q) ||
      (item?.product_name ?? "").toLowerCase().includes(q) ||
      (r.data.customer.name ?? "").toLowerCase().includes(q) ||
      humanise(r.data.event_type).toLowerCase().includes(q) ||
      String(r.data.total_amount ?? "").includes(q)
    );
  }), [records, query]);

  const summary = useMemo(() => {
    const s = { total: records.length, sales: 0, payments: 0, reservations: 0, needsReview: 0 };
    for (const r of records) {
      if (r.data.event_type === "sale_order") s.sales++;
      else if (r.data.event_type === "payment") s.payments++;
      else if (r.data.event_type === "reservation") s.reservations++;
      if (r.data.needs_confirmation || r.data.confidence !== "high") s.needsReview++;
    }
    return s;
  }, [records]);

  return (
    <AppShell>
      <DemoHint hintKey="business-memory-v1" title="Your source of truth">Every approved conversation, scan and record lands here. Bob only answers from what's saved in Business Memory.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Business Memory"
          title="What FreBob remembers"
          subtitle="Approved records and notes — everything here has been reviewed by a human."
          action={
            <Link to="/add-record">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add record</Button>
            </Link>
          }
        />

        {saved && <div className="mb-4"><SuccessBanner title={saved} onDismiss={() => setSaved(null)} /></div>}

        {/* Glass intro */}
        <section className="relative overflow-hidden rounded-[24px] p-5 glass-card mb-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="mt-1 h-8 w-8 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shrink-0 shadow-soft">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-primary">Trusted memory</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
                Raw AI extractions never enter here directly. Every record was reviewed and approved by you.
              </p>
            </div>
          </div>
        </section>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryTile label="Approved" value={summary.total} />
          <SummaryTile label="Sales" value={summary.sales} />
          <SummaryTile label="Reservations" value={summary.reservations} />
          <SummaryTile label="Needs review" value={summary.needsReview} tone="warn" />
        </div>

        {/* Tabs */}
        <div className="mb-4 inline-flex rounded-full bg-secondary p-1 text-xs font-bold">
          {([{ v: "records", l: "Approved records", Icon: FileCheck }, { v: "notes", l: "Notes", Icon: Brain }] as const).map(({ v, l, Icon }) => (
            <button key={v} type="button" onClick={() => setTab(v)}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 transition",
                tab === v ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "records" ? "Search product, customer, reference, amount" : "Search notes"}
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus-ring focus:border-primary/40" />
          </div>
          {tab === "notes" && (
            <PeriodTabs value={cat} onChange={(v) => setCat(v)}
              options={[
                { value: "all", label: "All" }, { value: "supplier", label: "Suppliers" },
                { value: "pricing", label: "Pricing" }, { value: "customer", label: "Customers" },
                { value: "operations", label: "Operations" },
              ]} />
          )}
        </div>

        {tab === "records" ? (
          <>
            <SectionLabel>Approved records</SectionLabel>
            {state === "loading" ? <LoadingSkeleton rows={4} /> :
              state === "error" ? <ErrorState onRetry={() => setState("ready")} /> :
              filteredRecords.length === 0 ? (
                <IntelligentEmptyState
                  icon={MessageSquare}
                  title="Business Memory is empty"
                  description="Approved conversations and documents become searchable business knowledge Bob can answer from."
                  primary={{ label: "Record Conversation", icon: Plus, to: "/add-record" }}
                  secondary={[{ label: "Scan a Receipt", to: "/scanner" }]}
                />
              ) : (
                <div className="grid gap-3">{filteredRecords.map((r) => <MemoryRecordCard key={r.id} r={r} />)}</div>
              )}
          </>
        ) : (
          <>
            <SectionLabel>Notes</SectionLabel>
            {notes.length === 0 ? (
              <EmptyState icon={Brain} title="No notes yet"
                description="Add supplier contacts, pricing rules or shop policies so FreBob can help you."
                action={<Button size="sm" onClick={() => setSaved("Your first note is saved.")}><Plus className="h-4 w-4 mr-1" /> Add note</Button>} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">{notes.map((n) => <NoteCard key={n.id} n={n} />)}</div>
            )}
          </>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function SummaryTile({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight", tone === "warn" && "text-accent")}>{value}</p>
    </div>
  );
}

function MemoryRecordCard({ r }: { r: ApprovedRecord }) {
  const item = r.data.items[0];
  const paymentTone: Record<string, "success" | "warn" | "muted"> = {
    paid: "success", partially_paid: "warn", unpaid: "warn", unknown: "muted",
  };
  return (
    <Link to="/conversations/$id" params={{ id: r.conversationId }} className="block bg-card border border-secondary rounded-[20px] p-4 hover:border-primary/25 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-[15px] truncate">
            {item?.product_name ?? "Item"} {item?.variant ? `· ${item.variant}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {humanise(r.data.event_type)} · Ref {r.reference} · {new Date(r.approvedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          </p>
        </div>
        <p className="text-lg font-bold shrink-0">{r.data.total_amount ? fmt(r.data.total_amount) : "—"}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusPill tone={paymentTone[r.data.payment_status] ?? "muted"}>{humanise(r.data.payment_status)}</StatusPill>
        <StatusPill tone="info">{humanise(r.data.order_status)}</StatusPill>
        {r.data.customer.name && <StatusPill tone="muted">{r.data.customer.name}</StatusPill>}
        <StatusPill tone="muted">Approved by {r.approvedBy}</StatusPill>
      </div>
    </Link>
  );
}

const catIcon = { supplier: Truck, pricing: Tag, customer: Users, operations: Clock };
const catTint: Record<MemoryNote["category"], string> = {
  supplier: "bg-secondary text-primary",
  pricing: "bg-accent/10 text-accent",
  customer: "bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-[var(--info)]",
  operations: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
};

function NoteCard({ n }: { n: MemoryNote }) {
  const Icon = catIcon[n.category];
  return (
    <div className="bg-card border border-secondary rounded-[20px] p-4">
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", catTint[n.category])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{n.title}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{n.category} · updated {n.updated}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground/85 leading-relaxed">{n.body}</p>
    </div>
  );
}
