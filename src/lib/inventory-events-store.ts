// FreBob Inventory Events — append-only prototype store (Batch 7B).
// Tracks stock adjustments (received, sold, adjusted, corrected) linked to
// approved records or scans. Never overwrites; each event is immutable so
// audits stay clean.

export type InventoryEventType =
  | "received"
  | "sold"
  | "adjusted"
  | "corrected"
  | "opening_balance";

export type InventoryEvent = {
  id: string;
  productName: string;
  variant?: string | null;
  quantityDelta: number; // positive = stock in, negative = stock out
  unitCost?: number | null;
  eventType: InventoryEventType;
  sourceType: "scan" | "manual" | "record" | "order";
  sourceId?: string | null;
  note?: string | null;
  createdBy: string;
  createdAt: string;
};

const KEY = "frebob.inventoryEvents.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read(): InventoryEvent[] {
  if (!isBrowser()) return [];
  try { const raw = window.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function write(rows: InventoryEvent[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}
function nid() { return `ie_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`; }

export function listInventoryEvents(filter?: { sourceId?: string; productName?: string }): InventoryEvent[] {
  let rows = read();
  if (filter?.sourceId) rows = rows.filter((r) => r.sourceId === filter.sourceId);
  if (filter?.productName) rows = rows.filter((r) => r.productName.toLowerCase() === filter.productName!.toLowerCase());
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function recordInventoryEvent(input: Omit<InventoryEvent, "id" | "createdAt"> & { createdAt?: string }): InventoryEvent {
  const row: InventoryEvent = {
    id: nid(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
  };
  const rows = read();
  rows.push(row);
  write(rows);
  return row;
}

export function currentStockFor(productName: string): number {
  return listInventoryEvents({ productName })
    .reduce((sum, e) => sum + e.quantityDelta, 0);
}
