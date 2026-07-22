import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Brain, Plus, Search, Truck, Tag, Users, Clock } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs,
  LoadingSkeleton, ErrorState, EmptyState, SuccessBanner,
} from "@/components/dash";
import { memoryNotes, type MemoryNote } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/business-memory")({
  head: () => ({
    meta: [
      { title: "Business Memory — FreBob" },
      { name: "description", content: "Store notes, rules and knowledge your assistant remembers about your business." },
      { property: "og:title", content: "Business Memory — FreBob" },
      { property: "og:description", content: "The living notebook your AI assistant learns from." },
    ],
  }),
  component: BusinessMemory,
});

type Cat = "all" | MemoryNote["category"];

function BusinessMemory() {
  const [cat, setCat] = useState<Cat>("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [saved, setSaved] = useState<string | null>(null);

  const rows = useMemo(() => memoryNotes.filter((n) => {
    if (cat !== "all" && n.category !== cat) return false;
    if (query && !(n.title.toLowerCase().includes(query.toLowerCase()) || n.body.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [cat, query]);

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Business Memory"
          title="What FreBob remembers"
          subtitle="Notes, rules and knowledge that guide your assistant"
          action={
            <Button size="sm" onClick={() => { setSaved("New note added to Business Memory."); toast("Draft saved"); }}>
              <Plus className="h-4 w-4 mr-1" /> New note
            </Button>
          }
        />

        {saved && <div className="mb-4"><SuccessBanner title={saved} onDismiss={() => setSaved(null)} /></div>}

        <section className="relative overflow-hidden rounded-[24px] p-5 glass-card mb-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="mt-1 h-8 w-8 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shrink-0 shadow-soft">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-primary">Why this matters</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
                Everything here shapes how <strong className="text-primary">FreBob</strong> answers your questions —
                pricing rules, supplier contacts, customer terms. The more you add, the smarter it gets.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <PeriodTabs
            value={cat}
            onChange={(v) => setCat(v)}
            options={[
              { value: "all", label: "All" },
              { value: "supplier", label: "Suppliers" },
              { value: "pricing", label: "Pricing" },
              { value: "customer", label: "Customers" },
              { value: "operations", label: "Operations" },
            ]}
          />
        </div>

        <SectionLabel>Notes</SectionLabel>
        {state === "loading" ? (
          <LoadingSkeleton rows={4} />
        ) : state === "error" ? (
          <ErrorState onRetry={() => setState("ready")} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="No notes yet"
            description="Add supplier contacts, pricing rules or shop policies so FreBob can help you."
            action={<Button size="sm" onClick={() => setSaved("Your first note is saved.")}><Plus className="h-4 w-4 mr-1" /> Add note</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((n) => <NoteCard key={n.id} n={n} />)}
          </div>
        )}
      </PageCanvas>
    </AppShell>
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
