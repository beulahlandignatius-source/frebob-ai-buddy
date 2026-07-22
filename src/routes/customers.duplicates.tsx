import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Search, Users } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Select } from "@/components/fb/Input";
import {
  PageCanvas, SurfaceHeader, SectionLabel, LoadingSkeleton,
} from "@/components/dash";
import {
  DuplicateSummaryCard, DuplicateGroupCard, DuplicateEmpty,
} from "@/components/customers/duplicates";
import { getCustomer, computeMetrics, type Customer, type CustomerMetrics } from "@/lib/customers-store";
import { detectDuplicateGroups, summariseDuplicates, type DuplicateGroup } from "@/lib/duplicates-store";

export const Route = createFileRoute("/customers/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicate Review — FreBob" },
      { name: "description", content: "Review possible duplicate customer records before combining them." },
      { property: "og:title", content: "Duplicate Review — FreBob" },
      { property: "og:description", content: "Keep your customer list clean and trustworthy." },
    ],
  }),
  component: DuplicatesPage,
});

type StatusFilter = "all" | "needs_review" | "review_later" | "not_duplicate" | "merge_completed";
type ConfFilter = "all" | "high" | "medium" | "low";
type Sort = "priority" | "confidence" | "recent";

function DuplicatesPage() {
  const [tick, setTick] = useState(0);
  const [ui, setUi] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  useEffect(() => {
    setUi("loading");
    setErrorMsg(null);
    try {
      setTick((t) => t + 1);
      setUi("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not scan for duplicates.");
      setUi("error");
    }
  }, []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [conf, setConf] = useState<ConfFilter>("all");
  const [sort, setSort] = useState<Sort>("priority");

  const summary = useMemo(() => { void tick; return summariseDuplicates(); }, [tick]);
  const allGroups = useMemo(() => { void tick; return detectDuplicateGroups(); }, [tick]);

  const memberCache = useMemo(() => {
    void tick;
    const map: Record<string, { customer: Customer; metrics: CustomerMetrics }> = {};
    for (const g of allGroups) {
      for (const id of g.memberIds) {
        if (map[id]) continue;
        const c = getCustomer(id); if (!c) continue;
        map[id] = { customer: c, metrics: computeMetrics(id) };
      }
    }
    return map;
  }, [allGroups, tick]);

  const filtered: DuplicateGroup[] = useMemo(() => {
    let list = allGroups;
    if (status !== "all") list = list.filter((g) => g.reviewStatus === status);
    if (conf !== "all") list = list.filter((g) => g.confidence === conf);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((g) => g.memberIds.some((id) => {
        const c = memberCache[id]?.customer; if (!c) return false;
        return c.name.toLowerCase().includes(q)
          || (c.phone ?? "").toLowerCase().includes(q)
          || (c.email ?? "").toLowerCase().includes(q);
      }));
    }
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const srank = { needs_review: 0, review_later: 1, not_duplicate: 2, merge_completed: 3 } as const;
    return [...list].sort((a, b) => {
      if (sort === "confidence") return rank[a.confidence] - rank[b.confidence];
      if (sort === "recent") return 0;
      return srank[a.reviewStatus] - srank[b.reviewStatus] || rank[a.confidence] - rank[b.confidence];
    });
  }, [allGroups, status, conf, query, sort, memberCache]);

  return (
    <AppShell>
      <PageCanvas>
        <div className="mb-4">
          <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Link>
        </div>
        <SurfaceHeader
          eyebrow="Data quality"
          title="Duplicate review"
          subtitle="Review possible duplicate customer records before combining them"
          action={
            <Link to="/customers/merge-history">
              <Button size="sm" variant="outline">
                <History className="h-4 w-4 mr-1" /> Merge history
              </Button>
            </Link>
          }
        />

        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <DuplicateSummaryCard label="Possible groups" value={summary.groups} tone={summary.groups > 0 ? "accent" : undefined} />
          <DuplicateSummaryCard label="High confidence" value={summary.highConfidence} tone={summary.highConfidence > 0 ? "warning" : undefined} />
          <DuplicateSummaryCard label="Medium confidence" value={summary.mediumConfidence} tone={summary.mediumConfidence > 0 ? "info" : undefined} />
          <DuplicateSummaryCard label="Unreviewed" value={summary.unreviewed} />
          <DuplicateSummaryCard label="Merges completed" value={summary.mergesCompleted} tone="success" />
        </section>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by customer name, phone or email"
              className="w-full h-11 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus-ring focus:border-primary/40"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="!h-11 !rounded-full">
              <option value="all">All statuses</option>
              <option value="needs_review">Needs review</option>
              <option value="review_later">Review later</option>
              <option value="not_duplicate">Not a duplicate</option>
              <option value="merge_completed">Merge completed</option>
            </Select>
            <Select value={conf} onChange={(e) => setConf(e.target.value as ConfFilter)} className="!h-11 !rounded-full">
              <option value="all">Any confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="!h-11 !rounded-full">
              <option value="priority">Priority</option>
              <option value="confidence">Confidence</option>
              <option value="recent">Recent</option>
            </Select>
          </div>
        </div>

        <SectionLabel right={<span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>}>
          Possible duplicate groups
        </SectionLabel>

        {allGroups.length === 0 ? (
          <DuplicateEmpty>
            <p className="font-medium text-foreground mb-1">No possible duplicate customers found.</p>
            <p>FreBob will show records here when customer details appear to match.</p>
          </DuplicateEmpty>
        ) : filtered.length === 0 ? (
          <DuplicateEmpty>
            <p className="font-medium text-foreground mb-1">You have reviewed all current duplicate suggestions.</p>
            <p>Adjust filters to see other groups.</p>
          </DuplicateEmpty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((g) => {
              const members = g.memberIds
                .map((id) => memberCache[id])
                .filter((m): m is { customer: Customer; metrics: CustomerMetrics } => !!m);
              const customers = members.map((m) => m.customer);
              const metrics: Record<string, CustomerMetrics> = {};
              members.forEach((m) => { metrics[m.customer.id] = m.metrics; });
              return <DuplicateGroupCard key={g.id} group={g} customers={customers} metrics={metrics} />;
            })}
          </div>
        )}

        {allGroups.length === 0 && (
          <div className="mt-6">
            <LoadingSkeleton rows={0} />
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-secondary bg-card p-4 text-sm text-muted-foreground flex items-start gap-3">
          <Users className="h-4 w-4 mt-0.5 text-primary/60" />
          <p>
            FreBob suggests possible duplicates but never merges customer records automatically.
            Every merge needs a human confirmation and can be reviewed later.
          </p>
        </div>
      </PageCanvas>
    </AppShell>
  );
}
