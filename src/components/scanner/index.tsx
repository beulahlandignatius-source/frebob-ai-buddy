import type { ReactNode } from "react";
import { Camera, Image as ImageIcon, FileText, Sparkles, Check, Clock, AlertTriangle, ScanLine, Upload, Trash2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentType, ScanExtraction, ScanStatus, ReviewStatus, DocumentScan, LineItem } from "@/lib/scanner-store";
import { fmt } from "@/lib/mock-data";

export const DOCUMENT_TYPES: { value: DocumentType; label: string; hint: string }[] = [
  { value: "sales_receipt", label: "Sales Receipt", hint: "You sold to a customer." },
  { value: "supplier_invoice", label: "Supplier Invoice", hint: "A supplier billed you." },
  { value: "expense_receipt", label: "Expense Receipt", hint: "A business expense." },
  { value: "transfer_confirmation", label: "Transfer Confirmation", hint: "Bank / mobile transfer screenshot." },
  { value: "pos_receipt", label: "POS Receipt", hint: "Point-of-sale slip." },
  { value: "customer_order", label: "Customer Order", hint: "Someone placed an order." },
  { value: "stock_list", label: "Stock List", hint: "A list of items in inventory." },
  { value: "handwritten_note", label: "Handwritten Note", hint: "Notes written on paper." },
  { value: "other", label: "Other Business Document", hint: "Anything else business-related." },
];

export function humaniseType(t: DocumentType) {
  return DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;
}

export function humaniseStatus(s: ScanStatus) {
  return ({
    uploaded: "Uploaded",
    processing: "Processing",
    ready_for_review: "Ready for review",
    approved: "Approved",
    rejected: "Rejected",
    extraction_failed: "Extraction failed",
    needs_better_image: "Needs better image",
    draft: "Draft",
  } as const)[s];
}

