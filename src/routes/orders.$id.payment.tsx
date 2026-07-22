// Record Payment / Deposit / Balance / Refund — with proof upload
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Wallet, Upload, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import { BalanceBadge, PAYMENT_METHOD_OPTIONS } from "@/components/orders";
import {
  formatMoney, getOrder, recordPayment, setOrderStatus,
  PAYMENT_KIND_OPTIONS, type PaymentMethod, type PaymentKind,
} from "@/lib/orders-store";
import { fileToDataUrl } from "@/lib/order-extras-store";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id/payment")({
  head: ({ params }) => ({
    meta: [
      { title: `Record payment · #${params.id} — FreBob` },
      { name: "description", content: "Record a payment, deposit, balance payment or refund against an order." },
      { property: "og:title", content: `Record payment — FreBob` },
      { property: "og:description", content: "Log a customer payment, deposit, balance or refund with proof." },
    ],
  }),
  component: RecordPaymentPage,
});

function RecordPaymentPage() {
  const { id } = useParams({ from: "/orders/$id/payment" });
  const navigate = useNavigate();
  const order = useMemo(() => getOrder(id), [id]);

  const [kind, setKind] = useState<PaymentKind>("payment");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [proof, setProof] = useState<{ name: string; dataUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const isRefund = kind === "refund";
  const maxAmount = isRefund ? order.paid : (kind === "balance" ? order.balance : Math.max(order.total, order.balance));
  const remainingLabel = isRefund ? `Paid so far: ${formatMoney(order.paid)}` : `Remaining balance: ${formatMoney(order.balance)}`;

  const handleProof = async (file: File | null) => {
    if (!file) { setProof(null); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("File is too large (max 4MB)"); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setProof({ name: file.name, dataUrl });
    } catch { toast.error("Could not read file"); }
  };

  const handleSave = () => {
    setError(null);
    const schema = z.object({
      amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be greater than zero").max(maxAmount || Number.MAX_SAFE_INTEGER, `Amount cannot exceed ${formatMoney(maxAmount)}`),
      method: z.enum(["cash", "bank_transfer", "pos", "other"]),
      reference: z.string().max(60, "Reference is too long").optional(),
      notes: z.string().max(400, "Notes are too long").optional(),
      date: z.string().min(1),
    });
    const parsed = schema.safeParse({
      amount: Number(amount), method,
      reference: reference.trim() || undefined, notes: notes.trim() || undefined, date,
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }

    setSaving(true);
    try {
      recordPayment({
        orderId: order.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        kind,
        reference: parsed.data.reference,
        proofUrl: proof?.dataUrl,
        proofName: proof?.name,
        date: new Date(parsed.data.date).toISOString(),
        notes: parsed.data.notes,
      });
      if (!isRefund) {
        const newBalance = order.balance - parsed.data.amount;
        if (newBalance <= 0 && order.orderStatus !== "cancelled" && order.orderStatus !== "completed") {
          setOrderStatus(order.id, "completed");
        }
      }
      toast.success(`${isRefund ? "Refund" : "Payment"} of ${formatMoney(parsed.data.amount)} recorded`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record payment");
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/orders/$id" params={{ id: order.id }} className="inline-flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to order #{order.id}
        </Link>

        <SurfaceHeader
          eyebrow={isRefund ? "Record refund" : "Record payment"}
          title={`#${order.id}`}
          subtitle={`${order.customerName} · balance ${formatMoney(order.balance)}`}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="rounded-[20px] border border-secondary bg-card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_KIND_OPTIONS.map((k) => (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    title={k.hint}
                    className={`px-3 py-2 rounded-xl border text-sm transition ${
                      kind === k.value
                        ? (k.value === "refund" ? "border-destructive/40 bg-destructive/5 text-destructive font-semibold" : "border-primary/40 bg-secondary/60 text-primary font-semibold")
                        : "border-secondary bg-card hover:border-primary/30"
                    }`}>
                    {k.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{PAYMENT_KIND_OPTIONS.find((k) => k.value === kind)?.hint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Amount <span className="text-destructive">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                  min={1} max={maxAmount} placeholder="0"
                  className="w-full h-12 pl-8 pr-3 rounded-xl border border-secondary bg-background text-base font-semibold focus:outline-none focus:border-primary/40" />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{remainingLabel}</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setAmount(String(maxAmount))}>
                  {isRefund ? "Refund full paid" : (kind === "balance" ? "Pay full balance" : "Fill max")}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Payment method <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                    className={`px-3 py-2 rounded-xl border text-sm transition ${
                      method === m.value ? "border-primary/40 bg-secondary/60 text-primary font-semibold" : "border-secondary bg-card hover:border-primary/30"
                    }`}>{m.label}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Reference</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer code, receipt no."
                  className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date & time</label>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Proof of payment</label>
              {proof ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-secondary bg-secondary/30">
                  {proof.dataUrl.startsWith("data:image") ? (
                    <img src={proof.dataUrl} alt={proof.name} className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-card flex items-center justify-center text-[10px] font-semibold text-muted-foreground">FILE</div>
                  )}
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{proof.name}</p><p className="text-[11px] text-muted-foreground">Attached</p></div>
                  <button type="button" onClick={() => setProof(null)} className="tap-target grid place-items-center hover:bg-card rounded-lg focus-ring" aria-label="Remove proof"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 justify-center p-4 rounded-xl border border-dashed border-secondary bg-background hover:border-primary/40 cursor-pointer">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload screenshot, receipt or POS slip</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleProof(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional context for this payment"
                className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40 resize-none" />
            </div>

            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/orders/$id", params: { id: order.id } })}>Cancel</Button>
              <Button type="submit" size="sm" loading={saving} disabled={saving || maxAmount <= 0}>
                <Wallet className="h-4 w-4 mr-1" /> Save {isRefund ? "refund" : "payment"}
              </Button>
            </div>
          </form>

          <aside className="rounded-[20px] border border-secondary bg-card p-5 space-y-3 h-fit">
            <SectionLabel>Order summary</SectionLabel>
            <Row label="Total" value={formatMoney(order.total)} />
            <Row label="Paid so far" value={formatMoney(order.paid)} tone="success" />
            <Row label="Balance" value={formatMoney(order.balance)} tone={order.balance > 0 ? "accent" : undefined} />
            <div className="pt-2 border-t border-secondary/60"><BalanceBadge status={order.paymentStatus} /></div>
          </aside>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "accent" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone === "success" ? "text-[var(--success)]" : tone === "accent" ? "text-accent" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
