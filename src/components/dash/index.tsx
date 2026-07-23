import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Package,
  CreditCard,
  ShoppingCart,
  Wrench,
  UserCircle2,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, type Activity, type LowStock, type NotificationItem } from "@/lib/mock-data";
import { Button } from "@/components/fb/Button";

/* ---------- PageHeader ---------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight break-words">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground break-words">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </header>
  );
}

/* ---------- MetricCard ---------- */
export function MetricCard({
  label,
  value,
  changePct,
  sub,
  linkLabel,
  linkTo,
  isCurrency = true,
  icon: Icon,
}: {
  label: string;
  value: number;
  changePct?: number;
  sub?: string;
  linkLabel: string;
  linkTo: string;
  isCurrency?: boolean;
  icon?: typeof Package;
}) {
  const up = (changePct ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <div className="h-8 w-8 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-[26px] sm:text-[30px] font-bold tracking-tight leading-none">
        {isCurrency ? fmt(value) : value}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {typeof changePct === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              up ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]"
                 : "bg-destructive/10 text-destructive",
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? "+" : ""}
            {changePct}%
          </span>
        )}
        {sub && <span className="text-muted-foreground">{sub}</span>}
      </div>
      <Link
        to={linkTo}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}


/* ---------- QuickActionCard ---------- */
export function QuickActionCard({
  icon: Icon,
  label,
  hint,
  to,
  onClick,
  primary = false,
}: {
  icon: typeof Package;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const content = (
    <>
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
          primary ? "brand-gradient text-primary-foreground" : "bg-secondary text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold truncate">{label}</p>
        {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
      </div>
    </>
  );
  const cls = cn(
    "flex items-center gap-3 rounded-2xl border p-4 transition text-left w-full min-h-[72px]",
    primary
      ? "border-primary/30 bg-[var(--surface-tinted)] shadow-elegant hover:border-primary/50"
      : "border-border bg-card shadow-card hover:border-primary/30",
  );
  if (to) return <Link to={to} className={cls}>{content}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{content}</button>;
}


/* ---------- InventoryAlertRow ---------- */
export function InventoryAlertRow({ item, onRestock }: { item: LowStock; onRestock?: (id: string) => void }) {
  const out = item.status === "out";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.stock} {item.unit} left · reorder at {item.reorder}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge tone={out ? "danger" : "warning"}>
          {out ? "Out of stock" : "Low stock"}
        </StatusBadge>
        <Button size="sm" variant="outline" onClick={() => onRestock?.(item.id)}>
          Restock
        </Button>
      </div>
    </div>
  );
}

/* ---------- ActivityItem ---------- */
const activityIcon: Record<Activity["type"], typeof Package> = {
  sale: CheckCircle2,
  payment: CreditCard,
  order: ShoppingCart,
  restock: Package,
  correction: Wrench,
  customer: UserCircle2,
};

