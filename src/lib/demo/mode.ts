// FreBob Batch 13 — Demo Mode manager.
// Non-invasive: backs up every `frebob.*` localStorage key, replaces the data
// with a deterministic demo seed, and restores the originals on exit.
// Real business data is never mutated while demo mode is active.

import { buildDemoSeed } from "./seed";

const FLAG_KEY = "frebob.demoMode";
const BACKUP_PREFIX = "frebob-real-backup:";
const TOUR_COMPLETED_KEY = "frebob:tour_completed_v1";
const HINT_PREFIX = "frebob:hint:";

// Keys the demo seed writes. Anything else `frebob.*` is still backed up so we
// don't accidentally leak real data into demo view.
const SEED_KEYS = [
  "frebob.approvedRecords.v1",
  "frebob.conversations.v1",
  "frebob.customers.v1",
  "frebob.customerNotes.v1",
  "frebob.customerEvents.v1",
  "frebob.orderCustomerLinks.v1",
  "frebob.orderPayments.v1",
  "frebob.orderStatusOverrides.v1",
  "frebob.documentScans.v1",
  "frebob.notifications.v1",
  "frebob.notifications.lastgen.v1",
  "frebob.inventoryEvents.v1",
  "frebob.user-products.v1",
  "frebob.customerMergeMeta.v1",
  "frebob.customerMergeEvents.v1",
  "frebob.customerDuplicateReviews.v1",
  "frebob.scanConversions.v1",
  "frebob.scanConversionEvents.v1",
];

const isBrowser = () => typeof window !== "undefined";

type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
function emit(active: boolean) {
  for (const l of listeners) l(active);
}

export function subscribeDemoMode(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isDemoMode(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(FLAG_KEY) === "1";
}

function listFrebobKeys(): string[] {
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("frebob.")) out.push(k);
  }
  return out;
}

function backupReal() {
  // Only back up once — protects against re-enter from a stale flag.
  const alreadyBackedUp = Object.keys(window.localStorage).some((k) =>
    k.startsWith(BACKUP_PREFIX),
  );
  if (alreadyBackedUp) return;
  for (const k of listFrebobKeys()) {
    if (k === FLAG_KEY) continue;
    const v = window.localStorage.getItem(k);
    if (v !== null) window.localStorage.setItem(BACKUP_PREFIX + k, v);
  }
}

function restoreReal() {
  // Remove every current frebob.* key that isn't the flag, then restore backup.
  for (const k of listFrebobKeys()) {
    if (k === FLAG_KEY) continue;
    window.localStorage.removeItem(k);
  }
  const backupKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(BACKUP_PREFIX)) backupKeys.push(k);
  }
  for (const bk of backupKeys) {
    const realKey = bk.slice(BACKUP_PREFIX.length);
    const v = window.localStorage.getItem(bk);
    if (v !== null) window.localStorage.setItem(realKey, v);
    window.localStorage.removeItem(bk);
  }
}

function wipeSeedKeys() {
  for (const k of SEED_KEYS) window.localStorage.removeItem(k);
}

function writeSeed() {
  const seed = buildDemoSeed();
  for (const [k, v] of Object.entries(seed)) {
    window.localStorage.setItem(k, JSON.stringify(v));
  }
}

export function enterDemoMode() {
  if (!isBrowser()) return;
  if (isDemoMode()) return;
  backupReal();
  wipeSeedKeys();
  writeSeed();
  window.localStorage.setItem(FLAG_KEY, "1");
  // Reset tour + hints so the demo user gets the guided experience.
  window.localStorage.removeItem(TOUR_COMPLETED_KEY);
  emit(true);
}

export function exitDemoMode() {
  if (!isBrowser()) return;
  if (!isDemoMode()) return;
  restoreReal();
  window.localStorage.removeItem(FLAG_KEY);
  emit(false);
}

export function resetDemoMode() {
  if (!isBrowser()) return;
  if (!isDemoMode()) return;
  wipeSeedKeys();
  writeSeed();
  emit(true);
}

export function integrityCheck(): { ok: boolean; issues: string[] } {
  if (!isBrowser()) return { ok: true, issues: [] };
  const issues: string[] = [];
  try {
    const records = JSON.parse(
      window.localStorage.getItem("frebob.approvedRecords.v1") || "[]",
    );
    for (const r of records) {
      const items = r?.data?.items || [];
      const computed = items.reduce(
        (s: number, it: { quantity?: number | null; unit_price?: number | null }) =>
          s + (it.quantity ?? 0) * (it.unit_price ?? 0),
        0,
      );
      const total = r?.data?.total_amount ?? 0;
      if (Math.abs(computed - total) > 1) {
        issues.push(`${r.reference}: line total ${computed} ≠ total_amount ${total}`);
      }
    }
  } catch (err) {
    issues.push(String(err));
  }
  return { ok: issues.length === 0, issues };
}

// Contextual hints ----------------------------------------------------------
export function isHintDismissed(key: string): boolean {
  if (!isBrowser()) return true;
  return window.localStorage.getItem(HINT_PREFIX + key) === "1";
}
export function dismissHint(key: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(HINT_PREFIX + key, "1");
}

// Tour completion -----------------------------------------------------------
export function isTourCompleted(): boolean {
  if (!isBrowser()) return true;
  return window.localStorage.getItem(TOUR_COMPLETED_KEY) === "1";
}
export function markTourCompleted() {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOUR_COMPLETED_KEY, "1");
}
export function resetTour() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOUR_COMPLETED_KEY);
}

export const DEMO_BUSINESS = {
  name: "Amaka Style Hub",
  location: "Enugu, Nigeria",
  currency: "NGN",
  timezone: "Africa/Lagos",
  language: "english",
  description:
    "A growing fashion business selling ready-made outfits, Ankara fabrics and custom tailoring through walk-ins and WhatsApp.",
};
