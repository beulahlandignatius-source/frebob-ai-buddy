// Unified scan → record conversion wizard (Batch 7B).
// Search param `action` selects the workflow. Every workflow shows a
// preview, allows edits, checks duplicates, then commits via the store.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Package, Wallet, UserPlus, ShoppingCart } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, ErrorState, EmptyState } from "@/components/dash";
import { DuplicateActionWarning } from "@/components/scanner/conversion";
import { getScan, type DocumentScan, type ScanExtraction } from "@/lib/scanner-store";
import {
  recordConversionAction, recordConversionEvent, listConversionActions,
  hasCompletedAction, type ConversionActionType,
} from "@/lib/scan-conversions-store";
import { listOrders, recordPayment, formatMoney, type PaymentMethod } from "@/lib/orders-store";
import { recordInventoryEvent } from "@/lib/inventory-events-store";
import {
  createCustomer, findDuplicates, listCustomers, linkOrderToCustomer, normalizePhone,
} from "@/lib/customers-store";
import { toast } from "sonner";

const actionSchema = z.object({
  action: z.enum([
    "create_order", "record_payment", "receive_inventory",
    "adjust_inventory", "create_customer", "link_customer", "record_expense",
  ]).default("create_order"),
});

export const Route = createFileRoute("/scanner/$scanId/convert")({
  validateSearch: (s) => actionSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Convert scan — FreBob" },
      { name: "description", content: "Convert an approved scanned document into an order, payment, or inventory record." },
      { property: "og:title", content: "Convert scan — FreBob" },
      { property: "og:description", content: "Human-in-the-loop conversion from scanned document to FreBob business records." },
    ],
  }),
  component: ConvertScan,
});

function ConvertScan() {
  const { scanId } = Route.useParams();
  const { action } = Route.useSearch();
  const navigate = useNavigate();
  const scan = useMemo(() => getScan(scanId), [scanId]);
  const reviewed = scan?.reviewed ?? scan?.extraction ?? null;

  if (!scan) {
    return (
      <AppShell><PageCanvas>
        <SurfaceHeader eyebrow="Convert" title="Scan not found" />
        <ErrorState message="This scan may have been deleted." onRetry={() => navigate({ to: "/scanner" })} />
      </PageCanvas></AppShell>
    );
  }
  if (scan.status !== "approved" || !reviewed) {
    return (
      <AppShell><PageCanvas>
        <SurfaceHeader eyebrow="Convert" title="Approve the scan first" />
        <EmptyState
          title="Approve this scan first"
          description="Approved documents can be converted into orders, payments and inventory changes."
          action={{ label: "Open review", to: `/scanner/${scanId}` }}
        />
      </PageCanvas></AppShell>
    );
  }

  const title =
    action === "create_order" ? "Create order from scan" :
    action === "record_payment" ? "Record payment from scan" :
    action === "receive_inventory" ? "Receive stock from scan" :
    action === "adjust_inventory" ? "Adjust stock from scan" :
    action === "create_customer" ? "Add customer from scan" :
    action === "link_customer" ? "Link customer from scan" :
    "Log expense from scan";

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/scanner/$scanId" params={{ scanId }} className="inline-flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to scan
        </Link>
        <SurfaceHeader
          eyebrow={scan.title}
          title={title}
          subtitle="Preview, edit, and confirm — nothing saves until you press the confirm button."
        />

        {action === "create_order" && (
          <CreateOrderWizard scan={scan} reviewed={reviewed} navigate={navigate} />
        )}
        {action === "record_payment" && (
          <RecordPaymentWizard scan={scan} reviewed={reviewed} navigate={navigate} />
        )}
        {(action === "receive_inventory" || action === "adjust_inventory") && (
          <InventoryWizard
            scan={scan} reviewed={reviewed} navigate={navigate}
            kind={action === "receive_inventory" ? "received" : "adjusted"}
          />
        )}
        {(action === "create_customer" || action === "link_customer") && (
          <CustomerWizard scan={scan} reviewed={reviewed} navigate={navigate} />
        )}
        {action === "record_expense" && (
          <ExpenseWizard scan={scan} reviewed={reviewed} navigate={navigate} />
        )}
      </PageCanvas>
    </AppShell>
  );
}

