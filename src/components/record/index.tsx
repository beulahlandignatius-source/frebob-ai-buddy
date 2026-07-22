import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Check, Clock, Sparkles, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfidenceLabel, Extraction, OrderStatus, PaymentStatus } from "@/lib/records-store";

/* Record source card */
export function RecordSourceCard({
  title, description, status, icon: Icon, to, onClick,
}: {
  title: string;
  description: string;
  status: "Available" | "Coming soon";
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  onClick?: () => void;
}) {
  const disabled = status === "Coming soon";
  const inner = (
    <div className={cn(
      "group relative bg-card border border-secondary rounded-[20px] p-5 transition h-full flex flex-col text-left",
      disabled ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5 hover:border-primary/25 shadow-card",
    )}>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-[15px] leading-tight">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
          disabled ? "bg-secondary text-muted-foreground" : "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
        )}>{status}</span>
      </div>
    </div>
  );

  if (disabled) return <div>{inner}</div>;
  if (to) return <Link to={to} className="block h-full">{inner}</Link>;
  return <button type="button" onClick={onClick} className="block h-full w-full">{inner}</button>;
}

/* AI processing stepper (glassmorphic) */
export function AIProcessingStepper({ activeStep }: { activeStep: number }) {
  const steps = [
    "Reading conversation",
    "Detecting language",
    "Identifying business event",
    "Extracting business details",
    "Preparing review",
  ];
  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 glass-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shadow-soft">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display font-bold">FreBob is organising this conversation</p>
          <p className="text-xs text-muted-foreground">Please review the result before saving.</p>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((label, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border",
                done ? "bg-[var(--success)] border-[var(--success)] text-white" :
                active ? "bg-primary/10 border-primary text-primary animate-pulse" :
                "bg-card border-secondary text-muted-foreground",
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <Clock className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
              </div>
              <span className={cn(active ? "text-foreground font-medium" : done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* Confidence badge */
export function ConfidenceBadge({ label }: { label: ConfidenceLabel }) {
  const map: Record<ConfidenceLabel, { text: string; cls: string; Icon: typeof Sparkles }> = {
    high: { text: "High confidence", cls: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]", Icon: Check },
    needs_review: { text: "Needs review", cls: "bg-accent/15 text-accent", Icon: AlertTriangle },
    missing_information: { text: "Missing information", cls: "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]", Icon: ShieldAlert },
  };
  const { text, cls, Icon } = map[label];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", cls)}>
      <Icon className="h-3 w-3" /> {text}
    </span>
  );
}

/* Missing-field alert */
export function MissingFieldAlert({ fields }: { fields: string[] }) {
  if (!fields.length) return null;
  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-[var(--warning)] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Please confirm before approval</p>
          <ul className="mt-1 text-sm text-foreground/80 space-y-0.5 list-disc list-inside">
            {fields.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function OriginalConversationPanel({ text }: { text: string }) {
  return (
    <div className="bg-card border border-secondary rounded-[20px] p-4 sm:p-5">
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/40 mb-2">Original conversation</p>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85 font-sans">{text}</pre>
    </div>
  );
}

/* Field label helpers */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{children}</label>;
}

export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "partially_paid", "paid", "unknown"];
export const ORDER_STATUSES: OrderStatus[] = [
  "enquiry", "reserved", "pending", "awaiting_pickup", "awaiting_delivery", "completed", "cancelled", "unknown",
];
export const EVENT_TYPES: Extraction["event_type"][] = [
  "enquiry", "reservation", "sale_order", "payment", "cancellation", "unknown",
];

export function humanise(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusPill({ tone, children }: { tone: "success" | "warn" | "info" | "muted"; children: ReactNode }) {
  const cls = {
    success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
    warn: "bg-accent/15 text-accent",
    info: "bg-secondary text-primary",
    muted: "bg-secondary text-muted-foreground",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", cls)}>{children}</span>;
}
