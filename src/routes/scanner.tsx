import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Image as ImageIcon, FileText, Sparkles, ScanLine, Plus, History, Search } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import { CaptureOptionCard, ScanHistoryCard } from "@/components/scanner";
import { listScans, type DocumentScan } from "@/lib/scanner-store";
import { cn } from "@/lib/utils";
import { DemoHint } from "@/components/demo/DemoHint";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — FreBob" },
      { name: "description", content: "Turn receipts, invoices and business documents into approved records." },
      { property: "og:title", content: "Scanner — FreBob" },
      { property: "og:description", content: "Scan first, extract second, review third, approve last." },
    ],
  }),
  component: ScannerDashboard,
});

function ScannerDashboard() {
  const [scans, setScans] = useState<DocumentScan[]>([]);
  const navigate = Route.useNavigate();

  useEffect(() => { setScans(listScans()); }, []);

  const summary = useMemo(() => {
    const s = { total: scans.length, awaiting: 0, approved: 0, failed: 0 };
    for (const sc of scans) {
      if (sc.status === "ready_for_review" || sc.status === "draft" || sc.status === "processing") s.awaiting++;
      else if (sc.status === "approved") s.approved++;
      else if (sc.status === "extraction_failed" || sc.status === "rejected") s.failed++;
    }
    return s;
  }, [scans]);

  const recent = scans.slice(0, 6);

  const go = (source: "camera" | "upload" | "pdf" | "demo") =>
    navigate({ to: "/scanner/new", search: { source } as never });

  return (
    <AppShell>
      <DemoHint hintKey="scanner-v1" title="Scan receipts and invoices">Upload or snap a document. Bob extracts line items so you can review, edit and turn them into orders or stock updates.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Scanner"
          title="Turn documents into approved records"
          subtitle="Scan first, extract second, review third, approve last."
          action={
            <div className="flex items-center gap-2">
              <Link to="/scanner/history">
                <Button size="sm" variant="outline"><History className="h-4 w-4 mr-1" /> History</Button>
              </Link>
              <Button size="sm" onClick={() => go("camera")}>
                <Plus className="h-4 w-4 mr-1" /> Scan document
              </Button>
            </div>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryTile label="Total scans" value={summary.total} />
          <SummaryTile label="Awaiting review" value={summary.awaiting} tone="warn" />
          <SummaryTile label="Approved" value={summary.approved} tone="success" />
          <SummaryTile label="Failed" value={summary.failed} tone="danger" />
        </div>

        <SectionLabel>Quick scan</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <CaptureOptionCard icon={Camera} title="Take Photo" description="Use your camera for the sharpest result." primary onClick={() => go("camera")} />
          <CaptureOptionCard icon={ImageIcon} title="Upload Image" description="JPG, PNG or WEBP up to 10MB." onClick={() => go("upload")} />
          <CaptureOptionCard icon={FileText} title="Upload PDF" description="Multi-page PDF up to 20MB." onClick={() => go("pdf")} />
          <CaptureOptionCard icon={Sparkles} title="Try Demo Scan" description="See the full workflow with a sample receipt." onClick={() => go("demo")} />
        </div>

        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Recent scans</SectionLabel>
          <Link to="/scanner/history" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <Search className="h-3 w-3" /> Search all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No scanned documents yet"
            description="Scan a receipt, invoice or business document to create your first reviewed record."
            action={<Button size="sm" onClick={() => go("camera")}>Scan document</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((s) => (
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

function SummaryTile({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "success" | "danger" }) {
  const toneCls = {
    default: "",
    warn: "text-accent",
    success: "text-[var(--success)]",
    danger: "text-destructive",
  }[tone];
  return (
    <div className="rounded-2xl border border-secondary bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight", toneCls)}>{value}</p>
    </div>
  );
}
