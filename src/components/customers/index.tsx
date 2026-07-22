import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone, Mail, MapPin, MessageCircle, Clock, ArrowUpRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dash";
import type {
  Customer, CustomerMetrics, CustomerStatus, TimelineItem,
} from "@/lib/customers-store";
import {
  formatMoney, relativeTime, statusLabel, initialsOf, languageLabel,
} from "@/lib/customers-store";

/* --------- Avatar --------- */
export function CustomerAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = initialsOf(name);
  // Deterministic tint based on name
  const hues = [
    "bg-[color-mix(in_oklab,var(--primary)_18%,white)] text-primary",
    "bg-[color-mix(in_oklab,var(--accent)_18%,white)] text-accent",
    "bg-secondary text-primary",
  ];
  const idx = (name.charCodeAt(0) + name.length) % hues.length;
  return (
    <div
      className={cn("rounded-full font-bold flex items-center justify-center shrink-0", hues[idx])}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}

/* --------- Status badge --------- */
export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const tone = status === "has_balance" ? "warning"
    : status === "repeat" ? "success"
    : status === "new" ? "info"
    : status === "inactive" ? "neutral"
    : "neutral";
  return <StatusBadge tone={tone as never}>{statusLabel(status)}</StatusBadge>;
}

/* --------- Summary card --------- */
export function CustomerSummaryCard({
  label, value, hint, tone,
}: { label: string; value: string | number; hint?: string; tone?: "success" | "accent" | "warning" }) {
  return (
    <div className="bg-card p-4 rounded-[20px] border border-secondary">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className={cn(
        "mt-2 font-display text-[18px] sm:text-[22px] font-extrabold tracking-tight leading-none truncate",
        tone === "success" ? "text-[var(--success)]"
          : tone === "accent" ? "text-accent"
          : tone === "warning" ? "text-[var(--warning,#d97706)]"
          : "text-foreground",
      )}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/* --------- Card (mobile) --------- */
export function CustomerCard({
  customer, metrics, status,
}: { customer: Customer; metrics: CustomerMetrics; status: CustomerStatus }) {
  return (
    <Link
      to="/customers/$id"
      params={{ id: customer.id }}
      className="block bg-card border border-secondary rounded-[20px] p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <CustomerAvatar name={customer.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate">{customer.name}</p>
            <CustomerStatusBadge status={status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {customer.phone ?? "No phone"}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders</p>
          <p className="font-display text-sm font-extrabold mt-0.5">{metrics.totalOrders}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</p>
          <p className="font-display text-sm font-extrabold mt-0.5 text-[var(--success)]">{formatMoney(metrics.totalSpent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
          <p className={cn(
            "font-display text-sm font-extrabold mt-0.5",
            metrics.hasBalance ? "text-[var(--warning,#d97706)]" : "text-muted-foreground",
          )}>{metrics.hasBalance ? formatMoney(metrics.outstanding) : "—"}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> Last activity {relativeTime(metrics.lastActivityAt)}
      </p>
    </Link>
  );
}

/* --------- Desktop table --------- */
export function CustomerTable({
  rows,
}: { rows: { customer: Customer; metrics: CustomerMetrics; status: CustomerStatus }[] }) {
  return (
    <div className="hidden md:block overflow-hidden rounded-[20px] border border-secondary bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-primary/50 border-b border-secondary">
            <th className="p-4">Customer</th>
            <th className="p-4">Contact</th>
            <th className="p-4">Orders</th>
            <th className="p-4">Total spent</th>
            <th className="p-4">Outstanding</th>
            <th className="p-4">Last activity</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ customer, metrics, status }) => (
            <tr key={customer.id} className="border-b border-secondary last:border-b-0 hover:bg-secondary/40 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={customer.name} size={36} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{customer.name}</p>
                    {customer.city && <p className="text-[11px] text-muted-foreground truncate">{customer.city}{customer.state ? `, ${customer.state}` : ""}</p>}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <p className="text-xs">{customer.phone ?? "—"}</p>
                {customer.email && <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{customer.email}</p>}
              </td>
              <td className="p-4 font-display font-bold">{metrics.totalOrders}</td>
              <td className="p-4 text-[var(--success)] font-semibold">{formatMoney(metrics.totalSpent)}</td>
              <td className={cn("p-4 font-semibold", metrics.hasBalance ? "text-[var(--warning,#d97706)]" : "text-muted-foreground")}>
                {metrics.hasBalance ? formatMoney(metrics.outstanding) : "—"}
              </td>
              <td className="p-4 text-xs text-muted-foreground">{relativeTime(metrics.lastActivityAt)}</td>
              <td className="p-4"><CustomerStatusBadge status={status} /></td>
              <td className="p-4 text-right">
                <Link to="/customers/$id" params={{ id: customer.id }} className="text-xs font-semibold text-primary hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------- Contact details --------- */
export function CustomerContactDetails({ c }: { c: Customer }) {
  const rows: { icon: typeof Phone; label: string; value: string; href?: string }[] = [];
  if (c.phone) rows.push({ icon: Phone, label: "Phone", value: c.phone, href: `tel:${c.phone}` });
  if (c.whatsapp) rows.push({ icon: MessageCircle, label: "WhatsApp", value: c.whatsapp });
  if (c.email) rows.push({ icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` });
  if (c.address || c.city || c.state) {
    rows.push({ icon: MapPin, label: "Address", value: [c.address, c.city, c.state].filter(Boolean).join(", ") });
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary bg-card p-4 text-center text-xs text-muted-foreground inline-flex items-center gap-2 justify-center w-full">
        <AlertCircle className="h-4 w-4" /> No contact details on file yet.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-secondary bg-card divide-y divide-secondary">
      {rows.map((r, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
            <r.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.label}</p>
            {r.href ? (
              <a href={r.href} className="text-sm font-medium truncate hover:text-primary">{r.value}</a>
            ) : (
              <p className="text-sm font-medium truncate">{r.value}</p>
            )}
          </div>
        </div>
      ))}
      {c.preferredLanguage && (
        <div className="p-4 text-xs text-muted-foreground">
          Prefers <span className="font-medium text-foreground">{languageLabel(c.preferredLanguage)}</span>
        </div>
      )}
    </div>
  );
}

/* --------- Metrics grid --------- */
export function CustomerMetricsGrid({ metrics }: { metrics: CustomerMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <CustomerSummaryCard label="Total orders" value={metrics.totalOrders} />
      <CustomerSummaryCard label="Total spent" value={formatMoney(metrics.totalSpent)} tone="success" />
      <CustomerSummaryCard label="Paid" value={formatMoney(metrics.amountPaid)} />
      <CustomerSummaryCard label="Outstanding" value={metrics.hasBalance ? formatMoney(metrics.outstanding) : "—"} tone={metrics.hasBalance ? "warning" : undefined} />
      <CustomerSummaryCard label="Last order" value={relativeTime(metrics.lastOrderAt)} />
      <CustomerSummaryCard label="Last activity" value={relativeTime(metrics.lastActivityAt)} />
    </div>
  );
}

/* --------- Timeline --------- */
export function CustomerActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {items.map((e, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            {i < items.length - 1 && <div className="w-px flex-1 bg-secondary mt-1" />}
          </div>
          <div className="min-w-0 pb-3 flex-1">
            <p className="text-sm font-medium leading-snug">{e.title}</p>
            {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-muted-foreground">
                {new Date(e.time).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              {e.linkTo && (
                <Link to={e.linkTo} className="text-[10px] font-semibold text-primary hover:underline">
                  {e.linkLabel ?? "View"}
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* --------- Outstanding card --------- */
export function OutstandingCustomerCard({
  customer, metrics,
}: { customer: Customer; metrics: CustomerMetrics }) {
  return (
    <Link
      to="/customers/$id"
      params={{ id: customer.id }}
      className="block bg-card border border-secondary rounded-[20px] p-4 hover:border-[var(--warning,#d97706)]/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <CustomerAvatar name={customer.name} />
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{customer.phone ?? "No phone"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owes</p>
          <p className="font-display font-extrabold text-[var(--warning,#d97706)]">{formatMoney(metrics.outstanding)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <span>Unpaid orders: <span className="font-semibold text-foreground">{metrics.unpaidOrderCount}</span></span>
        <span>Oldest: <span className="font-semibold text-foreground">{relativeTime(metrics.oldestUnpaidAt)}</span></span>
        <span>Last payment: <span className="font-semibold text-foreground">{relativeTime(metrics.lastPaymentAt)}</span></span>
        <span>Last activity: <span className="font-semibold text-foreground">{relativeTime(metrics.lastActivityAt)}</span></span>
      </div>
    </Link>
  );
}

/* --------- Section wrapper --------- */
export function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/60">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
