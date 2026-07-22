import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, Plus, Search, Filter } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageCanvas, SurfaceHeader, SectionLabel, PeriodTabs, StatusBadge,
  LoadingSkeleton, ErrorState, EmptyState, SuccessBanner,
} from "@/components/dash";
import { inventory, fmt, type Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

type Filter = "all" | "in" | "low" | "out";

function Inventory() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [success, setSuccess] = useState<string | null>("Stock updated for Oraimo Power Bank (+20 units).");

  const rows = useMemo(() => {
    return inventory.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.sku.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  const totalValue = inventory.reduce((s, p) => s + p.stock * p.cost, 0);
  const lowCount = inventory.filter((p) => p.status !== "in").length;

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Inventory"
          title="Your stock"
          subtitle={`${inventory.length} products · ${lowCount} needing attention`}
          action={
            <Button size="sm" onClick={() => toast("Add product coming soon")}>
              <Plus className="h-4 w-4 mr-1" /> Add product
            </Button>
          }
        />

        {success && <div className="mb-4"><SuccessBanner title={success} onDismiss={() => setSuccess(null)} /></div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total items" value={inventory.length.toString()} />
          <StatCard label="Stock value" value={fmt(totalValue)} />
          <StatCard label="Low stock" value={String(inventory.filter((p) => p.status === "low").length)} tone="accent" />
          <StatCard label="Out of stock" value={String(inventory.filter((p) => p.status === "out").length)} tone="danger" />
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products or SKU"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-secondary bg-card text-sm focus:outline-none focus:border-primary/40"
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products match"
            description="Try clearing your search or filter."
            action={<Button size="sm" variant="outline" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</Button>}
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
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 font-medium">{fmt(p.price)}</td>
                    <td className="px-4 py-3">{p.stock} {p.unit}</td>
                    <td className="px-4 py-3"><ProductStatus p={p} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toast("Editing coming soon")}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-secondary/70">
              {rows.map((p) => (
                <div key={p.id} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {p.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(p.price)} · {p.stock} {p.unit}</p>
                  </div>
                  <ProductStatus p={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </PageCanvas>
    </AppShell>
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
