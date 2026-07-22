import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Save, FileText, X, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader, SectionLabel } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select, Textarea } from "@/components/fb/Input";
import {
  approveConversation,
  createConversation,
  type Extraction,
  type EventType,
  type PaymentStatus,
  type OrderStatus,
} from "@/lib/records-store";

export const Route = createFileRoute("/records/manual")({
  head: () => ({
    meta: [
      { title: "Manual Record — FreBob" },
      { name: "description", content: "Manually add a sale, payment or reservation, or import a text file for Bob to extract." },
      { property: "og:title", content: "Manual Record — FreBob" },
      { property: "og:description", content: "Fast, human-entered business record — saved straight to Business Memory." },
    ],
  }),
  component: ManualRecord,
});

const EVENT_OPTS: { value: EventType; label: string }[] = [
  { value: "sale_order", label: "Sale / order" },
  { value: "payment", label: "Payment received" },
  { value: "reservation", label: "Reservation" },
  { value: "enquiry", label: "Enquiry" },
  { value: "cancellation", label: "Cancellation" },
];
const PAYMENT_OPTS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid in full" },
  { value: "unknown", label: "Unknown" },
];
const ORDER_OPTS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "reserved", label: "Reserved" },
  { value: "awaiting_pickup", label: "Awaiting pickup" },
  { value: "awaiting_delivery", label: "Awaiting delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "enquiry", label: "Enquiry only" },
];

function ManualRecord() {
  const navigate = useNavigate();

  const [eventType, setEventType] = useState<EventType>("sale_order");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Import
  const [file, setFile] = useState<{ name: string; text: string; size: number } | null>(null);

  const qtyNum = Number(quantity) || 0;
  const priceNum = Number(unitPrice) || 0;
  const paidNum = Number(amountPaid) || 0;
  const total = qtyNum * priceNum;
  const balance = Math.max(total - paidNum, 0);

  function save() {
    if (!customerName.trim() && !productName.trim() && !amountPaid) {
      toast.error("Add at least a customer, product, or amount.");
      return;
    }
    if (eventType === "sale_order" || eventType === "reservation") {
      if (!productName.trim()) return toast.error("Product name is required.");
      if (qtyNum <= 0) return toast.error("Quantity must be greater than 0.");
    }
    setBusy(true);
    try {
      const extraction: Extraction = {
        event_type: eventType,
        language: "english",
        customer: {
          name: customerName.trim() || null,
          phone: customerPhone.trim() || null,
        },
        items: productName.trim()
          ? [{
              product_name: productName.trim(),
              variant: variant.trim() || null,
              quantity: qtyNum || null,
              unit_price: priceNum || null,
            }]
          : [],
        total_amount: total || null,
        amount_paid: paidNum || null,
        balance: total ? balance : null,
        payment_status: paymentStatus,
        order_status: orderStatus,
        delivery_or_pickup: null,
        internal_note: note.trim() || null,
        missing_fields: [],
        needs_confirmation: false,
        confidence: "high",
      };

      const summary = [
        eventType === "payment" ? "Payment received" : eventType === "reservation" ? "Reservation" : "Sale",
        customerName ? `from ${customerName}` : null,
        productName ? `for ${qtyNum} × ${productName}` : null,
        total ? `— total ₦${total.toLocaleString("en-NG")}` : null,
      ].filter(Boolean).join(" ");

      const conv = createConversation({
        text: summary || "Manual record",
        language: "english",
        sourceType: "paste",
      });
      const record = approveConversation({ ...conv }, extraction, "You (manual)");
      toast.success("Saved to Business Memory");
      navigate({ to: "/conversations/$id", params: { id: record.conversationId } });
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(f: File) {
    const isText = f.type === "text/plain" || f.name.toLowerCase().endsWith(".txt") || f.name.toLowerCase().endsWith(".csv");
    if (!isText) {
      toast.error("Please upload a plain .txt or .csv file.");
      return;
    }
    if (f.size > 200_000) {
      toast.error("File too large. Please keep under 200KB.");
      return;
    }
    const text = await f.text();
    setFile({ name: f.name, size: f.size, text });
    toast.success("File loaded. Send it to Bob for extraction, or keep filling the form.");
  }

  function sendImportToBob() {
    if (!file) return;
    const conv = createConversation({
      text: file.text,
      language: "english",
      sourceType: "upload",
      fileName: file.name,
    });
    navigate({ to: "/conversations/$id", params: { id: conv.id } });
  }

  return (
    <AppShell>
      <PageCanvas>
        <button
          type="button"
          onClick={() => navigate({ to: "/add-record" })}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <SurfaceHeader
          eyebrow="Manual Record"
          title="Add a record yourself"
          subtitle="Enter a sale, payment or reservation manually — or import a text file for Bob to extract."
        />

        {/* Import */}
        <section className="mb-6 bg-card border border-secondary rounded-[20px] p-4 sm:p-5">
          <SectionLabel>Import file (optional)</SectionLabel>
          {!file ? (
            <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary py-10 text-center cursor-pointer hover:border-primary/40 transition">
              <Upload className="h-6 w-6 text-primary" />
              <p className="font-bold">Import .txt or .csv</p>
              <p className="text-xs text-muted-foreground">Plain text export, up to 200KB — Bob will extract the details for review.</p>
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImport(f); }}
              />
            </label>
          ) : (
            <div className="mt-2">
              <div className="flex items-center gap-3 rounded-2xl border border-secondary p-3">
                <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-2 rounded-full hover:bg-secondary" aria-label="Remove file">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={sendImportToBob}>Send to Bob for extraction</Button>
                <span className="text-xs text-muted-foreground self-center">or keep the form below and skip Bob.</span>
              </div>
            </div>
          )}
        </section>

        {/* Form */}
        <section className="bg-card border border-secondary rounded-[20px] p-4 sm:p-5 space-y-4">
          <SectionLabel>Record details</SectionLabel>

          <Field label="Event type">
            <Select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
              {EVENT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer name">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Chidinma" />
            </Field>
            <Field label="Phone (optional)">
              <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0803…" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product / item">
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Ankara gown" />
            </Field>
            <Field label="Variant (optional)">
              <Input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="e.g. Size L, Red" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Quantity">
              <Input type="number" inputMode="numeric" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
            <Field label="Unit price (₦)">
              <Input type="number" inputMode="decimal" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Amount paid (₦)">
              <Input type="number" inputMode="decimal" min={0} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total</p>
              <p className="mt-1 font-bold">₦{total.toLocaleString("en-NG")}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Balance</p>
              <p className="mt-1 font-bold">₦{balance.toLocaleString("en-NG")}</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Auto status</p>
              <p className="mt-1 font-bold text-sm">
                {total > 0 && paidNum >= total ? "Paid in full" : paidNum > 0 ? "Partially paid" : "Unpaid"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment status">
              <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                {PAYMENT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Order status">
              <Select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}>
                {ORDER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Anything to remember about this record…" />
          </Field>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/add-record" })}>Cancel</Button>
            <Button onClick={save} loading={busy}><Save className="h-4 w-4" /> Save to Business Memory</Button>
          </div>
        </section>
      </PageCanvas>
    </AppShell>
  );
}
