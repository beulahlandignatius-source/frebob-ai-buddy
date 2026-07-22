// Reporting date-range presets & comparison-period resolver.
// Uses Africa/Lagos (UTC+1, no DST) implicitly via local browser time —
// FreBob is Nigeria-only in the prototype so no cross-tz gymnastics.

export type PresetKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_30"
  | "custom";

export type CompareKey = "previous" | "previous_week" | "previous_month" | "none";

export type DateRange = {
  from: Date;
  to: Date; // exclusive upper bound
  preset: PresetKey;
  label: string;
};

const MS_DAY = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  // Monday as week start (Nigerian business convention).
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

const nice = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
export function formatDate(d: Date) { return nice.format(d); }
export function formatRange(r: DateRange) {
  const upper = new Date(r.to.getTime() - 1); // inclusive-looking
  if (startOfDay(r.from).getTime() === startOfDay(upper).getTime()) return nice.format(r.from);
  return `${nice.format(r.from)} – ${nice.format(upper)}`;
}

export function resolvePreset(preset: PresetKey, custom?: { from: Date; to: Date }, now = new Date()): DateRange {
  const today = startOfDay(now);
  switch (preset) {
    case "today":       return { preset, from: today, to: addDays(today, 1), label: "Today" };
    case "yesterday":   return { preset, from: addDays(today, -1), to: today, label: "Yesterday" };
    case "this_week": { const s = startOfWeek(today); return { preset, from: s, to: addDays(s, 7), label: "This week" }; }
    case "last_week": { const s = addDays(startOfWeek(today), -7); return { preset, from: s, to: addDays(s, 7), label: "Last week" }; }
    case "this_month": { const s = startOfMonth(today); return { preset, from: s, to: addMonths(s, 1), label: "This month" }; }
    case "last_month": { const s = addMonths(startOfMonth(today), -1); return { preset, from: s, to: startOfMonth(today), label: "Last month" }; }
    case "last_30":     return { preset, from: addDays(today, -29), to: addDays(today, 1), label: "Last 30 days" };
    case "custom": {
      const from = custom?.from ? startOfDay(custom.from) : addDays(today, -6);
      const to = custom?.to ? addDays(startOfDay(custom.to), 1) : addDays(today, 1);
      return { preset, from, to, label: "Custom" };
    }
  }
}

export function resolveCompare(range: DateRange, compare: CompareKey): DateRange | null {
  if (compare === "none") return null;
  if (compare === "previous_week") {
    return { preset: "custom", from: addDays(range.from, -7), to: addDays(range.to, -7), label: "Previous week" };
  }
  if (compare === "previous_month") {
    return { preset: "custom", from: addMonths(range.from, -1), to: addMonths(range.to, -1), label: "Previous month" };
  }
  // previous — same length immediately before
  const len = range.to.getTime() - range.from.getTime();
  return { preset: "custom", from: new Date(range.from.getTime() - len), to: new Date(range.from.getTime()), label: "Previous period" };
}

export function inRange(iso: string | Date | null | undefined, range: DateRange): boolean {
  if (!iso) return false;
  const t = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.from.getTime() && t < range.to.getTime();
}

/** Bucket size (hour/day/week) for chart grouping. */
export function bucketing(range: DateRange): "hour" | "day" | "week" {
  const days = (range.to.getTime() - range.from.getTime()) / MS_DAY;
  if (days <= 1) return "hour";
  if (days <= 45) return "day";
  return "week";
}

export function bucketLabel(d: Date, kind: "hour" | "day" | "week"): string {
  if (kind === "hour") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (kind === "week") return `Wk ${weekOfYear(d)}`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
function weekOfYear(d: Date) {
  const first = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - first.getTime()) / MS_DAY + first.getDay() + 1) / 7);
}

/** Generate zero-filled buckets spanning [from, to). */
export function buildBuckets(range: DateRange): { key: string; label: string; from: Date; to: Date }[] {
  const kind = bucketing(range);
  const buckets: { key: string; label: string; from: Date; to: Date }[] = [];
  let cursor = new Date(range.from);
  while (cursor.getTime() < range.to.getTime()) {
    const next = new Date(cursor);
    if (kind === "hour") next.setHours(next.getHours() + 1);
    else if (kind === "day") next.setDate(next.getDate() + 1);
    else next.setDate(next.getDate() + 7);
    buckets.push({
      key: cursor.toISOString(),
      label: bucketLabel(cursor, kind),
      from: new Date(cursor),
      to: new Date(Math.min(next.getTime(), range.to.getTime())),
    });
    cursor = next;
  }
  return buckets;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type Direction = "up" | "down" | "flat" | "none";
export function directionOf(current: number, previous: number, hasPrev: boolean): Direction {
  if (!hasPrev) return "none";
  if (current === previous) return "flat";
  return current > previous ? "up" : "down";
}
