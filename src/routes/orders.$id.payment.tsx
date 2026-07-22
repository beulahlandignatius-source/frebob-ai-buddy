// Record Payment — Batch 5B
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import { BalanceBadge, PAYMENT_METHOD_OPTIONS } from "@/components/orders";
import {
  formatMoney, getOrder, recordPayment, setOrderStatus, type PaymentMethod,
} from "@/lib/orders-store";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id/payment")({
  head: ({ params }) => ({
    meta: [
      { title: `Record payment · #${params.id} — FreBob` },
      { name: "description", content: "Record a customer payment against an order." },
      { property: "og:title", content: `Record payment — FreBob` },
      { property: "og:description", content: "Log a customer payment and keep balances up to date." },
    ],
  }),
  component: RecordPaymentPage,
});

function RecordPaymentPage() {
  const { id } = useParams({ from: "/orders/$id/payment" });
  const navigate = useNavigate();
  const order = useMemo(() => getOrder(id), [id]);

  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
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

  const schema = z.object({
    amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be greater than zero").max(order.balance, `Amount cannot exceed the remaining balance of ${formatMoney(order.balance)}`),
    method: z.enum(["cash", "bank_transfer", "pos", "other"]),
    reference: z.string().max(60, "Reference is too long").optional(),
    notes: z.string().max(400, "Notes are too long").optional(),
    date: z.string().min(1),
  });

  const handleSave = () => {
    setError(null);
    const parsed = schema.safeParse({
      amount: Number(amount),
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      date,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    try {
      recordPayment({
        orderId: order.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference,
        date: new Date(parsed.data.date).toISOString(),
        notes: parsed.data.notes,
      });
      const newBalance = order.balance - parsed.data.amount;
      if (newBalance <= 0 && order.orderStatus !== "cancelled" && order.orderStatus !== "completed") {
        // Auto-complete once fully paid, unless owner already marked it something terminal.
        // Owner can still change back from the detail screen.
        setOrderStatus(order.id, "completed");
      }
      toast.success(`Payment of ${formatMoney(parsed.data.amount)} recorded`);
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
          eyebrow="Record payment"
          title={`#${order.id}`}
          subtitle={`${order.customerName} · balance ${formatMoney(order.balance)}`}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="rounded-[20px] border border-secondary bg-card p-5 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  max={order.balance}
                  placeholder="0"
                  className="w-full h-12 pl-8 pr-3 rounded-xl border border-secondary bg-background text-base font-semibold focus:outline-none focus:border-primary/40"
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Remaining balance: {formatMoney(order.balance)}</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setAmount(String(order.balance))}>
                  Pay full balance
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Payment method <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`px-3 py-2 rounded-xl border text-sm transition ${
                      method === m.value
                        ? "border-primary/40 bg-secondary/60 text-primary font-semibold"
                        : "border-secondary bg-card hover:border-primary/30"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Reference</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transfer code, receipt no."
                  className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date & time</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional context for this payment"
                className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40 resize-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/orders/$id", params: { id: order.id } })}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving} disabled={saving || order.balance <= 0}>
                <Wallet className="h-4 w-4 mr-1" /> Save payment
              </Button>
            </div>
          </form>

          <aside className="rounded-[20px] border border-secondary bg-card p-5 space-y-3 h-fit">
            <SectionLabel>Order summary</SectionLabel>
            <Row label="Total" value={formatMoney(order.total)} />
            <Row label="Paid so far" value={formatMoney(order.paid)} tone="success" />
            <Row label="Balance" value={formatMoney(order.balance)} tone={order.balance > 0 ? "accent" : undefined} />
            <div className="pt-2 border-t border-secondary/60">
              <BalanceBadge status={order.paymentStatus} />
            </div>
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
