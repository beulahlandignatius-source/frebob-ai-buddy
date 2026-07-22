// Order Detail — tabbed layout: Overview · Items · Payment Records · Timeline · Notes · Attachments
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Wallet, XCircle, Phone, MessageSquare, Upload, X, Paperclip, StickyNote,
  ListChecks, LayoutGrid, History, Trash2, ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState, LoadingSkeleton, ErrorState } from "@/components/dash";
import {
  BalanceBadge, OrderStatusBadge, OrderTimeline, PaymentHistory,
} from "@/components/orders";
import { ScanSourceChip } from "@/components/scanner/conversion";
import { findSourceScanIds } from "@/lib/scan-conversions-store";
import {
  buildTimeline, formatMoney, getOrder, ORDER_STATUS_OPTIONS, setOrderStatus, statusLabel,
  setPaymentStatusOverride,
} from "@/lib/orders-store";
import type { OrderStatus, PaymentStatus } from "@/lib/records-store";
import {
  addOrderNote, deleteOrderNote, listOrderNotes,
  addOrderAttachment, deleteOrderAttachment, listOrderAttachments, fileToDataUrl,
} from "@/lib/order-extras-store";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order #${params.id} — FreBob` },
      { name: "description", content: "Order overview, items, payments, notes and attachments." },
      { property: "og:title", content: `Order #${params.id} — FreBob` },
      { property: "og:description", content: "View order details, record payments, upload proof, and add notes." },
    ],
  }),
  component: OrderDetail,
});

type TabKey = "overview" | "items" | "payments" | "timeline" | "notes" | "attachments";

const TABS: { key: TabKey; label: string; Icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", Icon: LayoutGrid },
  { key: "items", label: "Items", Icon: ListChecks },
  { key: "payments", label: "Payment Records", Icon: Wallet },
  { key: "timeline", label: "Timeline", Icon: History },
  { key: "notes", label: "Notes", Icon: StickyNote },
  { key: "attachments", label: "Attachments", Icon: Paperclip },
];

