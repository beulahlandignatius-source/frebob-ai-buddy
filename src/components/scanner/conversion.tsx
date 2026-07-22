// Action Centre + conversion helpers for approved scans (Batch 7B).
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, Undo2, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/fb/Button";
import { SectionLabel } from "@/components/dash";
import type { DocumentScan, ScanExtraction } from "@/lib/scanner-store";
import {
  suggestActionsFor, listConversionActions, listConversionEvents, hasCompletedAction,
  type ConversionAction, type ConversionActionType,
} from "@/lib/scan-conversions-store";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<ConversionActionType, string> = {
  create_order: "Order created",
  link_order: "Linked to order",
  record_payment: "Payment recorded",
  receive_inventory: "Stock received",
  adjust_inventory: "Stock adjusted",
  create_customer: "Customer added",
  link_customer: "Linked to customer",
  record_expense: "Expense logged",
};

function actionLinkFor(a: ConversionAction): { to: string; label: string } {
  if (a.recordType === "order") return { to: `/orders/${a.targetId}`, label: "View order" };
  if (a.recordType === "customer") return { to: `/customers/${a.targetId}`, label: "View customer" };
  if (a.recordType === "inventory_event") return { to: `/inventory`, label: "View inventory" };
  return { to: "/scanner", label: "View" };
}

export function ScanActionCentre({
  scan,
  reviewed,
}: {
  scan: DocumentScan;
  reviewed: ScanExtraction;
}) {
  const suggestions = suggestActionsFor(scan, reviewed);
  const actions = listConversionActions(scan.id);
  const events = listConversionEvents(scan.id);

  const primaries = suggestions.filter((s) => s.priority === "primary");
  const secondaries = suggestions.filter((s) => s.priority === "secondary");

  return (
    <div className="space-y-5">
      <div className="rounded-[20px] border border-primary/25 bg-[var(--surface-tinted)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <p className="font-display font-bold">Action Centre</p>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Suggested next steps for this approved document. Each action requires your confirmation before anything is recorded.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {primaries.map((s) => {
            const done = hasCompletedAction(scan.id, s.actionType);
            return (
              <SuggestedActionCard
                key={s.actionType}
                scanId={scan.id}
                actionType={s.actionType}
                label={s.label}
                description={s.description}
                variant="primary"
                done={done}
              />
            );
          })}
          {secondaries.map((s) => {
            const done = hasCompletedAction(scan.id, s.actionType);
            return (
              <SuggestedActionCard
                key={s.actionType}
                scanId={scan.id}
                actionType={s.actionType}
                label={s.label}
                description={s.description}
                variant="secondary"
                done={done}
              />
            );
          })}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="rounded-[20px] border border-secondary bg-card p-5">
          <SectionLabel>Linked records</SectionLabel>
          <ul className="space-y-2">
            {actions.filter((a) => !a.undone).map((a) => {
              const link = actionLinkFor(a);
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-secondary/70 bg-secondary/20 px-3 py-2.5">
                  <div className="flex items-start gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ACTION_LABEL[a.actionType]}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.summary}</p>
                    </div>
                  </div>
                  <Link to={link.to as never} className="text-xs text-primary font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                    {link.label} <ChevronRight className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <div className="rounded-[20px] border border-secondary bg-card p-5">
          <SectionLabel>Conversion history</SectionLabel>
          <ol className="space-y-2.5">
            {events.slice().reverse().map((e) => (
              <li key={e.id} className="flex items-start gap-2.5">
                {e.eventType === "undone"
                  ? <Undo2 className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                  : e.eventType === "duplicate_detected"
                    ? <AlertCircle className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
                    : <Clock className="h-3.5 w-3.5 text-primary/60 mt-1 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString("en-NG")} · {e.createdBy}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SuggestedActionCard({
  scanId, actionType, label, description, variant, done,
}: {
  scanId: string;
  actionType: ConversionActionType;
  label: string;
  description: string;
  variant: "primary" | "secondary";
  done: boolean;
}) {
  return (
    <Link
      to="/scanner/$scanId/convert"
      params={{ scanId }}
      search={{ action: actionType } as never}
      className={cn(
        "group rounded-2xl border p-4 transition text-left",
        variant === "primary"
          ? "border-primary/30 bg-card hover:border-primary/50 hover:shadow-card"
          : "border-secondary bg-card/70 hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {done
          ? <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
          : <ArrowRight className="h-4 w-4 text-primary shrink-0 transition group-hover:translate-x-0.5" />}
      </div>
      {done && <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">Already done — you can run it again</p>}
    </Link>
  );
}

export function ScanSourceChip({ scanId }: { scanId: string }) {
  return (
    <Link
      to="/scanner/$scanId"
      params={{ scanId }}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-[var(--surface-tinted)] px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
    >
      <Sparkles className="h-3 w-3" /> From scan
    </Link>
  );
}

export function DuplicateActionWarning({ existingCount, onProceed, onCancel }: {
  existingCount: number;
  onProceed: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-display font-bold">Possible duplicate</p>
          <p className="text-xs text-muted-foreground">
            This scan has already produced {existingCount} record{existingCount === 1 ? "" : "s"} of this type. Continue only if this is a separate transaction.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onProceed}>Continue anyway</Button>
      </div>
    </div>
  );
}
