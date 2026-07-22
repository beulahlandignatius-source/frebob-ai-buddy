import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Check, X, RefreshCcw, ArrowLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader, SectionLabel, ErrorState } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import {
  AIProcessingStepper, ConfidenceBadge, MissingFieldAlert,
  OriginalConversationPanel, FieldLabel, PAYMENT_STATUSES, ORDER_STATUSES, EVENT_TYPES, humanise, StatusPill,
} from "@/components/record";
import {
  approveConversation, computeBalance, getConversation, rejectConversation, requiredMissingFields,
  saveConversation, type ConversationRecord, type Extraction, type ExtractionItem,
} from "@/lib/records-store";
import { extractConversation } from "@/lib/extraction.functions";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";

export const Route = createFileRoute("/conversations/$id")({
  head: () => ({
    meta: [
      { title: "Review Extraction — FreBob" },
      { name: "description", content: "Review, edit and approve the AI-extracted business record." },
      { property: "og:title", content: "Review Extraction — FreBob" },
      { property: "og:description", content: "Human review before anything joins Business Memory." },
    ],
  }),
  component: ConversationReview,
});

type Phase = "processing" | "review" | "approved" | "error";

function ConversationReview() {
  const { id } = useParams({ from: "/conversations/$id" });
  const navigate = useNavigate();
  const extract = useServerFn(extractConversation);

  const [conv, setConv] = useState<ConversationRecord | undefined>(() => getConversation(id));
  const [phase, setPhase] = useState<Phase>(conv?.status === "approved" ? "approved" : "processing");
  const [step, setStep] = useState(0);
  const [extraction, setExtraction] = useState<Extraction | null>(conv?.edited ?? conv?.draft ?? null);
  const [mode, setMode] = useState<"ai" | "mock" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [approved, setApproved] = useState<{ reference: string; id: string } | null>(
    conv?.approvedRecordId ? { reference: "", id: conv.approvedRecordId } : null,
  );

  // Auto-advance stepper visual
  useEffect(() => {
    if (phase !== "processing") return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 4)), 550);
    return () => clearInterval(t);
  }, [phase]);

  // Kick off extraction if we have no draft yet
  useEffect(() => {
    if (!conv) return;
    if (conv.status === "approved") { setPhase("approved"); return; }
    if (conv.draft && runId === 0) { setPhase("review"); return; }
    let cancelled = false;
    setPhase("processing");
    setStep(0);
    (async () => {
      try {
        const res = await extract({ data: { text: conv.text, language: conv.language } });
        if (cancelled) return;
        const withBalance = computeBalance(res.extraction);
        setExtraction(withBalance);
        setMode(res.mode);
        setNote(res.note ?? null);
        const next = { ...conv, draft: withBalance, edited: withBalance, processingMode: res.mode };
        saveConversation(next);
        setConv(next);
        setStep(4);
        setTimeout(() => setPhase("review"), 400);
      } catch (e) {
        if (cancelled) return;
        setErrMsg(e instanceof Error ? e.message : "AI processing failed.");
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const retry = () => {
    if (!conv) return;
    setErrMsg(null);
    const cleared = { ...conv, draft: undefined, edited: undefined };
    saveConversation(cleared);
    setConv(cleared);
    setRunId((n) => n + 1);
  };

  if (!conv) {
    return (
      <AppShell>
        <PageCanvas>
          <SurfaceHeader eyebrow="Conversation" title="Not found" subtitle="This conversation was not saved on this device." />
          <Button onClick={() => navigate({ to: "/add-record" })}><ArrowLeft className="h-4 w-4" /> Back to Add Record</Button>
        </PageCanvas>
      </AppShell>
    );
  }

  if (phase === "processing") {
    return (
      <AppShell>
        <PageCanvas>
          <SurfaceHeader eyebrow="AI processing" title="Reading your conversation" subtitle="This usually takes a few seconds." />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1fr]">
            <AIProcessingStepper activeStep={step} />
            <OriginalConversationPanel text={conv.text} />
          </div>
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/add-record" })}>Cancel</Button>
          </div>
        </PageCanvas>
      </AppShell>
    );
  }

  if (phase === "error" || !extraction) {
    return (
      <AppShell>
        <PageCanvas>
          <SurfaceHeader eyebrow="AI processing" title="Something went wrong" />
          <ErrorState message={errMsg ?? "FreBob could not process this conversation. Try again or enter the details manually."} onRetry={retry} />
        </PageCanvas>
      </AppShell>
    );
  }

  if (phase === "approved" && approved) {
    return <ApprovedState conv={conv} extraction={extraction} approved={approved} />;
  }

  return (
    <ReviewForm
      conv={conv}
      extraction={extraction}
      mode={mode}
      note={note}
      onChange={(next) => {
        const withBalance = computeBalance(next);
        setExtraction(withBalance);
        saveConversation({ ...conv, edited: withBalance });
      }}
      onApprove={() => {
        const rec = approveConversation(conv, extraction);
        setApproved({ reference: rec.reference, id: rec.id });
        setPhase("approved");
        toast.success("Approved and added to Business Memory.");
      }}
      onReject={() => {
        rejectConversation(conv);
        toast("This draft was rejected and was not added to Business Memory.");
        navigate({ to: "/business-memory" });
      }}
      onReprocess={retry}
    />
  );
}

/* ---------- Review form ---------- */

function ReviewForm({
  conv, extraction, mode, note, onChange, onApprove, onReject, onReprocess,
}: {
  conv: ConversationRecord;
  extraction: Extraction;
  mode: "ai" | "mock" | null;
  note: string | null;
  onChange: (e: Extraction) => void;
  onApprove: () => void;
  onReject: () => void;
  onReprocess: () => void;
}) {
  const missing = useMemo(() => requiredMissingFields(extraction), [extraction]);
  const canApprove = missing.length === 0;

  const setField = <K extends keyof Extraction>(k: K, v: Extraction[K]) => onChange({ ...extraction, [k]: v });
  const setCustomer = (patch: Partial<Extraction["customer"]>) => onChange({ ...extraction, customer: { ...extraction.customer, ...patch } });
  const setItem = (idx: number, patch: Partial<ExtractionItem>) => {
    const items = extraction.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...extraction, items });
  };
  const addItem = () => onChange({ ...extraction, items: [...extraction.items, { product_name: null, variant: null, quantity: null, unit_price: null }] });
  const removeItem = (idx: number) => onChange({ ...extraction, items: extraction.items.filter((_, i) => i !== idx) });

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Extraction Review"
          title="Review before saving"
          subtitle="FreBob's draft is not saved to Business Memory until you approve it."
          action={<Button variant="ghost" size="sm" onClick={onReprocess}><RefreshCcw className="h-4 w-4" /> Process again</Button>}
        />

        {mode === "mock" && (
          <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-sm text-foreground/80">
            <strong className="text-accent">Demo mode:</strong> AI gateway unavailable — showing a deterministic draft. {note}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ConfidenceBadge label={extraction.confidence} />
          {extraction.needs_confirmation && <StatusPill tone="warn">Needs confirmation</StatusPill>}
          <StatusPill tone="info">{humanise(conv.sourceType)} source</StatusPill>
          <StatusPill tone="muted">{humanise(extraction.language)}</StatusPill>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Left: original */}
          <div className="space-y-4">
            <OriginalConversationPanel text={conv.text} />
            {missing.length > 0 && <MissingFieldAlert fields={missing} />}
            {extraction.missing_fields.length > 0 && (
              <div className="rounded-2xl border border-secondary bg-card p-4">
                <SectionLabel>AI flagged as missing</SectionLabel>
                <ul className="text-sm text-foreground/80 list-disc list-inside space-y-0.5">
                  {extraction.missing_fields.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right: editable */}
          <div className="space-y-4">
            {/* Event */}
            <Panel title="Business event">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Event type</FieldLabel>
                  <Select value={extraction.event_type} onChange={(v) => setField("event_type", v as Extraction["event_type"])} options={EVENT_TYPES.map((v) => ({ value: v, label: humanise(v) }))} />
                </div>
                <div>
                  <FieldLabel>Language</FieldLabel>
                  <Select value={extraction.language} onChange={(v) => setField("language", v as Extraction["language"])}
                    options={["english","nigerian_pidgin","yoruba","hausa","igbo","mixed","auto"].map((v) => ({ value: v, label: humanise(v) }))} />
                </div>
              </div>
            </Panel>

            {/* Customer */}
            <Panel title="Customer">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Customer name</FieldLabel>
                  <TextInput value={extraction.customer.name ?? ""} onChange={(v) => setCustomer({ name: v || null })} placeholder="e.g. Ada" />
                </div>
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <TextInput value={extraction.customer.phone ?? ""} onChange={(v) => setCustomer({ phone: v || null })} placeholder="Optional" />
                </div>
              </div>
            </Panel>

            {/* Items */}
            <Panel title="Items" right={<button type="button" onClick={addItem} className="text-xs font-bold text-primary inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add item</button>}>
              <div className="space-y-3">
                {extraction.items.map((it, i) => (
                  <div key={i} className="rounded-xl border border-secondary p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_130px_auto] gap-2">
                      <div>
                        <FieldLabel>Product</FieldLabel>
                        <TextInput value={it.product_name ?? ""} onChange={(v) => setItem(i, { product_name: v || null })} placeholder="e.g. Samsung A15" />
                      </div>
                      <div>
                        <FieldLabel>Variant</FieldLabel>
                        <TextInput value={it.variant ?? ""} onChange={(v) => setItem(i, { variant: v || null })} placeholder="e.g. 128GB" />
                      </div>
                      <div>
                        <FieldLabel>Qty</FieldLabel>
                        <NumberInput value={it.quantity} onChange={(v) => setItem(i, { quantity: v })} />
                      </div>
                      <div>
                        <FieldLabel>Unit ₦</FieldLabel>
                        <NumberInput value={it.unit_price} onChange={(v) => setItem(i, { unit_price: v })} />
                      </div>
                      <div className="flex items-end justify-end">
                        {extraction.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="h-11 w-11 rounded-xl hover:bg-secondary text-muted-foreground" aria-label="Remove item">
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                    {it.quantity && it.unit_price && (
                      <p className="mt-2 text-xs text-muted-foreground">Line total {fmt((it.quantity ?? 0) * (it.unit_price ?? 0))}</p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Payment */}
            <Panel title="Payment">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Total ₦</FieldLabel>
                  <NumberInput value={extraction.total_amount} onChange={(v) => setField("total_amount", v)} />
                </div>
                <div>
                  <FieldLabel>Paid ₦</FieldLabel>
                  <NumberInput value={extraction.amount_paid} onChange={(v) => setField("amount_paid", v)} />
                </div>
                <div>
                  <FieldLabel>Balance ₦</FieldLabel>
                  <NumberInput value={extraction.balance} onChange={(v) => setField("balance", v)} />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={extraction.payment_status} onChange={(v) => setField("payment_status", v as Extraction["payment_status"])} options={PAYMENT_STATUSES.map((v) => ({ value: v, label: humanise(v) }))} />
                </div>
              </div>
            </Panel>

            {/* Order */}
            <Panel title="Order">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={extraction.order_status} onChange={(v) => setField("order_status", v as Extraction["order_status"])} options={ORDER_STATUSES.map((v) => ({ value: v, label: humanise(v) }))} />
                </div>
                <div>
                  <FieldLabel>Delivery / pickup</FieldLabel>
                  <TextInput value={extraction.delivery_or_pickup ?? ""} onChange={(v) => setField("delivery_or_pickup", v || null)} placeholder="e.g. Pickup tomorrow" />
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel>Internal note</FieldLabel>
                <textarea
                  value={extraction.internal_note ?? ""}
                  onChange={(e) => setField("internal_note", e.target.value || null)}
                  rows={2}
                  className="w-full rounded-xl border border-secondary bg-background p-2.5 text-sm focus:outline-none focus:border-primary/40"
                  placeholder="Optional context for your own records"
                />
              </div>
            </Panel>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { saveConversation({ ...conv, edited: extraction }); toast("Draft saved on this device."); }}>Save draft</Button>
              <Button variant="outline" size="sm" onClick={onReject}><X className="h-4 w-4" /> Reject</Button>
              <Button size="sm" onClick={onApprove} disabled={!canApprove} title={canApprove ? "" : "Fix required fields first"}>
                <Check className="h-4 w-4" /> Approve record
              </Button>
            </div>
          </div>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

/* ---------- Small primitives ---------- */

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-secondary rounded-[20px] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/50">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 rounded-xl border border-secondary bg-background px-3 text-sm focus:outline-none focus:border-primary/40"
    />
  );
}

function NumberInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value === null ? "" : value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
      className="w-full h-11 rounded-xl border border-secondary bg-background px-3 text-sm focus:outline-none focus:border-primary/40"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 rounded-xl border border-secondary bg-background px-3 text-sm focus:outline-none focus:border-primary/40"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ---------- Approved state ---------- */

function ApprovedState({ conv, extraction, approved }: { conv: ConversationRecord; extraction: Extraction; approved: { reference: string; id: string } }) {
  const item = extraction.items[0];
  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader eyebrow="Approved" title="Record added to Business Memory" subtitle="This record is now trusted — you can find it in Business Memory." />

        <div className="relative overflow-hidden rounded-[24px] p-6 glass-card mb-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[color-mix(in_oklab,var(--success)_35%,transparent)] blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--success)] text-white flex items-center justify-center shrink-0"><Check className="h-5 w-5" /></div>
            <div>
              <p className="font-display font-bold">Reference {approved.reference || approved.id}</p>
              <p className="text-sm text-muted-foreground">
                {humanise(extraction.event_type)} · {item?.product_name ?? "—"} {item?.variant ? `(${item.variant})` : ""} · Qty {item?.quantity ?? "—"} · {extraction.total_amount ? fmt(extraction.total_amount) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/business-memory"><Button size="sm">View Business Memory</Button></Link>
          <Link to="/add-record"><Button size="sm" variant="secondary"><Sparkles className="h-4 w-4" /> Add another</Button></Link>
          <Link to="/dashboard"><Button size="sm" variant="ghost">Return to Dashboard</Button></Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <OriginalConversationPanel text={conv.text} />
          <section className="bg-card border border-secondary rounded-[20px] p-4">
            <SectionLabel>Approved details</SectionLabel>
            <dl className="text-sm space-y-1.5">
              <Row k="Event" v={humanise(extraction.event_type)} />
              <Row k="Payment" v={humanise(extraction.payment_status)} />
              <Row k="Order" v={humanise(extraction.order_status)} />
              <Row k="Total" v={extraction.total_amount ? fmt(extraction.total_amount) : "—"} />
              <Row k="Paid" v={extraction.amount_paid !== null ? fmt(extraction.amount_paid) : "—"} />
              <Row k="Balance" v={extraction.balance !== null ? fmt(extraction.balance) : "—"} />
            </dl>
          </section>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
