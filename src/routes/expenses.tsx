// Business Expenses — not linked to customer sales. Lives under Reports > Expenses.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Upload, X, Receipt } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, EmptyState } from "@/components/dash";
import {
  addExpense, deleteExpense, listExpenses, fmtNaira,
  EXPENSE_CATEGORIES, categoryLabel, summariseExpenses,
  type ExpenseCategory,
} from "@/lib/expenses-store";
import { fileToDataUrl } from "@/lib/order-extras-store";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — FreBob" },
      { name: "description", content: "Track business expenses separately from customer sales — rent, transport, salaries, supplies and more." },
      { property: "og:title", content: "Expenses — FreBob" },
      { property: "og:description", content: "Log rent, transport, salaries and stock purchases with receipts." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const [tick, setTick] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const rows = useMemo(() => listExpenses(), [tick]);
  const summary = useMemo(() => summariseExpenses(rows), [rows]);

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <SurfaceHeader
          eyebrow="Reports · Expenses"
          title="Business expenses"
          subtitle="Rent, transport, stock purchases and other business costs — kept separate from customer sales."
          action={
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" /> {showForm ? "Close form" : "Add expense"}
            </Button>
          }
        />

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Total expenses" value={fmtNaira(summary.total)} />
          <Stat label="Records" value={String(summary.count)} />
          <Stat label="Top category" value={summary.byCategory[0]?.label ?? "—"} sub={summary.byCategory[0] ? fmtNaira(summary.byCategory[0].amount) : undefined} />
          <Stat label="Categories used" value={String(summary.byCategory.length)} />
        </section>

        {showForm && <ExpenseForm onSaved={() => { setTick((t) => t + 1); setShowForm(false); }} onCancel={() => setShowForm(false)} />}

        <SectionLabel>Recent expenses</SectionLabel>
        {rows.length === 0 ? (
          <EmptyState
            title="No expenses recorded yet"
            description="Log your first business expense to start tracking profit and category spend."
            action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Add expense</Button>}
          />
        ) : (
          <div className="rounded-[20px] border border-secondary bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Vendor / Description</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-secondary/70">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{categoryLabel(e.category)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.vendor || "—"}</p>
                      {e.description && <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">{e.description}</p>}
                      {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"><Receipt className="h-3 w-3" /> Receipt</a>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{methodLabel(e.method)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent">{fmtNaira(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1" onClick={() => { deleteExpense(e.id); setTick((t) => t + 1); toast.success("Expense deleted"); }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-secondary bg-secondary/20">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-display font-extrabold">{fmtNaira(summary.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function methodLabel(m: string) {
  return m === "cash" ? "Cash" : m === "bank_transfer" ? "Bank transfer" : m === "pos" ? "POS" : "Other";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-3.5 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className="mt-1 font-display text-lg sm:text-xl font-extrabold tracking-tight truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function ExpenseForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("inventory_purchase");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "pos" | "other">("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState<{ name: string; dataUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const schema = z.object({
      amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be greater than zero"),
      category: z.string(),
      vendor: z.string().max(120).optional(),
      description: z.string().max(400).optional(),
      date: z.string().min(1),
    });
    const parsed = schema.safeParse({ amount: Number(amount), category, vendor: vendor.trim(), description: description.trim(), date });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    addExpense({
      amount: parsed.data.amount,
      category,
      vendor: parsed.data.vendor ?? "",
      description: parsed.data.description ?? "",
      method,
      reference: reference.trim(),
      date: new Date(parsed.data.date).toISOString(),
      receiptUrl: receipt?.dataUrl,
      receiptName: receipt?.name,
    });
    toast.success("Expense added");
    onSaved();
  };

  const handleReceipt = async (f: File | null) => {
    if (!f) { setReceipt(null); return; }
    if (f.size > 4 * 1024 * 1024) { toast.error("File too large (max 4MB)"); return; }
    try { setReceipt({ name: f.name, dataUrl: await fileToDataUrl(f) }); } catch { toast.error("Could not read file"); }
  };

  return (
    <form onSubmit={submit} className="mb-6 rounded-[20px] border border-secondary bg-card p-5 space-y-4">
      <SectionLabel>New expense</SectionLabel>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5">Amount <span className="text-destructive">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} placeholder="0"
              className="w-full h-12 pl-8 pr-3 rounded-xl border border-secondary bg-background text-base font-semibold focus:outline-none focus:border-primary/40" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Date <span className="text-destructive">*</span></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Category <span className="text-destructive">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className={`text-left px-3 py-2 rounded-xl border text-xs transition ${
                category === c.value ? "border-primary/40 bg-secondary/60 text-primary font-semibold" : "border-secondary bg-card hover:border-primary/30"
              }`}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5">Vendor / Payee</label>
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. NEPA, landlord, market supplier"
            className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Reference</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt no., transfer code"
            className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Method</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["cash", "bank_transfer", "pos", "other"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`px-3 py-2 rounded-xl border text-sm transition ${
                method === m ? "border-primary/40 bg-secondary/60 text-primary font-semibold" : "border-secondary bg-card hover:border-primary/30"
              }`}>{methodLabel(m)}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional details"
          className="w-full px-3 py-2 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40 resize-none" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Receipt</label>
        {receipt ? (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-secondary bg-secondary/30">
            {receipt.dataUrl.startsWith("data:image") ? (
              <img src={receipt.dataUrl} alt={receipt.name} className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-card flex items-center justify-center text-[10px] font-semibold text-muted-foreground">FILE</div>
            )}
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{receipt.name}</p><p className="text-[11px] text-muted-foreground">Attached</p></div>
            <button type="button" onClick={() => setReceipt(null)} className="p-2 hover:bg-card rounded-lg" aria-label="Remove receipt"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 justify-center p-4 rounded-xl border border-dashed border-secondary bg-background hover:border-primary/40 cursor-pointer">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload receipt or invoice</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleReceipt(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" /> Save expense</Button>
      </div>
    </form>
  );
}
