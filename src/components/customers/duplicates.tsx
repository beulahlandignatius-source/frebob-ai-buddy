import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ShieldCheck, AlertTriangle, Users, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dash";
import { CustomerAvatar } from "@/components/customers";
import { formatMoney, relativeTime, type Customer, type CustomerMetrics } from "@/lib/customers-store";
import {
  confidenceLabel, reviewStatusLabel,
  type ConfidenceLevel, type DuplicateGroup, type MatchReason,
} from "@/lib/duplicates-store";

/* ---------- Summary card ---------- */
export function DuplicateSummaryCard({
  label, value, hint, tone,
}: { label: string; value: number | string; hint?: string; tone?: "warning" | "success" | "info" | "accent" }) {
  const toneCls =
    tone === "warning" ? "border-accent/30 bg-accent/5"
    : tone === "success" ? "border-[color-mix(in_oklab,var(--success)_20%,transparent)] bg-[color-mix(in_oklab,var(--success)_6%,transparent)]"
    : tone === "info" ? "border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[color-mix(in_oklab,var(--info)_6%,transparent)]"
    : tone === "accent" ? "border-primary/20 bg-primary/5"
    : "border-secondary bg-card";
  return (
    <div className={cn("rounded-2xl border p-4", toneCls)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- Confidence + status badges ---------- */
export function DuplicateConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const tone = level === "high" ? "warning" : level === "medium" ? "info" : "neutral";
  return <StatusBadge tone={tone as never}>{confidenceLabel(level)}</StatusBadge>;
}

export function ReviewStatusBadge({ status }: { status: DuplicateGroup["reviewStatus"] }) {
  const tone =
    status === "needs_review" ? "warning"
    : status === "not_duplicate" ? "neutral"
    : status === "review_later" ? "info"
    : "success";
  return <StatusBadge tone={tone as never}>{reviewStatusLabel(status)}</StatusBadge>;
}

/* ---------- Match reason list ---------- */
export function MatchReasonList({ reasons, compact }: { reasons: MatchReason[]; compact?: boolean }) {
  if (!reasons.length) return null;
  return (
    <ul className={cn("space-y-1.5", compact && "space-y-1")}>
      {reasons.map((r) => (
        <li key={r.code} className="flex gap-2 text-sm text-foreground/90">
          <ShieldCheck className="h-4 w-4 mt-0.5 text-primary/60 shrink-0" />
          <span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Group list card ---------- */
export function DuplicateGroupCard({
  group, customers, metrics,
}: {
  group: DuplicateGroup;
  customers: Customer[];
  metrics: Record<string, CustomerMetrics>;
}) {
  const totalOrders = customers.reduce((s, c) => s + (metrics[c.id]?.totalOrders ?? 0), 0);
  const totalPayments = customers.reduce((s, c) => s + (metrics[c.id]?.validOrders.flatMap((o) => o.payments).length ?? 0), 0);
  const outstanding = customers.reduce((s, c) => s + (metrics[c.id]?.outstanding ?? 0), 0);

  return (
    <Link
      to="/customers/duplicates/$groupId"
      params={{ groupId: group.id }}
      className="block rounded-2xl border border-secondary bg-card p-4 sm:p-5 shadow-card hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <DuplicateConfidenceBadge level={group.confidence} />
            <ReviewStatusBadge status={group.reviewStatus} />
          </div>
          <div className="flex flex-col gap-2">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 min-w-0">
                <CustomerAvatar name={c.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.phone ?? "No phone"}{c.email ? ` · ${c.email}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>

      <div className="mt-4">
        <MatchReasonList reasons={group.reasons.slice(0, 2)} compact />
        {group.reasons.length > 2 && (
          <p className="mt-1 text-xs text-muted-foreground">+{group.reasons.length - 2} more reason(s)</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Orders" value={totalOrders} />
        <MiniStat label="Payments" value={totalPayments} />
        <MiniStat label="Outstanding" value={outstanding > 0 ? formatMoney(outstanding) : "—"} />
      </div>
    </Link>
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

/* ---------- Comparison card ---------- */
export function CustomerComparisonCard({
  customer, metrics, isPrimary, onSelectPrimary,
}: {
  customer: Customer;
  metrics: CustomerMetrics;
  isPrimary: boolean;
  onSelectPrimary?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all",
        isPrimary ? "border-primary bg-primary/5 shadow-card" : "border-secondary bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <CustomerAvatar name={customer.name} size={44} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{customer.name}</p>
            <p className="text-xs text-muted-foreground">
              Created {relativeTime(customer.createdAt)}
            </p>
          </div>
        </div>
        {isPrimary ? (
          <StatusBadge tone="success">Primary</StatusBadge>
        ) : (
          <button
            type="button"
            onClick={onSelectPrimary}
            className="text-xs font-medium text-primary hover:underline"
          >
            Set as primary
          </button>
        )}
      </div>

      <dl className="space-y-2 text-sm">
        <FieldRow label="Phone" value={customer.phone} />
        <FieldRow label="WhatsApp" value={customer.whatsapp} />
        <FieldRow label="Email" value={customer.email} />
        <FieldRow label="Address" value={customer.address} />
        <FieldRow label="City" value={customer.city} />
        <FieldRow label="State" value={customer.state} />
        <FieldRow label="Preferred language" value={customer.preferredLanguage} />
        <FieldRow label="Notes" value={customer.notesSummary} />
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <MiniStat label="Total orders" value={metrics.totalOrders} />
        <MiniStat label="Total spent" value={formatMoney(metrics.totalSpent)} />
        <MiniStat label="Amount paid" value={formatMoney(metrics.amountPaid)} />
        <MiniStat label="Outstanding" value={formatMoney(metrics.outstanding)} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> Last activity {relativeTime(metrics.lastActivityAt)}
      </p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-secondary/70 pb-1.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn("text-sm text-right truncate", value ? "text-foreground" : "text-muted-foreground/60")}>
        {value || "—"}
      </dd>
    </div>
  );
}

/* ---------- Merge success / info banners ---------- */
export function MergeSuccessBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--success)_25%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-4">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-[var(--success)]" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function MergeWarningBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <AlertTriangle className="h-4 w-4 mt-0.5 text-[color-mix(in_oklab,var(--accent)_70%,black)]" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ---------- Empty state helper ---------- */
export function DuplicateEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-secondary bg-card p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary text-primary flex items-center justify-center">
        <Users className="h-6 w-6" />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
