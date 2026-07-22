import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend,
} from "recharts";
import { ChevronLeft, ChevronRight, CalendarDays, Download } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageHeader,
  PeriodTabs,
  ReportSummaryCard,
  ResponsiveReportTable,
} from "@/components/dash";
import {
  dailyReport, weeklyReport, monthlyReport, reportSummary, topProducts, ordersByStatus, fmt,
} from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — FreBob" },
      { name: "description", content: "Understand your sales, payments and top products across daily, weekly and monthly periods." },
      { property: "og:title", content: "Reports — FreBob" },
      { property: "og:description", content: "Simple, mobile-first reports for Nigerian SMEs." },
    ],
  }),
  component: Reports,
});

type Period = "daily" | "weekly" | "monthly";
const PIE_COLORS = ["#4b1fa6", "#f7931e", "#5a2abf", "#e5484d"];

function Reports() {
  const [period, setPeriod] = useState<Period>("daily");
  const [offset, setOffset] = useState(0);

  const rows = useMemo(() => (period === "daily" ? dailyReport : period === "weekly" ? weeklyReport : monthlyReport), [period]);
  const summary = reportSummary[period];

  const periodLabel = period === "daily" ? "This week" : period === "weekly" ? "This month" : "This year";
  const shownLabel = offset === 0 ? periodLabel : offset < 0 ? `${Math.abs(offset)} back` : `${offset} ahead`;

  const soon = () => toast("Export coming in a later batch");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Business performance"
        subtitle="Demo figures for prototype review."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={soon} disabled>
              <Download className="h-4 w-4 mr-1" /> PDF — Coming later
            </Button>
            <Button variant="outline" size="sm" onClick={soon} disabled>
              <Download className="h-4 w-4 mr-1" /> CSV — Coming later
            </Button>
          </div>
        }
      />

      {/* Period + date controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <PeriodTabs
          value={period}
          onChange={(v) => { setPeriod(v); setOffset(0); }}
          options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
        />
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm text-muted-foreground inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {shownLabel}
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {offset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>Today</Button>
        )}
      </div>

      {/* Summary metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ReportSummaryCard label="Sales value" value={summary.sales} />
        <ReportSummaryCard label="Money received" value={summary.received} />
        <ReportSummaryCard label="Outstanding" value={summary.outstanding} />
        <ReportSummaryCard label="Orders" value={summary.orders} isCurrency={false} />
        <ReportSummaryCard label="Avg. order value" value={summary.avg} />
        <ReportSummaryCard label="Best seller" value={summary.top} isCurrency={false} />
      </section>

      {/* Charts */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sales over time">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4b1fa6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#4b1fa6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="sales" stroke="#4b1fa6" strokeWidth={2} fill="url(#gSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Money received over time">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="received" fill="#f7931e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ordersByStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {ordersByStatus.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top-selling products">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
              <Tooltip />
              <Bar dataKey="sold" fill="#4b1fa6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Table */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Detailed breakdown</h2>
        <ResponsiveReportTable rows={rows} />
      </section>
    </AppShell>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-sm font-medium mb-3">{title}</p>
      {children}
    </div>
  );
}
