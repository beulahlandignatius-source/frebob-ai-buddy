// FreBob Orders & Payments — reusable components (Calm Ledger identity).

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ShoppingCart, ChevronRight, Wallet, CreditCard, Banknote, MoreHorizontal, CircleDot, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import {
  formatMoney, methodLabel, paymentStatusLabel, statusLabel,
  type Order, type Payment, type PaymentMethod, type TimelineEvent,
} from "@/lib/orders-store";
import type { OrderStatus, PaymentStatus } from "@/lib/records-store";

/* ---------- BalanceBadge ---------- */
export function BalanceBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const map: Record<PaymentStatus, { tone: "success" | "warning" | "danger" | "neutral"; icon: string }> = {
    paid: { tone: "success", icon: "●" },
    partially_paid: { tone: "warning", icon: "◐" },
    unpaid: { tone: "danger", icon: "○" },
    unknown: { tone: "neutral", icon: "—" },
  };
  const m = map[status];
  return (
    <StatusBadge tone={m.tone} className={cn("gap-1", className)}>
      <span aria-hidden className="text-[10px] leading-none">{m.icon}</span>
      {paymentStatusLabel(status)}
    </StatusBadge>
  );
}

/* ---------- OrderStatusBadge ---------- */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone: "success" | "warning" | "info" | "danger" | "neutral" =
    status === "completed" ? "success"
    : status === "cancelled" ? "danger"
    : status === "reserved" ? "warning"
    : status === "pending" || status === "awaiting_pickup" || status === "awaiting_delivery" ? "info"
    : "neutral";
  return <StatusBadge tone={tone}>{statusLabel(status)}</StatusBadge>;
}

/* ---------- OrderCard (mobile) ---------- */
export function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to="/orders/$id"
      params={{ id: order.id }}
      className="block rounded-2xl border border-secondary bg-card p-4 hover:border-primary/30 transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
          <ShoppingCart className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-sm">#{order.id}</p>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {order.customerName} · {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="font-semibold text-sm text-foreground">{formatMoney(order.total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wider">Paid</p>
          <p className="font-semibold text-sm text-[var(--success)]">{formatMoney(order.paid)}</p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wider">Balance</p>
          <p className={cn("font-semibold text-sm", order.balance > 0 ? "text-accent" : "text-foreground")}>
            {formatMoney(order.balance)}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <BalanceBadge status={order.paymentStatus} />
      </div>
    </Link>
  );
}

/* ---------- OrderTable (desktop) ---------- */
export function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="rounded-[20px] border border-secondary bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40">
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Order</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold text-right">Total</th>
            <th className="px-4 py-3 font-semibold text-right">Paid</th>
            <th className="px-4 py-3 font-semibold text-right">Balance</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold">Order</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-secondary/70 hover:bg-secondary/20 transition">
              <td className="px-4 py-3 font-display font-bold">#{o.id}</td>
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-[180px]">{o.customerName}</p>
                {o.customerPhone && <p className="text-[11px] text-muted-foreground">{o.customerPhone}</p>}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(o.total)}</td>
              <td className="px-4 py-3 text-right text-[var(--success)]">{formatMoney(o.paid)}</td>
              <td className="px-4 py-3 text-right">
                <span className={cn("font-semibold", o.balance > 0 ? "text-accent" : "")}>{formatMoney(o.balance)}</span>
              </td>
              <td className="px-4 py-3"><BalanceBadge status={o.paymentStatus} /></td>
              <td className="px-4 py-3"><OrderStatusBadge status={o.orderStatus} /></td>
              <td className="px-4 py-3 text-right">
                <Link to="/orders/$id" params={{ id: o.id }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View <ChevronRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- PaymentCard ---------- */
export function PaymentCard({ payment }: { payment: Payment }) {
  const Icon = payment.method === "cash" ? Banknote : payment.method === "bank_transfer" ? Wallet : payment.method === "pos" ? CreditCard : MoreHorizontal;
  const isRefund = payment.kind === "refund";
  const kindText = payment.kind === "deposit" ? "Deposit" : payment.kind === "balance" ? "Balance" : payment.kind === "refund" ? "Refund" : "Payment";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-secondary bg-card p-3">
      <div className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
        isRefund ? "bg-destructive/10 text-destructive" : "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[var(--success)]",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">
          {isRefund ? "−" : ""}{formatMoney(payment.amount)} · {kindText}
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">{methodLabel(payment.method)}</span>
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {new Date(payment.date).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {payment.reference ? ` · ref ${payment.reference}` : ""}
        </p>
        {payment.notes && <p className="text-[11px] text-muted-foreground italic truncate">"{payment.notes}"</p>}
        {payment.proofUrl && (
          <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">
            View proof{payment.proofName ? ` · ${payment.proofName}` : ""}
          </a>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">by {payment.recordedBy}</span>
    </div>
  );
}


/* ---------- PaymentHistory ---------- */
export function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center">
        <Wallet className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium mt-2">No payments recorded yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">When you record a payment it will show here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {payments.map((p) => <PaymentCard key={p.id} payment={p} />)}
    </div>
  );
}

/* ---------- OrderTimeline ---------- */
export function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  const iconFor = (kind: TimelineEvent["kind"]) =>
    kind === "created" ? CircleDot
    : kind === "payment" ? Wallet
    : kind === "cancelled" ? XCircle
    : CheckCircle2;
  return (
    <ol className="space-y-3">
      {events.map((e, i) => {
        const Icon = iconFor(e.kind);
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                e.kind === "cancelled" ? "bg-destructive/10 text-destructive"
                  : e.kind === "payment" ? "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[var(--success)]"
                  : "bg-secondary text-primary",
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-secondary mt-1" />}
            </div>
            <div className="min-w-0 pb-3">
              <p className="text-sm font-medium leading-snug">{e.title}</p>
              {e.detail && <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(e.time).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- SummaryStat ---------- */
export function OrderSummaryStat({
  label, value, tone, hint,
}: { label: string; value: string | number; tone?: "success" | "accent" | "info" | "danger"; hint?: ReactNode }) {
  return (
    <div className="bg-card p-4 rounded-[20px] border border-secondary">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className={cn(
        "mt-2 font-display text-[20px] sm:text-[22px] font-extrabold tracking-tight leading-none truncate",
        tone === "success" ? "text-[var(--success)]"
          : tone === "accent" ? "text-accent"
          : tone === "info" ? "text-[var(--info)]"
          : tone === "danger" ? "text-destructive"
          : "text-foreground",
      )}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos", label: "POS" },
  { value: "other", label: "Other" },
];
