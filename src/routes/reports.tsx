import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/nav/AppShell";
import { SurfaceHeader, PageCanvas } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { DateRangeBar } from "@/components/reports/DateRangeBar";
import { TabsBar } from "@/components/reports/primitives";
import {
  OverviewTab, SalesTab, PaymentsTab, OrdersTab, InventoryTab, CustomersTab, AIInsightsTab,
} from "@/components/reports/tabs";
import {
  resolvePreset, resolveCompare, type PresetKey, type CompareKey,
} from "@/lib/reporting/period";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";

const TAB_VALUES = ["overview", "sales", "payments", "orders", "inventory", "customers", "ai"] as const;
type TabKey = typeof TAB_VALUES[number];

const searchSchema = z.object({
  tab: fallback(z.string(), "overview").default("overview"),
  preset: fallback(z.string(), "this_week").default("this_week"),
  compare: fallback(z.string(), "previous").default("previous"),
});

export const Route = createFileRoute("/reports")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Reports — FreBob" },
      { name: "description", content: "Understand your sales, payments, orders, customers and stock — grounded in approved business records." },
      { property: "og:title", content: "Reports — FreBob" },
      { property: "og:description", content: "Calm, mobile-first business reports for Nigerian SMEs." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { tab, preset, compare } = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const [refreshKey, setRefreshKey] = useState(0);

  const safeTab: TabKey = (TAB_VALUES as readonly string[]).includes(tab) ? (tab as TabKey) : "overview";
  const safePreset: PresetKey = (["today","yesterday","this_week","last_week","this_month","last_month","last_30","custom"] as const)
    .includes(preset as PresetKey) ? (preset as PresetKey) : "this_week";
  const safeCompare: CompareKey = (["previous","previous_week","previous_month","none"] as const)
    .includes(compare as CompareKey) ? (compare as CompareKey) : "previous";

  const range = useMemo(() => resolvePreset(safePreset), [safePreset, refreshKey]);
  const compareRange = useMemo(() => resolveCompare(range, safeCompare), [range, safeCompare]);
  const [updatedAt, setUpdatedAt] = useState<string>(() => new Date().toISOString());

  type Search = { tab: string; preset: string; compare: string };
  const setTab = (v: TabKey) => navigate({ search: (p: Search) => ({ ...p, tab: v }) });
  const setPreset = (p: PresetKey) => navigate({ search: (s: Search) => ({ ...s, preset: p }) });
  const setCompare = (c: CompareKey) => navigate({ search: (s: Search) => ({ ...s, compare: c }) });
  const refresh = () => { setRefreshKey((k) => k + 1); setUpdatedAt(new Date().toISOString()); };

  const tabs: { value: TabKey; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "sales", label: "Sales" },
    { value: "payments", label: "Payments" },
    { value: "orders", label: "Orders" },
    { value: "inventory", label: "Inventory" },
    { value: "customers", label: "Customers" },
    { value: "ai", label: "AI Insights" },
  ];

  return (
    <AppShell>
      <DemoHint hintKey="reports-v1" title="Numbers, explained">Charts come from your operational records. Change the period tabs to see how sales and stock shift over time.</DemoHint>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Reports"
          title="Business performance"
          subtitle="Understand your sales, payments, orders, customers and stock"
          action={
            <Button variant="outline" size="sm" onClick={() => toast("Export coming in Batch 8B")}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          }
        />

        <DateRangeBar
          preset={safePreset}
          compare={safeCompare}
          range={range}
          onPresetChange={setPreset}
          onCompareChange={setCompare}
          onRefresh={refresh}
          updatedAt={updatedAt}
        />

        <TabsBar value={safeTab} onChange={setTab} options={tabs} />

        {safeTab === "overview" && <OverviewTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "sales" && <SalesTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "payments" && <PaymentsTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "orders" && <OrdersTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "inventory" && <InventoryTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "customers" && <CustomersTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
        {safeTab === "ai" && <AIInsightsTab range={range} compareRange={compareRange} refreshKey={refreshKey} />}
      </PageCanvas>
    </AppShell>
  );
}
