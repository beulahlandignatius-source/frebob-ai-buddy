import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import { ScanHistoryCard, DOCUMENT_TYPES } from "@/components/scanner";
import { listScans, type DocumentScan, type DocumentType, type ScanStatus } from "@/lib/scanner-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scanner/history")({
  head: () => ({
    meta: [
      { title: "Scan History — FreBob" },
      { name: "description", content: "Browse and review all previously scanned documents." },
      { property: "og:title", content: "Scan History — FreBob" },
      { property: "og:description", content: "Filter, search and open any scanned document." },
    ],
  }),
  component: ScanHistory,
});

type Filter = "all" | "awaiting" | "approved" | "rejected" | "failed" | "draft";

function ScanHistory() {
  const [scans, setScans] = useState<DocumentScan[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState<DocumentType | "all">("all");

  useEffect(() => { setScans(listScans()); }, []);

  const filtered = useMemo(() => scans.filter((s) => {
    if (type !== "all" && s.documentType !== type) return false;
    const matchesFilter =
      filter === "all" ||
      (filter === "awaiting" && (s.status === "ready_for_review" || s.status === "processing")) ||
      (filter === "approved" && s.status === "approved") ||
      (filter === "rejected" && s.status === "rejected") ||
      (filter === "failed" && s.status === "extraction_failed") ||
      (filter === "draft" && s.status === "draft");
    if (!matchesFilter) return false;
    if (!q) return true;
    const query = q.toLowerCase();
    const ex = s.reviewed ?? s.extraction;
    const hay = [
      s.title, s.pages[0]?.fileName ?? "",
      ex?.documentNumber ?? "", ex?.customerName ?? "", ex?.supplierName ?? "",
      ex?.merchantName ?? "", ex?.transactionReference ?? "",
      String(ex?.totalAmount ?? ""),
    ].join(" ").toLowerCase();
    return hay.includes(query);
  }), [scans, q, filter, type]);

  const filters: { v: Filter; label: string }[] = [
    { v: "all", label: "All" },
    { v: "awaiting", label: "Awaiting review" },
    { v: "approved", label: "Approved" },
    { v: "rejected", label: "Rejected" },
    { v: "failed", label: "Failed" },
    { v: "draft", label: "Draft" },
  ];

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Scanner"
          title="Scan history"
          subtitle="Every scanned document, extraction result and approval status."
          action={
            <div className="flex items-center gap-2">
              <Link to="/scanner"><Button size="sm" variant="outline"><ChevronLeft className="h-4 w-4 mr-1" /> Scanner</Button></Link>
              <Link to="/scanner/new" search={{ source: "camera" } as never}>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Scan document</Button>
              </Link>
            </div>
          }
        />

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search document #, customer, supplier, amount, reference…"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus-ring focus:border-primary/40" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value as DocumentType | "all")}
            className="h-10 px-3 rounded-full border border-secondary bg-card text-sm">
            <option value="all">All types</option>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={cn(
                "px-3 h-8 rounded-full text-xs font-bold uppercase tracking-wider border",
                filter === f.v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-secondary text-muted-foreground hover:border-primary/25",
              )}>{f.label}</button>
          ))}
        </div>

        <SectionLabel>{filtered.length} scan{filtered.length === 1 ? "" : "s"}</SectionLabel>
        {filtered.length === 0 ? (
          <EmptyState
            title="No scans match these filters"
            description="Try changing the filter, or scan a new document."
            action={<Link to="/scanner/new" search={{ source: "camera" } as never}><Button size="sm">Scan document</Button></Link>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((s) => (
              <Link key={s.id} to="/scanner/$scanId" params={{ scanId: s.id }} className="block">
                <ScanHistoryCard scan={s} />
              </Link>
            ))}
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}

// silence unused-status warning
export type _KeepStatusType = ScanStatus;
