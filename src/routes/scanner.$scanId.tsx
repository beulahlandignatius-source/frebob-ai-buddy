import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, RotateCcw, Trash2, Check, X, FileText, Image as ImageIcon, ShieldCheck, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, LoadingSkeleton, ErrorState, SuccessBanner } from "@/components/dash";
import {
  ExtractionProgress, ScanStatusBadge, EditableField, LineItemReviewTable,
  FinancialValidationAlert, ScanApprovalSummary, DuplicateDocumentWarning,
  DOCUMENT_TYPES, humaniseType, RawTextDrawer,
} from "@/components/scanner";
import {
  getScan, saveScan, approveScan, rejectScan, saveDraft, validateExtraction,
  findDuplicateCandidates, pushEvent, emptyExtraction,
  type DocumentScan, type ScanExtraction, type DocumentType, type LineItem,
} from "@/lib/scanner-store";
import { extractDocument } from "@/lib/scanner-extraction.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/scanner/$scanId")({
  head: () => ({
    meta: [
      { title: "Review Scan — FreBob" },
      { name: "description", content: "Review AI-extracted information and approve or reject the record." },
      { property: "og:title", content: "Review Scan — FreBob" },
      { property: "og:description", content: "Every field is editable. Nothing enters Business Memory without your approval." },
    ],
  }),
  component: ReviewScan,
});

type Phase = "loading" | "processing" | "review" | "approved" | "failed" | "not_found";
type MobileTab = "doc" | "fields";