function OrderDetail() {
  const { id } = useParams({ from: "/orders/$id" });
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<TabKey>("overview");
  const [ui, setUi] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    setUi("loading");
    setErrorMsg(null);
    try { refresh(); setUi("ready"); }
    catch (e) { setErrorMsg(e instanceof Error ? e.message : "Could not load this order."); setUi("error"); }
  }, [id]);

  const order = useMemo(() => getOrder(id), [id, tick]);
  const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order]);
  const sourceScanIds = useMemo(() => findSourceScanIds("order", id), [id, tick]);
  const notes = useMemo(() => listOrderNotes(id), [id, tick]);
  const attachments = useMemo(() => listOrderAttachments(id), [id, tick]);

  if (ui === "loading") {
    return <AppShell><PageCanvas><LoadingSkeleton rows={5} /></PageCanvas></AppShell>;
  }
  if (ui === "error") {
    return (
      <AppShell><PageCanvas>
        <ErrorState message={errorMsg ?? "Could not load this order."} onRetry={refresh} />
      </PageCanvas></AppShell>
    );
  }

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
    refresh();
    toast.success(`Status updated to ${statusLabel(next)}`);
  };

  const handleCancel = () => {
    if (order.orderStatus === "cancelled") return;
    handleStatus("cancelled");
  };

  const handleMarkPayment = (status: PaymentStatus) => {
    setPaymentStatusOverride(order.id, status);
    refresh();
    toast.success(`Marked as ${status === "paid" ? "Paid" : status === "partially_paid" ? "Partially paid" : "Unpaid"}`);
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
              <Button size="sm" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.orderStatus === "cancelled"}>
                <Wallet className="h-4 w-4 mr-1" /> Record payment
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={order.orderStatus === "cancelled"}>
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <div className="mb-4 -mx-1 overflow-x-auto scrollbar-none">
          <div className="inline-flex gap-1 p-1 rounded-2xl bg-secondary/50 border border-secondary">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
                {key === "payments" && order.payments.length > 0 && <span className="ml-1 text-[10px] rounded-full bg-secondary px-1.5 py-0.5">{order.payments.length}</span>}
                {key === "notes" && notes.length > 0 && <span className="ml-1 text-[10px] rounded-full bg-secondary px-1.5 py-0.5">{notes.length}</span>}
                {key === "attachments" && attachments.length > 0 && <span className="ml-1 text-[10px] rounded-full bg-secondary px-1.5 py-0.5">{attachments.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <section className="rounded-[20px] border border-secondary bg-card p-4">
                <div className="grid grid-cols-3 gap-3">
                  <SummaryTile label="Total" value={formatMoney(order.total)} />
                  <SummaryTile label="Paid" value={formatMoney(order.paid)} tone="success" />
                  <SummaryTile label="Balance" value={formatMoney(order.balance)} tone={order.balance > 0 ? "accent" : undefined} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <BalanceBadge status={order.paymentStatus} />
                  <OrderStatusBadge status={order.orderStatus} />
                  {sourceScanIds.map((sid) => <ScanSourceChip key={sid} scanId={sid} />)}
                </div>
              </section>

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

            <div className="space-y-4">
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

              <section className="rounded-[20px] border border-secondary bg-card p-4">
                <SectionLabel>Update status</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUS_OPTIONS.filter((s) => s !== "cancelled").map((s) => (
                    <button key={s} onClick={() => handleStatus(s)} disabled={order.orderStatus === s}
                      className={`text-xs px-3 py-2 rounded-xl border transition ${
                        order.orderStatus === s ? "border-primary/30 bg-secondary/50 text-primary font-semibold" : "border-secondary bg-card hover:border-primary/30"
                      } disabled:opacity-60`}>
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "items" && (
          <section>
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
                <tfoot>
                  <tr className="border-t border-secondary bg-secondary/20">
                    <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">Order total</td>
                    <td className="px-4 py-3 text-right font-display font-extrabold">{formatMoney(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {tab === "payments" && (
          <div className="space-y-4">
            <section className="rounded-[20px] border border-secondary bg-card p-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryTile label="Total" value={formatMoney(order.total)} />
                <SummaryTile label="Paid" value={formatMoney(order.paid)} tone="success" />
                <SummaryTile label="Balance" value={formatMoney(order.balance)} tone={order.balance > 0 ? "accent" : undefined} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <BalanceBadge status={order.paymentStatus} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.orderStatus === "cancelled"}>
                  <Wallet className="h-4 w-4 mr-1" /> Record payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.orderStatus === "cancelled"}>
                  Deposit
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.balance <= 0 || order.orderStatus === "cancelled"}>
                  Balance payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/orders/$id/payment", params: { id: order.id } })} disabled={order.paid <= 0}>
                  Refund
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-secondary/60">
                <SectionLabel>Mark payment status</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  {(["unpaid", "partially_paid", "paid"] as PaymentStatus[]).map((s) => (
                    <button key={s} onClick={() => handleMarkPayment(s)}
                      className={`text-xs px-3 py-2 rounded-xl border transition ${
                        order.paymentStatus === s ? "border-primary/40 bg-secondary/60 text-primary font-semibold" : "border-secondary bg-card hover:border-primary/30"
                      }`}>
                      {s === "paid" ? "Paid" : s === "partially_paid" ? "Partially Paid" : "Unpaid"}
                    </button>
                  ))}
                </div>
                <button className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline" onClick={() => { setPaymentStatusOverride(order.id, null); refresh(); toast.success("Reverted to auto status"); }}>
                  Clear manual status
                </button>
              </div>
            </section>

            <section>
              <SectionLabel>Payment history</SectionLabel>
              <PaymentHistory payments={order.payments} />
            </section>
          </div>
        )}

        {tab === "timeline" && (
          <section className="rounded-[20px] border border-secondary bg-card p-4">
            <OrderTimeline events={timeline} />
          </section>
        )}

        {tab === "notes" && (
          <NotesTab orderId={order.id} notes={notes} onChange={refresh} />
        )}

        {tab === "attachments" && (
          <AttachmentsTab orderId={order.id} attachments={attachments} onChange={refresh} />
        )}
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

function NotesTab({ orderId, notes, onChange }: { orderId: string; notes: ReturnType<typeof listOrderNotes>; onChange: () => void }) {
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addOrderNote(orderId, text);
    setText("");
    onChange();
    toast.success("Note added");
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-[20px] border border-secondary bg-card p-4 space-y-2">
        <SectionLabel>Add note</SectionLabel>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="Delivery instructions, follow-up reminders, internal context…"
          className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm focus-ring focus:border-primary/40 resize-none" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim()}>Add note</Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center">
          <StickyNote className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium mt-2">No notes yet.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Notes stay attached to this order only.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-2xl border border-secondary bg-card p-3">
              <p className="text-sm whitespace-pre-wrap">{n.text}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {n.author}
                </p>
                <button className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1" onClick={() => { deleteOrderNote(n.id); onChange(); }}>
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentsTab({ orderId, attachments, onChange }: { orderId: string; attachments: ReturnType<typeof listOrderAttachments>; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > 4 * 1024 * 1024) { toast.error(`${f.name} is too large (max 4MB)`); continue; }
        const dataUrl = await fileToDataUrl(f);
        addOrderAttachment({ orderId, name: f.name, mime: f.type, dataUrl, size: f.size });
      }
      onChange();
      toast.success("Attachment uploaded");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <label className={`block rounded-[20px] border border-dashed border-secondary bg-card p-6 text-center cursor-pointer hover:border-primary/40 transition ${busy ? "opacity-60" : ""}`}>
        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium mt-2">Upload files</p>
        <p className="text-xs text-muted-foreground mt-0.5">Images, receipts, invoices, POS slips (max 4MB each)</p>
        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => upload(e.target.files)} />
      </label>

      {attachments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center">
          <Paperclip className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium mt-2">No attachments yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((a) => (
            <div key={a.id} className="rounded-2xl border border-secondary bg-card overflow-hidden">
              {a.mime.startsWith("image/") ? (
                <a href={a.dataUrl} target="_blank" rel="noreferrer" className="block aspect-video bg-secondary/40">
                  <img src={a.dataUrl} alt={a.name} className="w-full h-full object-cover" />
                </a>
              ) : (
                <a href={a.dataUrl} target="_blank" rel="noreferrer" className="flex aspect-video items-center justify-center bg-secondary/40 text-muted-foreground text-xs font-semibold">
                  {a.mime.split("/")[1]?.toUpperCase() ?? "FILE"}
                </a>
              )}
              <div className="p-3">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">{Math.round(a.size / 1024)} KB · {new Date(a.createdAt).toLocaleDateString("en-NG")}</p>
                <div className="mt-2 flex items-center justify-between">
                  <a href={a.dataUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                  <button className="text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1" onClick={() => { deleteOrderAttachment(a.id); onChange(); }}>
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
