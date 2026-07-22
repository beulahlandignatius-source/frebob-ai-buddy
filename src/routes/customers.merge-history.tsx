import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, StatusBadge, EmptyState } from "@/components/dash";
import { MatchReasonList, MergeSuccessBanner, MergeWarningBanner } from "@/components/customers/duplicates";
import {
  listMergeEvents, canUndoMerge, undoMerge,
  type MergeEvent,
} from "@/lib/duplicates-store";
import { relativeTime } from "@/lib/customers-store";

export const Route = createFileRoute("/customers/merge-history")({
  head: () => ({
    meta: [
      { title: "Merge history — FreBob" },
      { name: "description", content: "Audit history of customer merges, with undo where safe." },
    ],
  }),
  component: MergeHistoryPage,
});

function MergeHistoryPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, []);
  const events = useMemo(() => { void tick; return listMergeEvents(); }, [tick]);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function tryUndo(ev: MergeEvent) {
    const check = canUndoMerge(ev.id);
    if (!check.canUndo) {
      setError(check.reason ?? "This merge cannot be safely reversed automatically. Review the linked records manually.");
      setBanner(null);
      return;
    }
    const ok = confirm(`Reverse the merge of ${ev.secondarySnapshot.name} into ${ev.primarySnapshot.name}?`);
    if (!ok) return;
    const res = undoMerge(ev.id);
    if (!res.ok) { setError(res.error ?? "Undo failed."); setBanner(null); return; }
    setError(null);
    setBanner(`Merge reversed. ${ev.secondarySnapshot.name} is a separate record again.`);
    setTick((t) => t + 1);
  }

  return (
    <AppShell>
      <PageCanvas>
        <div className="mb-4">
          <Link to="/customers/duplicates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to duplicate review
          </Link>
        </div>
        <SurfaceHeader
          eyebrow="Audit"
          title="Merge history"
          subtitle="A record of every customer merge, with undo where technically safe."
        />

        {banner && <div className="mb-4"><MergeSuccessBanner text={banner} /></div>}
        {error && <div className="mb-4"><MergeWarningBanner text={error} /></div>}

        <SectionLabel right={<span className="text-[11px] text-muted-foreground">{events.length} recorded</span>}>
          Past merges
        </SectionLabel>

        {events.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No merges yet"
            description="Once you confirm a merge, it appears here with full audit details."
            action={<Link to="/customers/duplicates"><Button size="sm">Review duplicates</Button></Link>}
          />
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const undoElig = canUndoMerge(ev.id);
              return (
                <div key={ev.id} className="rounded-2xl border border-secondary bg-card p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <strong>{ev.secondarySnapshot.name}</strong> → <strong>{ev.primarySnapshot.name}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Merged {relativeTime(ev.mergedAt)} · by {ev.mergedBy} · {ev.recordsMoved.orders.length} order{ev.recordsMoved.orders.length === 1 ? "" : "s"} moved
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <StatusBadge tone={ev.status === "reversed" ? "neutral" : ev.status === "failed" ? "danger" : "success"}>
                        {ev.status === "reversed" ? "Reversed" : ev.status === "failed" ? "Failed" : "Completed"}
                      </StatusBadge>
                      {ev.status === "completed" && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => tryUndo(ev)}
                          title={undoElig.canUndo ? "Undo this merge" : undoElig.reason}
                          disabled={!undoElig.canUndo}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Match reasons</p>
                    <MatchReasonList reasons={ev.matchReasons} compact />
                  </div>

                  {ev.status === "completed" && !undoElig.canUndo && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {undoElig.reason}
                    </p>
                  )}
                  {ev.status === "reversed" && ev.reversedAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Reversed {relativeTime(ev.reversedAt)} by {ev.reversedBy ?? "You"}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}
