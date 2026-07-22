// Date range + comparison + refresh bar for /reports.

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRange, type CompareKey, type DateRange, type PresetKey } from "@/lib/reporting/period";
import { RefreshButton } from "./primitives";

const PRESETS: { value: PresetKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_30", label: "Last 30 days" },
];

const COMPARES: { value: CompareKey; label: string }[] = [
  { value: "previous", label: "Previous period" },
  { value: "previous_week", label: "Previous week" },
  { value: "previous_month", label: "Previous month" },
  { value: "none", label: "No comparison" },
];

export function DateRangeBar({
  preset, compare, range, onPresetChange, onCompareChange, onRefresh, updatedAt,
}: {
  preset: PresetKey; compare: CompareKey; range: DateRange;
  onPresetChange: (p: PresetKey) => void;
  onCompareChange: (c: CompareKey) => void;
  onRefresh: () => void;
  updatedAt: string;
}) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-3 sm:p-4 shadow-card mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary/60">
          <CalendarDays className="h-3.5 w-3.5" /> {formatRange(range)}
        </div>
        <div className="ml-auto"><RefreshButton onClick={onRefresh} updatedAt={updatedAt} /></div>
      </div>
      <div className="mt-3 overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
        <div className="inline-flex gap-1.5 min-w-max">
          {PRESETS.map((p) => (
            <button key={p.value} type="button" onClick={() => onPresetChange(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition",
                preset === p.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-subtle-foreground border-secondary hover:border-primary/30",
              )}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-subtle-foreground">Compare</span>
        <select value={compare} onChange={(e) => onCompareChange(e.target.value as CompareKey)}
          className="text-xs bg-muted rounded-full px-3 py-1.5 border border-secondary focus:outline-none focus:ring-2 focus:ring-primary/30">
          {COMPARES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );
}
