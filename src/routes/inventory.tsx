import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Plus, Search, Filter, ImagePlus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs, StatusBadge,
  LoadingSkeleton, ErrorState, EmptyState, SuccessBanner,
} from "@/components/dash";
import { inventory as demoInventory, fmt, type Product } from "@/lib/mock-data";
import {
  listUserProducts, subscribeUserProducts, addUserProduct, removeUserProduct,
  fileToImageDataUrl, type UserProduct, type Quality,
} from "@/lib/user-products-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";
import { useDemo } from "@/lib/demo/context";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — FreBob" },
      { name: "description", content: "Track stock levels, prices and reorder points across your products." },
      { property: "og:title", content: "Inventory — FreBob" },
      { property: "og:description", content: "Simple stock management for Nigerian SMEs." },
    ],
  }),
  component: Inventory,
});

type FilterKey = "all" | "in" | "low" | "out";

function Inventory() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [success, setSuccess] = useState<string | null>("Stock updated for Oraimo Power Bank (+20 units).");
  const [showAdd, setShowAdd] = useState(false);
  const [userProducts, setUserProducts] = useState<UserProduct[]>(() => listUserProducts());

  useEffect(() => subscribeUserProducts(() => setUserProducts(listUserProducts())), []);

  const combined = useMemo(() => [...userProducts, ...demoInventory], [userProducts]);

  const rows = useMemo(() => {
    return combined.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.sku.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query, combined]);

  const totalValue = combined.reduce((s, p) => s + p.stock * p.cost, 0);
  const lowCount = combined.filter((p) => p.status !== "in").length;

  return (
    <AppShell>
      <DemoHint hintKey="inventory-v1" title="Stock at a glance">Filter by low or out-of-stock to see what needs restocking. Tap Add to try creating a new product.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Inventory"
          title="Your stock"
          subtitle={`${combined.length} products · ${lowCount} needing attention`}
          action={
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add product
            </Button>
          }
        />

        {success && <div className="mb-4"><SuccessBanner title={success} onDismiss={() => setSuccess(null)} /></div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total items" value={combined.length.toString()} />
          <StatCard label="Stock value" value={fmt(totalValue)} />
          <StatCard label="Low stock" value={String(combined.filter((p) => p.status === "low").length)} tone="accent" />
          <StatCard label="Out of stock" value={String(combined.filter((p) => p.status === "out").length)} tone="danger" />
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products or SKU"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus-ring focus:border-primary/40"
            />
          </div>
          <PeriodTabs
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "all", label: "All" },
              { value: "in", label: "In stock" },
              { value: "low", label: "Low" },
              { value: "out", label: "Out" },
            ]}
          />
          <Button variant="ghost" size="sm" onClick={() => { setState("loading"); setTimeout(() => setState("ready"), 800); }}>
            <Filter className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <SectionLabel>Products</SectionLabel>
        {state === "loading" ? (
          <LoadingSkeleton rows={5} />
        ) : state === "error" ? (
          <ErrorState onRetry={() => setState("ready")} />
        ) : combined.length === 0 ? (
          <IntelligentEmptyState
            icon={Boxes}
            title="Your inventory is empty"
            description="Add your first product to begin tracking stock, prices and reorder points."
            primary={{ label: "Add Product", icon: Plus, onClick: () => setShowAdd(true) }}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products match"
            description="Try clearing your search or filter, or add a new product."
            action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add product</Button>}
          />
        ) : (
          <div className="rounded-[24px] border border-secondary bg-card overflow-hidden">
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left text-muted-foreground text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-secondary/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb p={p} />
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.sku}
                            {"quality" in p && p.quality ? ` · ${p.quality}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 font-medium">{fmt(p.price)}</td>
                    <td className="px-4 py-3">{p.stock} {p.unit}</td>
                    <td className="px-4 py-3"><ProductStatus p={p} /></td>
                    <td className="px-4 py-3 text-right">
                      {"createdAt" in p ? (
                        <Button size="sm" variant="ghost" onClick={() => { removeUserProduct(p.id); toast(`${p.name} removed`); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => toast("Editing coming soon")}>Edit</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-secondary/70">
              {rows.map((p) => (
                <div key={p.id} className="p-4 flex items-center gap-3">
                  <ProductThumb p={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {fmt(p.price)} · {p.stock} {p.unit}
                      {"quality" in p && p.quality ? ` · ${p.quality}` : ""}
                    </p>
                  </div>
                  <ProductStatus p={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </PageCanvas>

      {showAdd && <AddProductDialog onClose={() => setShowAdd(false)} onAdded={(name) => { setShowAdd(false); setSuccess(`${name} added to inventory.`); }} />}
    </AppShell>
  );
}

function ProductThumb({ p }: { p: Product | UserProduct }) {
  const img = (p as UserProduct).image;
  if (img) {
    return <img src={img} alt="" className="h-10 w-10 rounded-xl object-cover border border-secondary shrink-0" loading="lazy" />;
  }
  return (
    <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center font-bold text-xs shrink-0">
      {p.category.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "accent" | "danger" }) {
  return (
    <div className="bg-card p-4 rounded-[20px] border border-secondary">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className={cn(
        "mt-2 font-display text-[22px] font-extrabold tracking-tight leading-none",
        tone === "accent" ? "text-accent" : tone === "danger" ? "text-destructive" : "text-foreground",
      )}>{value}</p>
    </div>
  );
}

function ProductStatus({ p }: { p: Product }) {
  if (p.status === "out") return <StatusBadge tone="danger">Out of stock</StatusBadge>;
  if (p.status === "low") return <StatusBadge tone="warning">Low · {p.stock} left</StatusBadge>;
  return <StatusBadge tone="success">In stock</StatusBadge>;
}

/* ---------- AddProductDialog ---------- */

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "budget", label: "Budget" },
  { value: "second-hand", label: "Second-hand" },
];

function AddProductDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (name: string) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("units");
  const [quality, setQuality] = useState<Quality | "">("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = name.trim() && category.trim() && Number(price) > 0 && Number(stock) >= 0 && !busy;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const dataUrl = await fileToImageDataUrl(file);
      setImage(dataUrl);
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const product = addUserProduct({
      name,
      category,
      price: Number(price),
      cost: cost ? Number(cost) : undefined,
      stock: Number(stock),
      unit,
      quality: quality || undefined,
      notes,
      image,
    });
    onAdded(product.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-card rounded-t-[28px] sm:rounded-[28px] border border-secondary shadow-elegant max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary/70">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">Inventory</p>
            <h2 className="font-display font-bold text-lg text-primary">Add product</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-primary"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image uploader */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-primary/60">Product image</label>
            <div className="mt-1.5 flex items-center gap-3">
              {image ? (
                <img src={image} alt="preview" className="h-20 w-20 rounded-2xl object-cover border border-secondary" />
              ) : (
                <div className="h-20 w-20 rounded-2xl border border-dashed border-primary/30 bg-secondary/40 flex items-center justify-center text-primary/50">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  {image ? "Replace image" : "Upload image"}
                </Button>
                {image && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setImage(undefined)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            </div>
          </div>

          <Field label="Product name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Samsung A15" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" required>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="Phones" />
            </Field>
            <Field label="Unit">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} placeholder="units" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₦)" required>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="0" />
            </Field>
            <Field label="Cost (₦)" hint="Optional">
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} placeholder="0" />
            </Field>
          </div>

          <Field label="Quantity in stock" required>
            <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} placeholder="0" />
          </Field>

          <Field label="Quality" hint="Optional">
            <div className="flex flex-wrap gap-1.5">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setQuality(quality === q.value ? "" : q.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                    quality === q.value
                      ? "brand-gradient text-primary-foreground border-transparent shadow-soft"
                      : "border-secondary bg-background text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes" hint="Optional">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputCls, "resize-none")} placeholder="Colour, model year, supplier…" />
          </Field>
        </form>

        <div className="border-t border-secondary/70 p-4 flex items-center gap-2 justify-end bg-card">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit}>{busy ? "Saving…" : "Save product"}</Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-xl border border-secondary bg-background text-sm focus-ring focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/60">
          {label}{required && <span className="text-destructive"> *</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
