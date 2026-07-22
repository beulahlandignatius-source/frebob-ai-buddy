// Order Detail — Batch 5B
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Wallet, XCircle, Phone, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import {
  BalanceBadge, OrderStatusBadge, OrderTimeline, PaymentHistory,
} from "@/components/orders";
import { ScanSourceChip } from "@/components/scanner/conversion";
import { findSourceScanIds } from "@/lib/scan-conversions-store";
import {
  buildTimeline, formatMoney, getOrder, ORDER_STATUS_OPTIONS, setOrderStatus, statusLabel,
} from "@/lib/orders-store";
import type { OrderStatus } from "@/lib/records-store";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order #${params.id} — FreBob` },
      { name: "description", content: "Order details, payment status and history." },
      { property: "og:title", content: `Order #${params.id} — FreBob` },
      { property: "og:description", content: "View order details, record payments, and update status." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = useParams({ from: "/orders/$id" });
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const order = useMemo(() => getOrder(id), [id, tick]);
  const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order]);
  const sourceScanIds = useMemo(() => findSourceScanIds("order", id), [id, tick]);


  if (!order) {
    return (
      <AppShell>
        <PageCanvas>
          <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-primary mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
          <EmptyState title="Order not found" description="This order may have been removed or hasn't been approved yet." />
        </PageCanvas>
      </AppShell>
    );
  }

  const handleStatus = (next: OrderStatus) => {
    setOrderStatus(order.id, next);
    setTick((t) => t + 1);
    toast.success(`Status updated to ${statusLabel(next)}`);
  };

  const handleCancel = () => {
    if (order.orderStatus === "cancelled") return;
    handleStatus("cancelled");
  };

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        <SurfaceHeader
          eyebrow={`Order #${order.id}`}
          title={order.customerName}
          subtitle={`${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${new Date(order.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.balance <= 0 || order.orderStatus === "cancelled"}>
                <Wallet className="h-4 w-4 mr-1" /> Record payment
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={order.orderStatus === "cancelled"}>
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Financial summary */}
            <section className="rounded-[20px] border border-secondary bg-card p-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryTile label="Total" value={formatMoney(order.total)} />
                <SummaryTile label="Paid" value={formatMoney(order.paid)} tone="success" />
                <SummaryTile label="Balance" value={formatMoney(order.balance)} tone={order.balance > 0 ? "accent" : undefined} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <BalanceBadge status={order.paymentStatus} />
                <OrderStatusBadge status={order.orderStatus} />
              </div>
            </section>

            {/* Products */}
            <section>
              <SectionLabel>Products</SectionLabel>
              <div className="rounded-[20px] border border-secondary bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold text-right">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Unit price</th>
                      <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, i) => {
                      const qty = it.quantity ?? 0;
                      const price = it.unit_price ?? 0;
                      return (
                        <tr key={i} className="border-t border-secondary/70">
                          <td className="px-4 py-3">
                            <p className="font-medium">{it.product_name ?? "—"}</p>
                            {it.variant && <p className="text-[11px] text-muted-foreground">{it.variant}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">{qty || "—"}</td>
                          <td className="px-4 py-3 text-right">{price ? formatMoney(price) : "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">{qty && price ? formatMoney(qty * price) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment History */}
            <section>
              <SectionLabel>Payment history</SectionLabel>
              <PaymentHistory payments={order.payments} />
            </section>

            {/* Conversation source */}
            {order.sourceText && (
              <section>
                <SectionLabel>Conversation source</SectionLabel>
                <div className="rounded-[20px] border border-secondary bg-secondary/30 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-primary/60 mb-1">{order.channel}</p>
                  <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{order.sourceText}</p>
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Customer */}
            <section className="rounded-[20px] border border-secondary bg-card p-4">
              <SectionLabel>Customer</SectionLabel>
              <p className="font-semibold">{order.customerName}</p>
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-primary">
                  <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
                </a>
              )}
              {order.deliveryOrPickup && (
                <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  {order.deliveryOrPickup}
                </p>
              )}
            </section>

            {/* Status update */}
            <section className="rounded-[20px] border border-secondary bg-card p-4">
              <SectionLabel>Update status</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUS_OPTIONS.filter((s) => s !== "cancelled").map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    disabled={order.orderStatus === s}
                    className={`text-xs px-3 py-2 rounded-xl border transition ${
                      order.orderStatus === s
                        ? "border-primary/30 bg-secondary/50 text-primary font-semibold"
                        : "border-secondary bg-card hover:border-primary/30"
                    } disabled:opacity-60`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-[20px] border border-secondary bg-card p-4">
              <SectionLabel>Timeline</SectionLabel>
              <OrderTimeline events={timeline} />
            </section>
          </div>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "success" | "accent" }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className={`mt-1 font-display text-lg font-extrabold tracking-tight ${
        tone === "success" ? "text-[var(--success)]" : tone === "accent" ? "text-accent" : "text-foreground"
      }`}>{value}</p>
    </div>
  );
}
