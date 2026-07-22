// Shared UI primitives for the Reports module.

import { Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, TrendingDown, Minus, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Cell, PieChart, Pie, Legend, Line, LineChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmtNaira } from "@/lib/reporting/service";
import { Button } from "@/components/fb/Button";

/* ---------------- MetricCard ---------------- */
export function MetricCard({
  label, value, isCurrency = true, previous, hasPrev, changePct, direction, explanation, linkTo, linkLabel = "See details",
}: {
  label: string;
  value: number;
  isCurrency?: boolean;
  previous?: number;
  hasPrev: boolean;
  changePct: number | null;
  direction: "up" | "down" | "flat" | "none";
  explanation?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  const displayValue = isCurrency ? fmtNaira(value) : new Intl.NumberFormat("en-NG").format(value);
  const compareLine = !hasPrev
    ? explanation ?? ""
    : previous === 0 && value === 0
    ? "No activity in either period."
    : previous === 0
    ? `${isCurrency ? fmtNaira(value) : value} recorded — no ${label.toLowerCase()} in the comparison period.`
    : changePct === null
    ? explanation ?? ""
    : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% vs ${isCurrency ? fmtNaira(previous!) : previous}`;

  const tone =
    direction === "up" ? "text-[var(--success)] bg-[color-mix(in_oklab,var(--success)_14%,transparent)]"
    : direction === "down" ? "text-destructive bg-destructive/10"
    : "text-subtle-foreground bg-muted";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <div className="rounded-2xl border border-secondary bg-card p-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
      <p className="mt-2 font-display text-[22px] sm:text-[26px] font-extrabold tracking-tight text-foreground truncate">
        {displayValue}
      </p>
      <div className="mt-2 flex items-start gap-2">
        {hasPrev && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0", tone)}>
            <Icon className="h-3 w-3" />
            {direction === "flat" ? "No change" : direction === "up" ? "Higher" : direction === "down" ? "Lower" : ""}
          </span>
        )}
        <p className="text-[11px] leading-relaxed text-subtle-foreground">{compareLine}</p>
      </div>
      {linkTo && (
        <Link to={linkTo} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ---------------- ChartCard wrapper ---------------- */
export function ChartCard({
  title, description, action, empty, children, textSummary,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  empty?: boolean;
  children: ReactNode;
  textSummary?: string;
}) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{title}</p>
          {description && <p className="text-[11px] text-subtle-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-subtle-foreground rounded-xl bg-muted/40">
          No data for this period.
        </div>
      ) : (
        <>
          {children}
          {textSummary && <p className="mt-2 text-[11px] text-subtle-foreground sr-only">{textSummary}</p>}
        </>
      )}
    </div>
  );
}

/* ---------------- Charts ---------------- */
export function TrendChart({ data, valueKey = "sales", previousKey, height = 220 }: {
  data: { label: string; [k: string]: number | string }[];
  valueKey?: string; previousKey?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b1fa6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4b1fa6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip formatter={(v: number) => fmtNaira(v)} labelStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey={valueKey} stroke="#4b1fa6" strokeWidth={2} fill="url(#gTrend)" />
        {previousKey && <Line type="monotone" dataKey={previousKey} stroke="#f7931e" strokeDasharray="4 4" dot={false} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarCompareChart({ data, keys, height = 220 }: {
  data: { label: string; [k: string]: number | string }[];
  keys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <Tooltip formatter={(v: number) => (typeof v === "number" && v >= 1000 ? fmtNaira(v) : v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[6, 6, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ["#4b1fa6", "#f7931e", "#2f9e6a", "#e5484d", "#5a2abf", "#c67b13", "#666"];
export function StatusDonut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RankBar({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
        <Tooltip formatter={(v: number) => fmtNaira(v)} />
        <Bar dataKey="value" fill="#4b1fa6" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- ReportTable ---------------- */
export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortValue?: (row: T) => number | string;
};

export function ReportTable<T>({ rows, columns, pageSize = 10, empty }: {
  rows: T[]; columns: Column<T>[]; pageSize?: number; empty?: string;
}) {
  if (rows.length === 0) {
    return <div className="rounded-2xl border border-dashed border-secondary bg-card p-8 text-center text-sm text-subtle-foreground">{empty ?? "No data for this period."}</div>;
  }
  const shown = rows.slice(0, pageSize);
  return (
    <div className="rounded-2xl border border-secondary bg-card overflow-hidden">
      {/* Desktop */}
      <table className="hidden md:table w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left text-subtle-foreground">
            {columns.map((c) => <th key={c.key} className={cn("px-4 py-3 font-medium text-[11px] uppercase tracking-wider", c.className)}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="border-t border-secondary hover:bg-muted/20">
              {columns.map((c) => <td key={c.key} className={cn("px-4 py-3", c.className)}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-secondary">
        {shown.map((r, i) => (
          <div key={i} className="p-4 space-y-1.5">
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-[11px] uppercase tracking-wider text-subtle-foreground">{c.header}</span>
                <span className="text-right">{c.render(r)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {rows.length > pageSize && (
        <div className="px-4 py-2 text-[11px] text-subtle-foreground border-t border-secondary text-center">
          Showing {pageSize} of {rows.length}. Refine the date range to see fewer rows.
        </div>
      )}
    </div>
  );
}

/* ---------------- TabsBar ---------------- */
export function TabsBar<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      <div className="inline-flex rounded-full bg-muted p-1 min-w-max">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition",
              value === o.value ? "bg-card shadow-card text-foreground" : "text-subtle-foreground hover:text-foreground",
            )}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- RefreshButton ---------------- */
export function RefreshButton({ onClick, updatedAt }: { onClick: () => void; updatedAt: string }) {
  const time = new Date(updatedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="inline-flex items-center gap-2 text-[11px] text-subtle-foreground">
      <span className="hidden sm:inline">Updated {time}</span>
      <Button size="sm" variant="ghost" onClick={onClick} className="h-8">
        <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh
      </Button>
    </div>
  );
}