function ReviewScan() {
  const { scanId } = Route.useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState<DocumentScan | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [step, setStep] = useState(0);
  const [reviewed, setReviewed] = useState<ScanExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("Information is incorrect");
  const [mobileTab, setMobileTab] = useState<MobileTab>("fields");
  const [successRef, setSuccessRef] = useState<string | null>(null);

  useEffect(() => {
    const s = getScan(scanId);
    if (!s) { setPhase("not_found"); return; }
    setScan(s);
    if (s.status === "approved") {
      setReviewed(s.reviewed ?? s.extraction ?? null);
      setPhase("approved");
      return;
    }
    if (s.reviewed || s.extraction) {
      setReviewed(s.reviewed ?? s.extraction ?? null);
      setPhase("review");
      return;
    }
    if (s.status === "extraction_failed") { setPhase("failed"); setError(s.processingError ?? null); return; }
    void runExtraction(s);
  }, [scanId]);

  async function runExtraction(s: DocumentScan) {
    setPhase("processing");
    setStep(0);
    saveScan({ ...s, status: "processing" });
    const timer = setInterval(() => setStep((v) => Math.min(v + 1, 3)), 900);
    try {
      const firstPage = s.pages[0];
      if (!firstPage) throw new Error("No document pages to extract.");
      const result = await extractDocument({ data: { imageDataUrl: firstPage.dataUrl, documentType: s.documentType } });
      clearInterval(timer);
      const next: DocumentScan = {
        ...s,
        status: "ready_for_review",
        extraction: result.extraction,
        reviewed: result.extraction,
        processingMode: result.mode,
        processingError: null,
      };
      const withEvent = pushEvent(next, {
        eventType: "processed",
        title: result.mode === "ai" ? "AI extraction complete" : "Mock extraction used",
        description: result.note,
        createdBy: "FreBob",
      });
      setScan(withEvent);
      setReviewed(result.extraction);
      setPhase("review");
      if (result.note) toast.message(result.note);
    } catch (err) {
      clearInterval(timer);
      const message = err instanceof Error ? err.message : "Extraction failed.";
      const next: DocumentScan = { ...s, status: "extraction_failed", processingError: message };
      const withEvent = pushEvent(next, {
        eventType: "extraction_failed",
        title: "Extraction failed",
        description: message,
        createdBy: "FreBob",
      });
      setScan(withEvent);
      setError(message);
      setPhase("failed");
    }
  }

  const warnings = useMemo(() => reviewed ? validateExtraction(reviewed) : [], [reviewed]);
  const duplicates = useMemo(() => scan ? findDuplicateCandidates(scan) : [], [scan]);

  function updateField<K extends keyof ScanExtraction>(k: K, v: ScanExtraction[K]) {
    setReviewed((r) => r ? { ...r, [k]: v } : r);
  }
  function updateLine(id: string, patch: Partial<LineItem>) {
    setReviewed((r) => r ? {
      ...r,
      lineItems: r.lineItems.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
          if (next.quantity != null && next.unitPrice != null) next.lineTotal = next.quantity * next.unitPrice;
        }
        return next;
      }),
    } : r);
  }
  function addLine() {
    setReviewed((r) => r ? { ...r, lineItems: [...r.lineItems, { id: `li_${Math.random().toString(36).slice(2, 6)}`, productName: null, variant: null, quantity: null, unitPrice: null, lineTotal: null, reviewed: false }] } : r);
  }
  function removeLine(id: string) {
    setReviewed((r) => r ? { ...r, lineItems: r.lineItems.filter((li) => li.id !== id) } : r);
  }

  function onSaveDraft() {
    if (!scan || !reviewed) return;
    const next = saveDraft(scan, reviewed);
    setScan(next);
    toast.success("Draft saved.");
  }
  function onApprove() {
    if (!scan || !reviewed) return;
    try {
      const record = approveScan(scan, reviewed);
      setSuccessRef(record.reference);
      setPhase("approved");
      const refreshed = getScan(scan.id);
      if (refreshed) setScan(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    }
  }
  function onReject() {
    if (!scan) return;
    const next = rejectScan(scan, rejectReason);
    setScan(next);
    setRejecting(false);
    toast.success("Scan rejected. Original document preserved.");
    navigate({ to: "/scanner" });
  }
  function onReprocess() {
    if (!scan) return;
    void runExtraction(scan);
  }

  if (phase === "loading") {
    return <AppShell><PageCanvas><LoadingSkeleton rows={4} /></PageCanvas></AppShell>;
  }
  if (phase === "not_found") {
    return (
      <AppShell><PageCanvas>
        <SurfaceHeader eyebrow="Scanner" title="Scan not found" />
        <ErrorState message="This scan may have been deleted." onRetry={() => navigate({ to: "/scanner" })} />
      </PageCanvas></AppShell>
    );
  }

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Scanner review"
          title={scan?.title ?? "Document"}
          subtitle={`${humaniseType(scan?.documentType ?? "other")} · Scanned ${new Date(scan?.createdAt ?? "").toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
          action={
            <div className="flex items-center gap-2">
              {scan && <ScanStatusBadge status={scan.status} />}
              <Link to="/scanner"><Button size="sm" variant="outline"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
            </div>
          }
        />

        {successRef && (
          <div className="mb-4">
            <SuccessBanner
              title="Document approved and saved to Business Memory."
              description={`Reference ${successRef}. Original document preserved as evidence.`}
              onDismiss={() => setSuccessRef(null)}
            />
          </div>
        )}

        {phase === "processing" && (
          <ExtractionProgress activeStep={step} thumbnail={scan?.pages[0]?.dataUrl} />
        )}

        {phase === "failed" && scan && (
          <div className="space-y-4">
            <ErrorState
              message={error ?? "FreBob could not read this document clearly."}
              onRetry={onReprocess}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={onReprocess}><RotateCcw className="h-4 w-4 mr-1" /> Try again</Button>
              <Button variant="outline" onClick={() => {
                setReviewed(emptyExtraction(scan.documentType));
                setPhase("review");
              }}>Enter information manually</Button>
              <Button variant="outline" onClick={() => navigate({ to: "/scanner/new", search: { source: "upload" } as never })}>
                Upload clearer image
              </Button>
              <Button variant="ghost" onClick={() => { const s = getScan(scan.id); if (s) { saveScan({ ...s, status: "draft" }); toast.success("Saved without extraction."); navigate({ to: "/scanner" }); } }}>
                Save document without extraction
              </Button>
            </div>
          </div>
        )}

        {(phase === "review" || phase === "approved") && scan && reviewed && (
          <div>
            {/* Mobile tab switcher */}
            <div className="lg:hidden mb-4 inline-flex rounded-full bg-secondary p-1 text-xs font-bold">
              {(["doc", "fields"] as MobileTab[]).map((t) => (
                <button key={t} onClick={() => setMobileTab(t)} className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 transition",
                  mobileTab === t ? "bg-card text-primary shadow-card" : "text-muted-foreground",
                )}>
                  {t === "doc" ? <><ImageIcon className="h-3.5 w-3.5" /> Document</> : <><FileText className="h-3.5 w-3.5" /> Fields</>}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              {/* Document panel */}
              <div className={cn("lg:col-span-2 space-y-3", mobileTab === "fields" && "hidden lg:block")}>
                <SectionLabel>Original document</SectionLabel>
                {scan.pages.map((p) => (
                  <img key={p.id} src={p.dataUrl} alt={`Page ${p.pageNumber}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="w-full rounded-[20px] border border-secondary bg-card shadow-card object-contain" />
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Preserved as evidence · {scan.pages.length} page{scan.pages.length > 1 ? "s" : ""} · {scan.processingMode === "mock" ? "Mock extraction" : scan.processingMode === "ai" ? "AI extraction" : ""}
                </p>
              </div>

              {/* Fields panel */}
              <div className={cn("lg:col-span-3 space-y-5", mobileTab === "doc" && "hidden lg:block")}>
                {duplicates.length > 0 && <DuplicateDocumentWarning matches={duplicates} />}
                <FinancialValidationAlert warnings={warnings} />

                <div className="rounded-[20px] border border-secondary bg-card p-5 space-y-4">
                  <SectionLabel>Document details</SectionLabel>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Document type</span>
                    <select
                      value={reviewed.documentType}
                      disabled={phase === "approved"}
                      onChange={(e) => updateField("documentType", e.target.value as DocumentType)}
                      className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
                    >
                      {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <EditableField label="Document / Receipt #" value={reviewed.documentNumber} onChange={(v) => updateField("documentNumber", v || null)} />
                    <EditableField label="Date" value={reviewed.documentDate} onChange={(v) => updateField("documentDate", v || null)} placeholder="e.g. 2026-03-12" />
                    <EditableField label="Customer" value={reviewed.customerName} onChange={(v) => updateField("customerName", v || null)} />
                    <EditableField label="Supplier / Merchant" value={reviewed.supplierName ?? reviewed.merchantName} onChange={(v) => updateField("supplierName", v || null)} />
                    <EditableField label="Phone" value={reviewed.phone} onChange={(v) => updateField("phone", v || null)} />
                    <EditableField label="Payment method" value={reviewed.paymentMethod} onChange={(v) => updateField("paymentMethod", v || null)} />
                    <EditableField label="Transaction reference" value={reviewed.transactionReference} onChange={(v) => updateField("transactionReference", v || null)} />
                    <EditableField label="Bank" value={reviewed.bankName} onChange={(v) => updateField("bankName", v || null)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <SectionLabel>Line items</SectionLabel>
                  <LineItemReviewTable items={reviewed.lineItems} currency={reviewed.currency}
                    onChange={updateLine} onAdd={addLine} onRemove={removeLine} />
                </div>

                <div className="rounded-[20px] border border-secondary bg-card p-5 space-y-4">
                  <SectionLabel>Financial summary</SectionLabel>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <EditableField type="number" label="Subtotal (₦)" value={reviewed.subtotal} onChange={(v) => updateField("subtotal", v === "" ? null : Number(v))} />
                    <EditableField type="number" label="Discount (₦)" value={reviewed.discount} onChange={(v) => updateField("discount", v === "" ? null : Number(v))} />
                    <EditableField type="number" label="Tax (₦)" value={reviewed.tax} onChange={(v) => updateField("tax", v === "" ? null : Number(v))} />
                    <EditableField type="number" label="Total (₦)" value={reviewed.totalAmount} onChange={(v) => updateField("totalAmount", v === "" ? null : Number(v))} needsReview={reviewed.perFieldNeedsReview?.includes("totalAmount")} />
                    <EditableField type="number" label="Amount paid (₦)" value={reviewed.amountPaid} onChange={(v) => updateField("amountPaid", v === "" ? null : Number(v))} />
                    <EditableField type="number" label="Outstanding balance (₦)" value={reviewed.outstandingBalance} onChange={(v) => updateField("outstandingBalance", v === "" ? null : Number(v))} hint="Formula: total − paid, never negative." />
                  </div>
                </div>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Notes</span>
                  <textarea
                    value={reviewed.notes ?? ""}
                    onChange={(e) => updateField("notes", e.target.value || null)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
                    placeholder="Add any correction notes for future reference…"
                  />
                </label>

                <RawTextDrawer text={reviewed.rawText} />

                {/* Sticky actions */}
                {phase === "review" && !confirming && !rejecting && (
                  <div className="sticky bottom-4 z-10 flex flex-wrap gap-2 rounded-2xl border border-secondary bg-card/95 backdrop-blur-md p-3 shadow-elegant">
                    <Button className="flex-1" onClick={() => setConfirming(true)}>
                      <Check className="h-4 w-4 mr-1" /> Approve record
                    </Button>
                    <Button variant="outline" onClick={onSaveDraft}>Save draft</Button>
                    <Button variant="outline" onClick={onReprocess}><RotateCcw className="h-4 w-4 mr-1" /> Reprocess</Button>
                    <Button variant="ghost" onClick={() => setRejecting(true)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {/* Confirming */}
                {confirming && phase === "review" && (
                  <div className="rounded-[20px] border border-primary/30 bg-[var(--surface-tinted)] p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <p className="font-display font-bold">Confirm before approval</p>
                    </div>
                    <ScanApprovalSummary reviewed={reviewed} warnings={warnings} />
                    <p className="text-xs text-muted-foreground">
                      Approval will save the reviewed data to Business Memory. Other modules (Orders, Payments, Inventory, Customers) will
                      <strong> not</strong> be updated automatically.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={onApprove}><Check className="h-4 w-4 mr-1" /> Confirm approval</Button>
                      <Button variant="outline" onClick={() => setConfirming(false)}>Back to review</Button>
                    </div>
                  </div>
                )}

                {/* Rejecting */}
                {rejecting && (
                  <div className="rounded-[20px] border border-destructive/30 bg-destructive/5 p-5 space-y-3">
                    <p className="font-display font-bold text-destructive">Reject this extraction</p>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Reason</span>
                      <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm">
                        <option>Information is incorrect</option>
                        <option>Wrong document type</option>
                        <option>Image is unreadable</option>
                        <option>Duplicate document</option>
                        <option>Not a business document</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <p className="text-xs text-muted-foreground">Rejecting does not delete the original file.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setRejecting(false)}>Cancel</Button>
                      <Button onClick={onReject} className="bg-destructive text-destructive-foreground hover:opacity-90">Confirm reject</Button>
                    </div>
                  </div>
                )}

                {/* Approved next steps */}
                {phase === "approved" && (
                  <div className="rounded-[20px] border border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] p-5 space-y-3">
                    <p className="font-display font-bold">What next?</p>
                    <p className="text-sm text-muted-foreground">
                      Suggested actions based on this document. Nothing runs automatically.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(reviewed.documentType === "customer_order" || reviewed.documentType === "sales_receipt") && (
                        <Link to="/orders"><Button variant="outline" className="w-full">Create an order from this scan <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
                      )}
                      {(reviewed.documentType === "transfer_confirmation" || reviewed.documentType === "pos_receipt") && (
                        <Link to="/orders"><Button variant="outline" className="w-full">Record this as a payment <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
                      )}
                      {(reviewed.documentType === "stock_list" || reviewed.documentType === "supplier_invoice") && (
                        <Link to="/inventory"><Button variant="outline" className="w-full">Review inventory changes <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
                      )}
                      <Link to="/business-memory"><Button variant="outline" className="w-full">Open in Business Memory <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="rounded-[20px] border border-secondary bg-card p-5">
                  <SectionLabel>Activity</SectionLabel>
                  <ol className="space-y-3">
                    {scan.events.slice().reverse().map((e) => (
                      <li key={e.id} className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{e.title}</p>
                          {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                          <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(e.createdAt).toLocaleString("en-NG")} · {e.createdBy}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Delete for prototype tidiness */}
                <div>
                  <button
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    onClick={() => { if (scan && confirm("Delete this scan?")) { import("@/lib/scanner-store").then(({ deleteScan }) => { deleteScan(scan.id); navigate({ to: "/scanner" }); }); } }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete scan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}