export function ActivityItem({ item }: { item: Activity }) {
  const Icon = activityIcon[item.type];
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
      </div>
      <div className="text-right shrink-0">
        {typeof item.amount === "number" && (
          <p className="text-sm font-semibold">{fmt(item.amount)}</p>
        )}
        {item.status && (
          <StatusBadge tone={statusTone(item.status)} className="mt-1">
            {statusLabel(item.status)}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}

function statusTone(s: NonNullable<Activity["status"]>) {
  return s === "completed" ? "success"
    : s === "partial" ? "warning"
    : s === "pending" ? "info"
    : "neutral";
}
function statusLabel(s: NonNullable<Activity["status"]>) {
  return s === "completed" ? "Completed"
    : s === "partial" ? "Partial"
    : s === "pending" ? "Pending"
    : "Updated";
}

/* ---------- StatusBadge ---------- */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const map = {
    success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
    warning: "bg-accent/15 text-[color-mix(in_oklab,var(--accent)_70%,black)]",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-[var(--info)]",
    neutral: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", map[tone], className)}>
      {children}
    </span>
  );
}

/* ---------- NotificationItem ---------- */
const notifIcon: Record<NotificationItem["category"], typeof Bell> = {
  inventory: AlertTriangle,
  payment: CreditCard,
  order: ShoppingCart,
  system: Bell,
};

export function NotificationRow({
  item,
  onOpen,
  onRead,
  onDismiss,
}: {
  item: NotificationItem;
  onOpen?: (id: string) => void;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const Icon = notifIcon[item.category];
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition",
        item.read ? "bg-card border-border" : "bg-secondary/40 border-primary/20",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            item.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <button type="button" onClick={() => onOpen?.(item.id)} className="min-w-0 text-left">
          <p className="font-medium truncate flex items-center gap-2">
            {!item.read && <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
            {item.title}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{item.body}</p>
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {item.time}
          </p>
        </button>
        <div className="flex flex-col gap-1 shrink-0">
          {!item.read && (
            <Button size="sm" variant="ghost" onClick={() => onRead?.(item.id)}>
              Mark read
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDismiss?.(item.id)}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PeriodTabs ---------- */
export function PeriodTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition",
            value === o.value ? "bg-card shadow-card text-foreground" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  title,
  description,
  action,
}: {
  icon?: typeof Bell;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


/* ---------- LoadingSkeleton ---------- */
export function LoadingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-secondary bg-card p-4 animate-pulse">
          <div className="h-3 w-1/3 bg-muted rounded" />
          <div className="mt-3 h-4 w-2/3 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

/* ---------- ErrorState ---------- */
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-semibold">Something went wrong</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? "We couldn't load this section. Please try again."}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Retry
        </Button>
      )}
    </div>
  );
}

/* ---------- SuccessBanner ---------- */
export function SuccessBanner({ title, description, onDismiss }: { title: string; description?: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--success)_25%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-4">
      <div className="h-9 w-9 rounded-xl bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)] flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground">
          Dismiss
        </button>
      )}
    </div>
  );
}

/* ---------- PageCanvas — tinted page wrapper matching Calm Ledger ---------- */
export function PageCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 lg:-mx-8 -my-6 lg:-my-10 px-4 lg:px-8 py-6 lg:py-10 bg-[var(--surface-tinted)] min-h-[calc(100dvh-0px)]">
      {children}
    </div>
  );
}

/* ---------- SectionLabel ---------- */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/40">
        {children}
      </h2>
      {right}
    </div>
  );
}

/* ---------- SurfaceHeader — Calm Ledger page hero ---------- */
export function SurfaceHeader({
  eyebrow, title, subtitle, action,
}: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-[26px] sm:text-[32px] font-extrabold text-primary tracking-tight truncate">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-subtle-foreground truncate mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/* ---------- ReportSummaryCard ---------- */
export function ReportSummaryCard({
  label,
  value,
  isCurrency = true,
  hint,
}: {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg sm:text-xl font-bold tracking-tight truncate">
        {typeof value === "number" && isCurrency ? fmt(value) : value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/* ---------- ResponsiveReportTable ---------- */
import type { ReportRow } from "@/lib/mock-data";
export function ResponsiveReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Orders</th>
            <th className="px-4 py-3 font-medium">Sales</th>
            <th className="px-4 py-3 font-medium">Received</th>
            <th className="px-4 py-3 font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{r.date}</td>
              <td className="px-4 py-3">{r.orders}</td>
              <td className="px-4 py-3">{fmt(r.sales)}</td>
              <td className="px-4 py-3">{fmt(r.received)}</td>
              <td className="px-4 py-3">{fmt(r.outstanding)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {rows.map((r, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{r.date}</p>
              <span className="text-xs text-muted-foreground">{r.orders} orders</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Sales</dt><dd className="text-right font-medium">{fmt(r.sales)}</dd>
              <dt className="text-muted-foreground">Received</dt><dd className="text-right">{fmt(r.received)}</dd>
              <dt className="text-muted-foreground">Outstanding</dt><dd className="text-right">{fmt(r.outstanding)}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
