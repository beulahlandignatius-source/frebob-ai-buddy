import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, XCircle, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel,
} from "@/components/dash";
import {
  DuplicateConfidenceBadge, ReviewStatusBadge, MatchReasonList,
  CustomerComparisonCard, MergeSuccessBanner, MergeWarningBanner,
} from "@/components/customers/duplicates";
import {
  getCustomer, computeMetrics, formatMoney,
  type Customer,
} from "@/lib/customers-store";
import {
  getDuplicateGroup, buildMergePreview, performMerge, saveReview,
  type FieldSelection, type MergePreview,
} from "@/lib/duplicates-store";

export const Route = createFileRoute("/customers/duplicates/$groupId")({
  head: () => ({
    meta: [
      { title: "Compare customers — FreBob" },
      { name: "description", content: "Compare possible duplicate customer records side by side." },
    ],
  }),
  component: DuplicateCompare,
});

type Step = "compare" | "preview" | "done";

function DuplicateCompare() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, []);

  const group = useMemo(() => { void tick; return getDuplicateGroup(groupId); }, [groupId, tick]);

  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("compare");
  const [selection, setSelection] = useState<FieldSelection>({});
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialise primary/secondary once
  useEffect(() => {
    if (!group) return;
    if (!primaryId && group.memberIds[0]) setPrimaryId(group.memberIds[0]);
    if (!secondaryId && group.memberIds[1]) setSecondaryId(group.memberIds[1]);
  }, [group, primaryId, secondaryId]);

  if (!group) {
    return (
      <AppShell>
        <PageCanvas>
          <SurfaceHeader title="Group not found" subtitle="This duplicate group may already have been reviewed." />
          <Link to="/customers/duplicates">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back to duplicate review</Button>
          </Link>
        </PageCanvas>
      </AppShell>
    );
  }

  const members: Customer[] = group.memberIds.map((id) => getCustomer(id)).filter((c): c is Customer => !!c);
  const primary = primaryId ? getCustomer(primaryId) : null;
  const secondary = secondaryId ? getCustomer(secondaryId) : null;

  const preview: MergePreview | null =
    step === "preview" && primary && secondary
      ? buildMergePreview(primary.id, secondary.id)
      : null;

  // Prefill selection with the "suggested" value per conflict
  useEffect(() => {
    if (step !== "preview" || !preview) return;
    const sel: FieldSelection = {};
    for (const c of preview.conflicts) {
      const src = c.suggested === "primary" ? preview.primary : preview.secondary;
      (sel as Record<string, unknown>)[c.field] = src[c.field] ?? null;
    }
    setSelection(sel);
    setConfirm(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, primary?.id, secondary?.id]);

  function handleKeepSeparate() {
    if (!primary || !secondary) return;
    saveReview(primary.id, secondary.id, "not_duplicate");
    setSuccessMsg("These customer records will remain separate.");
    setStep("done");
  }
  function handleReviewLater() {
    if (!primary || !secondary) return;
    saveReview(primary.id, secondary.id, "review_later");
    navigate({ to: "/customers/duplicates" });
  }
  function handleMerge() {
    if (!primary || !secondary) return;
    setError(null);
    const res = performMerge({
      primaryId: primary.id,
      secondaryId: secondary.id,
      selection,
      reasons: group.reasons,
    });
    if (!res.ok) {
      setError(
        res.code === "already_merged"
          ? "One of these customer records has already been merged. Refresh the page to view the latest information."
          : `FreBob could not complete this merge. No records were changed. (${res.error})`,
      );
      return;
    }
    setSuccessMsg(`${secondary.name} has been merged into ${primary.name}.`);
    setStep("done");
  }

  if (step === "done") {
    return (
      <AppShell>
        <PageCanvas>
          <SurfaceHeader eyebrow="Duplicate review" title="Review saved" />
          {successMsg && <MergeSuccessBanner text={successMsg} />}
          <div className="mt-6 flex gap-3">
            <Link to="/customers/duplicates"><Button>Back to duplicates</Button></Link>
            {primary && (
              <Link to="/customers/$id" params={{ id: primary.id }}>
                <Button variant="outline">View primary customer</Button>
              </Link>
            )}
          </div>
        </PageCanvas>
      </AppShell>
    );
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
          eyebrow="Duplicate group"
          title={step === "preview" ? "Merge preview" : "Compare records"}
          subtitle={step === "preview" ? "Choose which values to keep before merging." : "Review why these records were flagged."}
        />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <DuplicateConfidenceBadge level={group.confidence} />
          <ReviewStatusBadge status={group.reviewStatus} />
        </div>

        <section className="mb-6 rounded-2xl border border-secondary bg-card p-4">
          <SectionLabel>Why we flagged this group</SectionLabel>
          <MatchReasonList reasons={group.reasons} />
        </section>

        {step === "compare" && (
          <>
            <SectionLabel>Side-by-side comparison</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-2 mb-6">
              {members.map((c) => (
                <CustomerComparisonCard
                  key={c.id}
                  customer={c}
                  metrics={computeMetrics(c.id)}
                  isPrimary={c.id === primaryId}
                  onSelectPrimary={() => {
                    // set as primary; move current primary to secondary if needed
                    if (primaryId && primaryId !== c.id) setSecondaryId(primaryId);
                    setPrimaryId(c.id);
                  }}
                />
              ))}
            </div>

            {members.length > 2 && (
              <p className="text-xs text-muted-foreground mb-4">
                This group has {members.length} records. Merges happen between two customers at a time — set a primary, then choose which record to compare against it.
              </p>
            )}

            <StickyActions
              left={
                <Button variant="outline" onClick={handleReviewLater}>
                  <Clock className="h-4 w-4 mr-1" /> Review later
                </Button>
              }
              right={
                <>
                  <Button variant="ghost" onClick={handleKeepSeparate}>
                    <XCircle className="h-4 w-4 mr-1" /> Keep separate
                  </Button>
                  <Button
                    onClick={() => setStep("preview")}
                    disabled={!primary || !secondary || primary.id === secondary.id}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" /> Continue to merge preview
                  </Button>
                </>
              }
            />
          </>
        )}

        {step === "preview" && preview && (
          <>
            <div className="mb-4 rounded-2xl border border-secondary bg-card p-4 text-sm">
              <p>
                <strong>{preview.primary.name}</strong> will remain as the main profile.
                Orders, payments and activity from <strong>{preview.secondary.name}</strong> will be linked to it.
              </p>
            </div>

            {preview.conflicts.length > 0 ? (
              <section className="mb-6 rounded-2xl border border-secondary bg-card p-4 sm:p-5">
                <SectionLabel>Choose which values to keep</SectionLabel>
                <div className="space-y-3">
                  {preview.conflicts.map((c) => {
                    const chosen = (selection as Record<string, unknown>)[c.field];
                    const isPrimaryChosen = chosen === (preview.primary[c.field] ?? null);
                    return (
                      <div key={c.field} className="rounded-xl border border-secondary p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{c.label}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <ChoiceButton
                            active={isPrimaryChosen}
                            label={preview.primary.name}
                            value={c.primaryValue}
                            onClick={() => setSelection((s) => ({
                              ...s, [c.field]: preview.primary[c.field] ?? null,
                            } as FieldSelection))}
                          />
                          <ChoiceButton
                            active={!isPrimaryChosen}
                            label={preview.secondary.name}
                            value={c.secondaryValue}
                            onClick={() => setSelection((s) => ({
                              ...s, [c.field]: preview.secondary[c.field] ?? null,
                            } as FieldSelection))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <MergeSuccessBanner text="No conflicting fields — all customer details align." />
            )}

            <section className="mb-6 rounded-2xl border border-secondary bg-card p-4 sm:p-5">
              <SectionLabel>Records that will move</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3 text-center">
                <MiniStat label="Orders to move" value={preview.orders.fromSecondary.length} />
                <MiniStat label="Existing orders on primary" value={preview.orders.existingOnPrimary.length} />
                <MiniStat label="Cancelled orders excluded" value={preview.totals.cancelledExcluded} />
              </div>
            </section>

            <section className="mb-6 rounded-2xl border border-secondary bg-card p-4 sm:p-5">
              <SectionLabel>Financial impact</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatBlock label="Combined total spent" value={formatMoney(preview.totals.combinedTotalSpent)} />
                <StatBlock label="Combined amount paid" value={formatMoney(preview.totals.combinedAmountPaid)} />
                <StatBlock
                  label="Combined outstanding"
                  value={formatMoney(preview.totals.combinedOutstanding)}
                  tone={preview.totals.combinedOutstanding > 0 ? "warning" : undefined}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Totals are recalculated from linked orders and payments — cancelled orders are excluded, no payment is counted twice.
              </p>
            </section>

            {error && <MergeWarningBanner text={error} />}

            <div className="rounded-2xl border border-secondary bg-card p-4 sm:p-5 mt-6">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" className="mt-0.5"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                <span>
                  I confirm this merge. Orders, payments, notes and activity for{" "}
                  <strong>{preview.secondary.name}</strong> will be connected to{" "}
                  <strong>{preview.primary.name}</strong>.
                </span>
              </label>
            </div>

            <StickyActions
              left={
                <Button variant="ghost" onClick={() => setStep("compare")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to comparison
                </Button>
              }
              right={
                <>
                  <Button variant="outline" onClick={handleKeepSeparate}>Keep separate</Button>
                  <Button onClick={handleMerge} disabled={!confirm}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Merge records
                  </Button>
                </>
              }
            />
          </>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function StickyActions({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="sticky bottom-4 mt-6 rounded-2xl border border-secondary bg-card/95 backdrop-blur p-3 shadow-card flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="flex gap-2">{left}</div>
      <div className="flex gap-2 sm:justify-end flex-wrap">{right}</div>
    </div>
  );
}

function ChoiceButton({
  active, label, value, onClick,
}: { active: boolean; label: string; value: string | null; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-secondary bg-card hover:border-primary/30"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">From {label}</p>
      <p className={`mt-1 text-sm ${value ? "text-foreground" : "text-muted-foreground/60"}`}>
        {value ?? "— (empty)"}
      </p>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "warning" ? "border-accent/30 bg-accent/5" : "border-secondary bg-card"}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}