/* ---------- Capture option card ---------- */
export function CaptureOptionCard({
  icon: Icon, title, description, primary = false, onClick,
}: { icon: typeof Camera; title: string; description: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[20px] border p-5 transition",
        primary
          ? "border-primary/30 bg-[var(--surface-tinted)] shadow-elegant hover:border-primary/50"
          : "border-secondary bg-card hover:border-primary/25 shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
          primary ? "brand-gradient text-primary-foreground" : "bg-secondary text-primary",
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[15px]">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

/* ---------- Scan status badge (text + tint, never colour alone) ---------- */
export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const map: Record<ScanStatus, { tone: string; Icon: typeof Check }> = {
    uploaded: { tone: "bg-secondary text-primary", Icon: Upload },
    processing: { tone: "bg-accent/15 text-accent", Icon: Clock },
    ready_for_review: { tone: "bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-[var(--info)]", Icon: Sparkles },
    approved: { tone: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]", Icon: Check },
    rejected: { tone: "bg-destructive/10 text-destructive", Icon: AlertTriangle },
    extraction_failed: { tone: "bg-destructive/10 text-destructive", Icon: AlertTriangle },
    needs_better_image: { tone: "bg-accent/15 text-accent", Icon: AlertTriangle },
    draft: { tone: "bg-muted text-muted-foreground", Icon: FileText },
  };
  const { tone, Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", tone)}>
      <Icon className="h-3 w-3" /> {humaniseStatus(status)}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { text: string; cls: string }> = {
    unreviewed: { text: "Unreviewed", cls: "bg-secondary text-muted-foreground" },
    in_progress: { text: "In progress", cls: "bg-accent/15 text-accent" },
    approved: { text: "Approved", cls: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]" },
    rejected: { text: "Rejected", cls: "bg-destructive/10 text-destructive" },
  };
  const { text, cls } = map[status];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", cls)}>{text}</span>;
}

/* ---------- Extraction progress (glassmorphic — AI surface) ---------- */
export function ExtractionProgress({ activeStep, thumbnail }: { activeStep: number; thumbnail?: string }) {
  const steps = [
    "Uploading document",
    "Reading text",
    "Identifying business information",
    "Preparing review",
  ];
  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 glass-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative flex items-start gap-4">
        {thumbnail && (
          <img src={thumbnail} alt="" className="h-24 w-20 object-cover rounded-lg border border-secondary shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display font-bold">FreBob is reading your document</p>
              <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
            </div>
          </div>
          <ol className="space-y-2">
            {steps.map((label, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border",
                    done ? "bg-[var(--success)] border-[var(--success)] text-white"
                      : active ? "bg-primary/10 border-primary text-primary animate-pulse"
                      : "bg-card border-secondary text-muted-foreground",
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : active ? <Clock className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
                  </div>
                  <span className={cn(active ? "text-foreground font-medium" : done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ---------- Document preview with rotate/replace/remove ---------- */
export function DocumentPreview({
  dataUrl, rotation, onRotate, onReplace, onRemove, alt,
}: {
  dataUrl: string; rotation: number;
  onRotate?: () => void; onReplace?: () => void; onRemove?: () => void; alt: string;
}) {
  return (
    <div className="rounded-[20px] border border-secondary bg-card overflow-hidden">
      <div className="bg-[var(--surface-tinted)] p-4 flex items-center justify-center min-h-[220px]">
        <img
          src={dataUrl}
          alt={alt}
          style={{ transform: `rotate(${rotation}deg)` }}
          className="max-h-[420px] max-w-full object-contain rounded-lg shadow-card transition-transform"
        />
      </div>
      {(onRotate || onReplace || onRemove) && (
        <div className="flex flex-wrap gap-2 p-3 border-t border-secondary bg-card">
          {onRotate && (
            <button onClick={onRotate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-secondary hover:border-primary/40">
              <RotateCw className="h-3.5 w-3.5" /> Rotate
            </button>
          )}
          {onReplace && (
            <button onClick={onReplace} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-secondary hover:border-primary/40">
              <ImageIcon className="h-3.5 w-3.5" /> Replace
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Image quality warning ---------- */
export function ImageQualityWarning({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Check image quality before extracting</p>
          <ul className="mt-1 text-sm text-foreground/85 space-y-0.5 list-disc list-inside">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Financial validation alert ---------- */
export function FinancialValidationAlert({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-2xl border border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-[var(--warning)] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Please confirm these figures</p>
          <ul className="mt-1 text-sm text-foreground/80 space-y-0.5 list-disc list-inside">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Editable extraction field ---------- */
export function EditableField({
  label, value, onChange, type = "text", placeholder, needsReview, hint,
}: {
  label: string; value: string | number | null; onChange: (v: string) => void;
  type?: "text" | "number" | "date"; placeholder?: string; needsReview?: boolean; hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
        <span>{label}</span>
        {needsReview && <span className="text-accent text-[10px] normal-case tracking-normal font-semibold">Check this field</span>}
      </span>
      <input
        type={type}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-11 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:border-primary/40",
          needsReview ? "border-accent/40 bg-accent/5" : "border-secondary",
        )}
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/* ---------- Line item review table ---------- */
export function LineItemReviewTable({
  items, currency = "₦", onChange, onAdd, onRemove,
}: {
  items: LineItem[];
  currency?: string;
  onChange: (id: string, patch: Partial<LineItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-secondary bg-card overflow-hidden">
      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_120px_120px_auto] gap-3 px-4 py-3 bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Product</span><span>Variant</span><span>Qty</span><span>Unit price</span><span>Line total</span><span></span>
      </div>
      {items.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No line items detected.
          <button onClick={onAdd} className="ml-2 text-primary font-semibold hover:underline">Add one</button>
        </div>
      )}
      {items.map((li) => {
        const calc = (li.quantity ?? 0) * (li.unitPrice ?? 0);
        const mismatch = li.lineTotal != null && li.quantity != null && li.unitPrice != null && Math.abs(li.lineTotal - calc) > 1;
        return (
          <div key={li.id} className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_120px_120px_auto] gap-3 px-4 py-3 border-t border-secondary items-center">
            <input
              value={li.productName ?? ""}
              onChange={(e) => onChange(li.id, { productName: e.target.value || null })}
              placeholder="Product"
              className="h-10 px-3 rounded-lg border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
            />
            <input
              value={li.variant ?? ""}
              onChange={(e) => onChange(li.id, { variant: e.target.value || null })}
              placeholder="e.g. 128GB"
              className="h-10 px-3 rounded-lg border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
            />
            <input
              type="number" min={0}
              value={li.quantity ?? ""}
              onChange={(e) => onChange(li.id, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
              className="h-10 px-3 rounded-lg border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
            />
            <input
              type="number" min={0}
              value={li.unitPrice ?? ""}
              onChange={(e) => onChange(li.id, { unitPrice: e.target.value === "" ? null : Number(e.target.value) })}
              className="h-10 px-3 rounded-lg border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
            />
            <div className={cn("h-10 px-3 rounded-lg border flex items-center text-sm font-semibold", mismatch ? "border-accent/40 bg-accent/10 text-accent" : "border-secondary bg-secondary/30")}>
              {li.lineTotal != null ? `${currency}${li.lineTotal.toLocaleString("en-NG")}` : (li.quantity != null && li.unitPrice != null ? `${currency}${calc.toLocaleString("en-NG")}` : "—")}
            </div>
            <button
              onClick={() => onRemove(li.id)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-secondary hover:border-destructive/40 hover:text-destructive text-muted-foreground"
              aria-label="Remove line item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      <div className="p-3 border-t border-secondary bg-secondary/20">
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          + Add line item
        </button>
      </div>
    </div>
  );
}

/* ---------- Approval summary ---------- */
export function ScanApprovalSummary({
  reviewed, warnings,
}: { reviewed: ScanExtraction; warnings: string[] }) {
  const rows: { k: string; v: ReactNode }[] = [
    { k: "Document type", v: humaniseType(reviewed.documentType) },
    { k: "Date", v: reviewed.documentDate ?? "—" },
    { k: "Customer / Supplier", v: reviewed.customerName ?? reviewed.supplierName ?? reviewed.merchantName ?? "—" },
    { k: "Total amount", v: reviewed.totalAmount != null ? fmt(reviewed.totalAmount) : "—" },
    { k: "Amount paid", v: reviewed.amountPaid != null ? fmt(reviewed.amountPaid) : "—" },
    { k: "Balance", v: reviewed.outstandingBalance != null ? fmt(reviewed.outstandingBalance) : "—" },
    { k: "Line items", v: `${reviewed.lineItems.length}` },
  ];
  return (
    <div className="rounded-[20px] border border-secondary bg-card p-5">
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/40 mb-3">Approval summary</p>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-3 border-b border-secondary/60 pb-2">
            <dt className="text-sm text-muted-foreground">{r.k}</dt>
            <dd className="text-sm font-semibold text-right truncate">{r.v}</dd>
          </div>
        ))}
      </dl>
      {warnings.length > 0 && (
        <div className="mt-4">
          <FinancialValidationAlert warnings={warnings} />
        </div>
      )}
    </div>
  );
}

/* ---------- Duplicate warning ---------- */
export function DuplicateDocumentWarning({ matches }: { matches: DocumentScan[] }) {
  if (!matches.length) return null;
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">This document may have been scanned before.</p>
          <ul className="mt-1 text-sm text-foreground/80 space-y-0.5">
            {matches.slice(0, 3).map((m) => (
              <li key={m.id} className="truncate">
                · {m.title} — {new Date(m.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Scan history card ---------- */
export function ScanHistoryCard({ scan }: { scan: DocumentScan }) {
  const first = scan.pages[0];
  const amount = scan.reviewed?.totalAmount ?? scan.extraction?.totalAmount ?? null;
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-secondary bg-card p-4 hover:border-primary/25 transition">
      {first ? (
        <img src={first.dataUrl} alt="" className="h-16 w-14 object-cover rounded-lg border border-secondary shrink-0" style={{ transform: `rotate(${first.rotation}deg)` }} />
      ) : (
        <div className="h-16 w-14 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
          <ScanLine className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-[15px] truncate">{scan.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {humaniseType(scan.documentType)} · {new Date(scan.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ScanStatusBadge status={scan.status} />
          <ReviewStatusBadge status={scan.reviewStatus} />
        </div>
      </div>
      {amount != null && <p className="text-sm font-bold shrink-0">{fmt(amount)}</p>}
    </div>
  );
}

/* ---------- Raw text drawer ---------- */
export function RawTextDrawer({ text }: { text: string }) {
  if (!text) return null;
  return (
    <details className="rounded-2xl border border-secondary bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-primary flex items-center gap-2">
        <FileText className="h-4 w-4" /> View extracted text
      </summary>
      <pre className="px-4 pb-4 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 font-mono max-h-72 overflow-y-auto">{text}</pre>
    </details>
  );
}
