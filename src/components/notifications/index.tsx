// FreBob — Batch 9A: Notification Centre components.

import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, Bell, BellOff, Boxes, BrainCircuit, CreditCard,
  FileBarChart, ScanLine, Settings2, ShoppingCart, Users, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/fb/Button";
import {
  CATEGORY_LABEL, PRIORITY_LABEL, timeAgo,
  type NotifCategory, type NotifPriority, type Notification, type NotifSettings, type NotifSummary,
} from "@/lib/notifications-store";

const catIcon: Record<NotifCategory, typeof Bell> = {
  inventory: Boxes,
  order: ShoppingCart,
  payment: CreditCard,
  customer: Users,
  scanner: ScanLine,
  report: FileBarChart,
  ai: BrainCircuit,
  system: Bell,
};

const priorityStyle: Record<NotifPriority, { badge: string; ring: string }> = {
  critical: { badge: "bg-[color-mix(in_oklab,#DC2626_14%,transparent)] text-[#B91C1C]", ring: "border-[#DC2626]/30" },
  high:     { badge: "bg-accent/15 text-accent", ring: "border-accent/30" },
  medium:   { badge: "bg-primary/10 text-primary", ring: "border-primary/20" },
  low:      { badge: "bg-secondary text-primary", ring: "border-border" },
  info:     { badge: "bg-muted text-muted-foreground", ring: "border-border" },
};

/* ------------------------------------------------------ NotificationBadge */
export function NotificationBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-card",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ------------------------------------------------------ SummaryCard */
export function NotificationSummaryCard({ summary }: { summary: NotifSummary }) {
  const items = [
    { label: "Unread", value: summary.unread, tone: "text-accent" },
    { label: "Critical", value: summary.critical, tone: "text-[#B91C1C]" },
    { label: "Today", value: summary.today, tone: "text-primary" },
    { label: "This week", value: summary.thisWeek, tone: "text-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{it.label}</p>
          <p className={cn("mt-1 font-display text-2xl font-extrabold", it.tone)}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ NotificationFilter */
export type CategoryFilter = "all" | NotifCategory;
export type PriorityFilter = "all" | NotifPriority;
export type ReadFilter = "all" | "unread" | "read";

export function NotificationFilter({
  category, onCategory, priority, onPriority, readState, onRead,
}: {
  category: CategoryFilter; onCategory: (v: CategoryFilter) => void;
  priority: PriorityFilter; onPriority: (v: PriorityFilter) => void;
  readState: ReadFilter; onRead: (v: ReadFilter) => void;
}) {
  const cats: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "inventory", label: "Inventory" },
    { value: "order", label: "Orders" },
    { value: "payment", label: "Payments" },
    { value: "customer", label: "Customers" },
    { value: "scanner", label: "Scanner" },
    { value: "ai", label: "AI" },
    { value: "report", label: "Reports" },
    { value: "system", label: "System" },
  ];
  const readOpts: { value: ReadFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];
  const priorities: { value: PriorityFilter; label: string }[] = [
    { value: "all", label: "Any priority" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];
  return (
    <div className="space-y-3">
      <Chips value={readState} onChange={onRead} options={readOpts} />
      <Chips value={category} onChange={onCategory} options={cats} />
      <Chips value={priority} onChange={onPriority} options={priorities} />
    </div>
  );
}

function Chips<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-soft"
              : "bg-card text-primary/80 border-border hover:bg-secondary/40",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ NotificationCard */
export function NotificationCard({
  item, onOpen, onRead, onUnread, onDismiss, compact = false,
}: {
  item: Notification;
  onOpen?: (n: Notification) => void;
  onRead?: (id: string) => void;
  onUnread?: (id: string) => void;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}) {
  const Icon = catIcon[item.category];
  const priority = priorityStyle[item.priority];
  const content = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-start">
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
          item.priority === "critical"
            ? "bg-[color-mix(in_oklab,#DC2626_14%,transparent)] text-[#B91C1C]"
            : item.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!item.isRead && <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
          <p className={cn("font-semibold truncate", item.isRead && "text-muted-foreground")}>{item.title}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", priority.badge)}>
            {PRIORITY_LABEL[item.priority]}
          </span>
        </div>
        <p className={cn("text-sm mt-0.5", item.isRead ? "text-muted-foreground" : "text-foreground/85")}>
          {item.description}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-subtle-foreground">
          <span className="font-semibold uppercase tracking-wider">{CATEGORY_LABEL[item.category]}</span>
          <span>•</span>
          <span>{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition",
        item.isRead ? "bg-card border-border" : "bg-secondary/30 border-primary/20",
        item.priority === "critical" && !item.isRead && priority.ring,
      )}
    >
      <button type="button" className="w-full text-left" onClick={() => onOpen?.(item)}>
        {content}
      </button>
      {!compact && (
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            {item.action && (
              <Link
                to={item.action.href}
                onClick={() => onRead?.(item.id)}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/40 transition"
              >
                {item.action.label}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1">
            {item.isRead ? (
              <Button size="sm" variant="ghost" onClick={() => onUnread?.(item.id)}>
                Mark unread
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => onRead?.(item.id)}>
                <Check className="h-4 w-4 mr-1" /> Mark read
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onDismiss?.(item.id)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------ Empty / Loading / Error */
export function EmptyNotificationState({ action }: { action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
        <BellOff className="h-6 w-6 text-primary/60" />
      </div>
      <h3 className="font-display text-lg font-bold text-primary">No notifications yet</h3>
      <p className="text-sm text-subtle-foreground mt-1">
        FreBob will notify you when something important happens.
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NotificationSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
              <div className="h-2 w-1/4 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#DC2626]/30 bg-[color-mix(in_oklab,#DC2626_6%,transparent)] p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-[#B91C1C]" />
      <h3 className="font-semibold mt-2">Unable to load notifications</h3>
      <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
      <Button className="mt-4" onClick={onRetry} size="sm" variant="outline">Retry</Button>
    </div>
  );
}

/* ------------------------------------------------------ Settings */
export function NotificationSettings({
  settings, onChange,
}: { settings: NotifSettings; onChange: (patch: Partial<NotifSettings>) => void }) {
  const cats: NotifCategory[] = ["inventory", "order", "payment", "customer", "scanner", "ai", "report", "system"];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3 text-xs text-subtle-foreground">
        <Settings2 className="h-4 w-4" />
        In-app notifications only. Email, SMS and WhatsApp are coming later.
      </div>
      {cats.map((c) => {
        const Icon = catIcon[c];
        const on = settings[c];
        return (
          <label
            key={c}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-semibold">{CATEGORY_LABEL[c]}</span>
                <span className="block text-xs text-subtle-foreground">Alerts for {CATEGORY_LABEL[c].toLowerCase()} events.</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => onChange({ [c]: e.target.checked } as Partial<NotifSettings>)}
              className="h-5 w-9 appearance-none rounded-full bg-muted relative cursor-pointer transition-colors checked:bg-primary before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              aria-label={`Toggle ${CATEGORY_LABEL[c]} notifications`}
            />
          </label>
        );
      })}
    </div>
  );
}