// ============================================================================
// Create Order Wizard
// ============================================================================

function CreateOrderWizard({ scan, reviewed, navigate }: WizardProps) {
  // Orders are derived from approved records. The scan's approved record
  // becomes an Order with id = record.reference (SC-XXXXXX). We link it.
  const orders = useMemo(() => listOrders(), []);
  const scanOrder = useMemo(
    () => orders.find((o) => o.recordId === scan.approvedRecordId),
    [orders, scan.approvedRecordId],
  );
  const [confirmed, setConfirmed] = useState(false);
  const dupCount = listConversionActions(scan.id).filter(
    (a) => a.actionType === "create_order" && !a.undone,
  ).length;

  if (!scanOrder) {
    return (
      <EmptyState
        title="No order derived yet"
        description="This scan was approved as a memory record but not as an order. Try re-approving after setting the document type to Sales receipt or Customer order."
        action={{ label: "Back to scan", to: `/scanner/${scan.id}` }}
      />
    );
  }

  const doLink = () => {
    recordConversionAction({
      scanId: scan.id,
      actionType: "create_order",
      recordType: "order",
      targetId: scanOrder.id,
      summary: `Order ${scanOrder.id} · ${formatMoney(scanOrder.total)} · ${scanOrder.customerName}`,
      createdBy: "You",
    });
    toast.success(`Order ${scanOrder.id} linked to scan`);
    navigate({ to: "/orders/$id", params: { id: scanOrder.id } });
  };

  return (
    <div className="space-y-4">
      {dupCount > 0 && !confirmed && (
        <DuplicateActionWarning
          existingCount={dupCount}
          onProceed={() => setConfirmed(true)}
          onCancel={() => navigate({ to: "/scanner/$scanId", params: { scanId: scan.id } })}
        />
      )}

      <PreviewCard icon={<ShoppingCart className="h-4 w-4" />} title="Order preview">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Order reference" value={scanOrder.id} />
          <Field label="Customer" value={scanOrder.customerName} />
          <Field label="Phone" value={scanOrder.customerPhone ?? "—"} />
          <Field label="Items" value={`${scanOrder.itemCount}`} />
          <Field label="Total" value={formatMoney(scanOrder.total)} />
          <Field label="Paid" value={formatMoney(scanOrder.paid)} />
          <Field label="Balance" value={formatMoney(scanOrder.balance)} />
          <Field label="Status" value={scanOrder.orderStatus} />
        </div>
      </PreviewCard>

      <p className="text-xs text-muted-foreground px-1">
        This order was created when you approved the scan. Confirming links this action to the scan for traceability.
      </p>

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
        <Button className="flex-1" onClick={doLink} disabled={dupCount > 0 && !confirmed}>
          <Check className="h-4 w-4 mr-1" /> Confirm & open order
        </Button>
        <Link to="/scanner/$scanId" params={{ scanId: scan.id }}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Record Payment Wizard
// ============================================================================

function RecordPaymentWizard({ scan, reviewed, navigate }: WizardProps) {
  const orders = useMemo(() => listOrders().filter((o) => o.orderStatus !== "cancelled"), []);
  const scanOrder = useMemo(
    () => orders.find((o) => o.recordId === scan.approvedRecordId),
    [orders, scan.approvedRecordId],
  );
  const [orderId, setOrderId] = useState<string>(scanOrder?.id ?? orders[0]?.id ?? "");
  const [amount, setAmount] = useState<number>(reviewed.amountPaid ?? 0);
  const [method, setMethod] = useState<PaymentMethod>(
    reviewed.paymentMethod?.toLowerCase().includes("transfer") ? "bank_transfer" :
    reviewed.paymentMethod?.toLowerCase().includes("pos") ? "pos" :
    reviewed.paymentMethod?.toLowerCase().includes("cash") ? "cash" : "bank_transfer",
  );
  const [reference, setReference] = useState(reviewed.transactionReference ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const target = orders.find((o) => o.id === orderId);

  const dupCount = listConversionActions(scan.id).filter(
    (a) => a.actionType === "record_payment" && !a.undone,
  ).length;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Create an order first, then come back to record this payment against it."
        action={{ label: "Back to scan", to: `/scanner/${scan.id}` }}
      />
    );
  }

  const submit = () => {
    if (!target) { toast.error("Select an order"); return; }
    if (amount <= 0) { toast.error("Amount must be greater than zero"); return; }
    if (amount > target.balance + 1) {
      toast.error(`Amount exceeds outstanding balance (${formatMoney(target.balance)})`);
      return;
    }
    const pay = recordPayment({
      orderId: target.id,
      amount,
      method,
      reference: reference.trim(),
      notes: `From scan ${scan.title}`,
    });
    recordConversionAction({
      scanId: scan.id,
      actionType: "record_payment",
      recordType: "payment",
      targetId: pay.id,
      summary: `${formatMoney(pay.amount)} on Order ${target.id}`,
      createdBy: "You",
    });
    toast.success(`Payment of ${formatMoney(pay.amount)} recorded`);
    navigate({ to: "/orders/$id", params: { id: target.id } });
  };

  return (
    <div className="space-y-4">
      {dupCount > 0 && !confirmed && (
        <DuplicateActionWarning
          existingCount={dupCount}
          onProceed={() => setConfirmed(true)}
          onCancel={() => navigate({ to: "/scanner/$scanId", params: { scanId: scan.id } })}
        />
      )}
      <PreviewCard icon={<Wallet className="h-4 w-4" />} title="Payment preview">
        <div className="space-y-3">
          <Row label="Apply to order">
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm">
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.customerName} · Bal {formatMoney(o.balance)}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Amount (₦)">
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
          <Row label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="pos">POS</option>
              <option value="other">Other</option>
            </select>
          </Row>
          <Row label="Reference">
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction ref"
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
          {target && (
            <div className="rounded-xl bg-secondary/40 p-3 text-xs space-y-1">
              <p>Order total: <strong>{formatMoney(target.total)}</strong></p>
              <p>Currently paid: <strong>{formatMoney(target.paid)}</strong></p>
              <p>After this payment: <strong>{formatMoney(target.paid + amount)}</strong> · Balance <strong>{formatMoney(Math.max(target.total - target.paid - amount, 0))}</strong></p>
            </div>
          )}
        </div>
      </PreviewCard>

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
        <Button className="flex-1" onClick={submit} disabled={dupCount > 0 && !confirmed}>
          <Check className="h-4 w-4 mr-1" /> Confirm & record payment
        </Button>
        <Link to="/scanner/$scanId" params={{ scanId: scan.id }}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Inventory Wizard (receive / adjust)
// ============================================================================

function InventoryWizard({ scan, reviewed, navigate, kind }: WizardProps & { kind: "received" | "adjusted" }) {
  const [items, setItems] = useState(
    reviewed.lineItems
      .filter((li) => li.productName)
      .map((li) => ({
        productName: li.productName ?? "",
        quantity: li.quantity ?? 0,
        unitCost: li.unitPrice ?? 0,
        include: true,
      })),
  );
  const [confirmed, setConfirmed] = useState(false);
  const done = hasCompletedAction(scan.id, kind === "received" ? "receive_inventory" : "adjust_inventory");

  if (items.length === 0) {
    return (
      <EmptyState
        title="No line items on this scan"
        description="Add products to the scan review page first, then convert them into stock movements."
        action={{ label: "Back to scan", to: `/scanner/${scan.id}` }}
      />
    );
  }

  const submit = () => {
    const chosen = items.filter((i) => i.include && i.productName && i.quantity > 0);
    if (chosen.length === 0) { toast.error("Select at least one item to record"); return; }
    for (const it of chosen) {
      const evt = recordInventoryEvent({
        productName: it.productName,
        quantityDelta: kind === "received" ? Math.abs(it.quantity) : it.quantity,
        unitCost: it.unitCost,
        eventType: kind === "received" ? "received" : "adjusted",
        sourceType: "scan",
        sourceId: scan.id,
        note: `From scan ${scan.title}`,
        createdBy: "You",
      });
      recordConversionAction({
        scanId: scan.id,
        actionType: kind === "received" ? "receive_inventory" : "adjust_inventory",
        recordType: "inventory_event",
        targetId: evt.id,
        summary: `${it.productName} · ${evt.quantityDelta > 0 ? "+" : ""}${evt.quantityDelta}`,
        createdBy: "You",
      });
    }
    toast.success(`Recorded ${chosen.length} stock movement${chosen.length === 1 ? "" : "s"}`);
    navigate({ to: "/inventory" });
  };

  return (
    <div className="space-y-4">
      {done && !confirmed && (
        <DuplicateActionWarning
          existingCount={1}
          onProceed={() => setConfirmed(true)}
          onCancel={() => navigate({ to: "/scanner/$scanId", params: { scanId: scan.id } })}
        />
      )}
      <PreviewCard icon={<Package className="h-4 w-4" />} title={kind === "received" ? "Stock to receive" : "Stock to adjust"}>
        <ul className="divide-y divide-secondary/70">
          {items.map((it, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0 grid grid-cols-[auto_1fr_5rem_6rem] items-center gap-3">
              <input type="checkbox" checked={it.include}
                onChange={(e) => setItems((rows) => rows.map((r, j) => j === i ? { ...r, include: e.target.checked } : r))}
                className="h-4 w-4 rounded border-secondary" />
              <input value={it.productName}
                onChange={(e) => setItems((rows) => rows.map((r, j) => j === i ? { ...r, productName: e.target.value } : r))}
                className="h-9 px-2 rounded-lg border border-secondary bg-background text-sm" />
              <input type="number" value={it.quantity}
                onChange={(e) => setItems((rows) => rows.map((r, j) => j === i ? { ...r, quantity: Number(e.target.value) || 0 } : r))}
                className="h-9 px-2 rounded-lg border border-secondary bg-background text-sm text-right" />
              <input type="number" value={it.unitCost} placeholder="Unit cost"
                onChange={(e) => setItems((rows) => rows.map((r, j) => j === i ? { ...r, unitCost: Number(e.target.value) || 0 } : r))}
                className="h-9 px-2 rounded-lg border border-secondary bg-background text-sm text-right" />
            </li>
          ))}
        </ul>
      </PreviewCard>

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
        <Button className="flex-1" onClick={submit} disabled={done && !confirmed}>
          <Check className="h-4 w-4 mr-1" /> Confirm stock changes
        </Button>
        <Link to="/scanner/$scanId" params={{ scanId: scan.id }}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Customer Wizard (create / link)
// ============================================================================

function CustomerWizard({ scan, reviewed, navigate }: WizardProps) {
  const [name, setName] = useState(reviewed.customerName ?? "");
  const [phone, setPhone] = useState(reviewed.phone ?? "");
  const [email, setEmail] = useState("");
  const duplicates = useMemo(() => findDuplicates({ name, phone, email }), [name, phone, email]);
  const allCustomers = useMemo(() => listCustomers(), []);
  const [linkTo, setLinkTo] = useState<string>("");

  const scanOrderId = useMemo(() => {
    const rec = scan.approvedRecordId;
    // The order id equals the record.reference — but we only have record id here.
    // Look through actions or orders for a link.
    const orders = listOrders();
    return orders.find((o) => o.recordId === rec)?.id ?? "";
  }, [scan]);

  const submitCreate = () => {
    if (!name.trim()) { toast.error("Customer name is required"); return; }
    const c = createCustomer({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notesSummary: `Added from scan ${scan.title}`,
    });
    recordConversionAction({
      scanId: scan.id,
      actionType: "create_customer",
      recordType: "customer",
      targetId: c.id,
      summary: `${c.name}${c.phone ? " · " + c.phone : ""}`,
      createdBy: "You",
    });
    if (scanOrderId) linkOrderToCustomer(scanOrderId, c.id);
    toast.success(`Customer ${c.name} added`);
    navigate({ to: "/customers/$id", params: { id: c.id } });
  };

  const submitLink = () => {
    if (!linkTo) { toast.error("Pick a customer to link"); return; }
    const c = allCustomers.find((x) => x.id === linkTo);
    if (!c) return;
    if (scanOrderId) linkOrderToCustomer(scanOrderId, c.id);
    recordConversionAction({
      scanId: scan.id,
      actionType: "link_customer",
      recordType: "customer",
      targetId: c.id,
      summary: `Linked to ${c.name}`,
      createdBy: "You",
    });
    toast.success(`Linked to ${c.name}`);
    navigate({ to: "/customers/$id", params: { id: c.id } });
  };

  return (
    <div className="space-y-4">
      <PreviewCard icon={<UserPlus className="h-4 w-4" />} title="Customer preview">
        <div className="space-y-3">
          <Row label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
          <Row label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+234…"
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
            {phone && normalizePhone(phone) && (
              <p className="text-[11px] text-muted-foreground mt-1">Normalised: {normalizePhone(phone)}</p>
            )}
          </Row>
          <Row label="Email (optional)">
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
        </div>
      </PreviewCard>

      {duplicates.length > 0 && (
        <div className="rounded-[20px] border border-accent/30 bg-accent/5 p-4 space-y-2">
          <p className="text-sm font-display font-bold">Possible existing customer{duplicates.length > 1 ? "s" : ""}</p>
          <p className="text-xs text-muted-foreground">Link to an existing profile instead of creating a duplicate.</p>
          <ul className="mt-2 space-y-1.5">
            {duplicates.map((d) => (
              <li key={d.customer.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="linkTo" value={d.customer.id} checked={linkTo === d.customer.id}
                    onChange={() => setLinkTo(d.customer.id)} />
                  <span className="font-semibold">{d.customer.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.customer.phone ?? "no phone"} · matched by {d.reason.replace("_", " + ")}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
        {linkTo
          ? <Button className="flex-1" onClick={submitLink}><Check className="h-4 w-4 mr-1" /> Link to selected</Button>
          : <Button className="flex-1" onClick={submitCreate}><Check className="h-4 w-4 mr-1" /> Confirm & add customer</Button>}
        <Link to="/scanner/$scanId" params={{ scanId: scan.id }}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Expense Wizard (prototype — logs as event only)
// ============================================================================

function ExpenseWizard({ scan, reviewed, navigate }: WizardProps) {
  const [category, setCategory] = useState(reviewed.expenseCategory ?? "General");
  const [amount, setAmount] = useState(reviewed.totalAmount ?? 0);
  const [note, setNote] = useState(reviewed.notes ?? "");

  const submit = () => {
    if (amount <= 0) { toast.error("Enter an amount"); return; }
    recordConversionAction({
      scanId: scan.id,
      actionType: "record_expense",
      recordType: "expense",
      targetId: `exp_${Date.now().toString(36)}`,
      summary: `${category} · ${formatMoney(amount)}`,
      createdBy: "You",
    });
    recordConversionEvent({
      scanId: scan.id,
      eventType: "completed",
      actionType: "record_expense",
      title: `Expense logged · ${formatMoney(amount)}`,
      description: note,
      createdBy: "You",
    });
    toast.success("Expense logged");
    navigate({ to: "/scanner/$scanId", params: { scanId: scan.id } });
  };

  return (
    <div className="space-y-4">
      <PreviewCard icon={<Wallet className="h-4 w-4" />} title="Expense preview">
        <div className="space-y-3">
          <Row label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
          <Row label="Amount (₦)">
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
          <Row label="Notes">
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm" />
          </Row>
        </div>
      </PreviewCard>
      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
        <Button className="flex-1" onClick={submit}><Check className="h-4 w-4 mr-1" /> Confirm expense</Button>
        <Link to="/scanner/$scanId" params={{ scanId: scan.id }}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

type WizardProps = {
  scan: DocumentScan;
  reviewed: ScanExtraction;
  navigate: ReturnType<typeof useNavigate>;
};

function PreviewCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-secondary bg-card p-5 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <SectionLabel>{title}</SectionLabel>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{value || "—"}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// Prevent unused import warning; ConversionActionType is exported for future use.
export type __ExportedType = ConversionActionType;
