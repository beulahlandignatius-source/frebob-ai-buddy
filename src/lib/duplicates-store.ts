// FreBob — Customer duplicate detection, merge & relink (prototype).
// LocalStorage-only. Deterministic rules. Human-confirmed merges.

import {
  listCustomers, getCustomer, computeMetrics, addEvent, normalizePhone,
  linkOrderToCustomer, getCustomerIdForOrder,
  formatMoney,
  type Customer, type CustomerInput,
} from "./customers-store";
import { listOrders, type Order } from "./orders-store";

// ------------------------------------------------------------------ storage
const CUST_KEY = "frebob.customers.v1";
const MERGE_META_KEY = "frebob.customerMergeMeta.v1"; // per-customer merged flag
const MERGE_EVENT_KEY = "frebob.customerMergeEvents.v1";
const REVIEW_KEY = "frebob.customerDuplicateReviews.v1";
const ORDER_LINK_KEY = "frebob.orderCustomerLinks.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
function write<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}
function nid(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// ------------------------------------------------------------------ types
export type MergeMeta = {
  customerId: string;
  mergedIntoCustomerId: string;
  mergedAt: string;
};

export type ReviewDecision = "not_duplicate" | "review_later";
export type ReviewRecord = {
  pairKey: string;
  aId: string;
  bId: string;
  decision: ReviewDecision;
  reviewedBy: string;
  reviewedAt: string;
};

export type ConfidenceLevel = "high" | "medium" | "low";

export type MatchReasonCode =
  | "same_phone" | "same_email" | "same_whatsapp"
  | "similar_name_phone_tail" | "same_name_email_fragment"
  | "similar_name_only" | "same_surname_only" | "same_city_only";

export type MatchReason = { code: MatchReasonCode; text: string };

export type DuplicateGroup = {
  id: string;
  memberIds: string[];       // customer IDs (2+)
  confidence: ConfidenceLevel;
  reasons: MatchReason[];
  reviewStatus: "needs_review" | "not_duplicate" | "review_later" | "merge_completed";
};

export type MergeEvent = {
  id: string;
  primaryCustomerId: string;
  secondaryCustomerId: string;
  primarySnapshot: Customer;
  secondarySnapshot: Customer;
  selectedFieldValues: Partial<Customer>;
  matchReasons: MatchReason[];
  recordsMoved: {
    orders: { orderId: string; previousCustomerId: string | null }[];
    notes: number;
    events: number;
  };
  mergedBy: string;
  mergedAt: string;
  status: "completed" | "reversed" | "failed";
  reversedAt?: string;
  reversedBy?: string;
};

// ------------------------------------------------------------------ merge meta
export function listMergeMeta(): MergeMeta[] { return read<MergeMeta>(MERGE_META_KEY); }
export function isMerged(customerId: string): MergeMeta | undefined {
  return listMergeMeta().find((m) => m.customerId === customerId);
}
function setMergeMeta(m: MergeMeta) {
  const rows = listMergeMeta().filter((r) => r.customerId !== m.customerId);
  rows.push(m); write(MERGE_META_KEY, rows);
}
function clearMergeMeta(customerId: string) {
  write(MERGE_META_KEY, listMergeMeta().filter((r) => r.customerId !== customerId));
}

function setCustomerActive(id: string, active: boolean) {
  const rows = read<Customer>(CUST_KEY);
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], isActive: active, updatedAt: new Date().toISOString() };
  write(CUST_KEY, rows);
}

function applyFieldSelection(id: string, patch: Partial<Customer>) {
  const rows = read<Customer>(CUST_KEY);
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) return;
  rows[idx] = {
    ...rows[idx],
    ...patch,
    normalizedPhone: patch.phone !== undefined ? normalizePhone(patch.phone) : rows[idx].normalizedPhone,
    updatedAt: new Date().toISOString(),
  };
  write(CUST_KEY, rows);
}

// ------------------------------------------------------------------ reviews
function pairKey(a: string, b: string) { return [a, b].sort().join("::"); }
export function listReviews(): ReviewRecord[] { return read<ReviewRecord>(REVIEW_KEY); }
export function getReview(a: string, b: string): ReviewRecord | undefined {
  return listReviews().find((r) => r.pairKey === pairKey(a, b));
}
export function saveReview(aId: string, bId: string, decision: ReviewDecision, by = "You"): ReviewRecord {
  const row: ReviewRecord = {
    pairKey: pairKey(aId, bId), aId, bId, decision,
    reviewedBy: by, reviewedAt: new Date().toISOString(),
  };
  const rows = listReviews().filter((r) => r.pairKey !== row.pairKey);
  rows.push(row); write(REVIEW_KEY, rows);
  return row;
}

// ------------------------------------------------------------------ detection
function activeCustomers(): Customer[] {
  const merged = new Set(listMergeMeta().map((m) => m.customerId));
  return listCustomers().filter((c) => !merged.has(c.id));
}

function normName(n: string) {
  return n.toLowerCase().replace(/[.,'"()]/g, " ").replace(/\s+/g, " ").trim();
}
function firstToken(n: string) { return normName(n).split(" ")[0] ?? ""; }
function lastToken(n: string) {
  const parts = normName(n).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}
function nameSimilar(a: string, b: string): boolean {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const fa = firstToken(a), fb = firstToken(b);
  if (fa && fa === fb && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

type Pair = { a: Customer; b: Customer; reasons: MatchReason[]; confidence: ConfidenceLevel };

function classifyPair(a: Customer, b: Customer): Pair | null {
  const reasons: MatchReason[] = [];
  let level: ConfidenceLevel | null = null;

  const aPhone = a.normalizedPhone, bPhone = b.normalizedPhone;
  const aEmail = a.email?.toLowerCase() ?? null;
  const bEmail = b.email?.toLowerCase() ?? null;
  const aWa = normalizePhone(a.whatsapp);
  const bWa = normalizePhone(b.whatsapp);

  if (aPhone && bPhone && aPhone === bPhone) {
    reasons.push({ code: "same_phone", text: "These records use the same phone number." });
    level = "high";
  }
  if (aEmail && bEmail && aEmail === bEmail) {
    reasons.push({ code: "same_email", text: "These records share the same email address." });
    level = "high";
  }
  if (aWa && bWa && aWa === bWa) {
    reasons.push({ code: "same_whatsapp", text: "These records share the same WhatsApp number." });
    level = "high";
  }

  if (!level) {
    // medium: similar name + matching phone tail (last 6)
    if (aPhone && bPhone && aPhone.slice(-6) === bPhone.slice(-6) && nameSimilar(a.name, b.name)) {
      reasons.push({
        code: "similar_name_phone_tail",
        text: "The names look similar and both phone numbers end with the same digits.",
      });
      level = "medium";
    } else if (aEmail && bEmail) {
      const [aLocal] = aEmail.split("@");
      const [bLocal] = bEmail.split("@");
      if (aLocal && bLocal && aLocal.length >= 3 && (aLocal === bLocal) && nameSimilar(a.name, b.name)) {
        reasons.push({
          code: "same_name_email_fragment",
          text: "The names look similar and the email addresses share the same handle.",
        });
        level = "medium";
      }
    }
  }

  if (!level) {
    // low
    if (nameSimilar(a.name, b.name)) {
      reasons.push({ code: "similar_name_only", text: "The customer names look similar." });
      level = "low";
    } else if (lastToken(a.name) && lastToken(a.name) === lastToken(b.name)) {
      reasons.push({ code: "same_surname_only", text: "These records share the same surname." });
      level = "low";
    } else if (a.city && b.city && a.city.trim().toLowerCase() === b.city.trim().toLowerCase()
      && nameSimilar(firstToken(a.name), firstToken(b.name))) {
      reasons.push({ code: "same_city_only", text: "Same city with a similar first name." });
      level = "low";
    }
  }

  if (!level || reasons.length === 0) return null;
  return { a, b, reasons, confidence: level };
}

/** Union-find grouping over pairs so multiple linked records collapse into one group. */
export function detectDuplicateGroups(): DuplicateGroup[] {
  const customers = activeCustomers();
  const pairs: Pair[] = [];
  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const p = classifyPair(customers[i], customers[j]);
      if (p) pairs.push(p);
    }
  }

  // union find
  const parent: Record<string, string> = {};
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (x: string, y: string) => { const rx = find(x), ry = find(y); if (rx !== ry) parent[rx] = ry; };
  for (const c of customers) parent[c.id] = c.id;
  for (const p of pairs) union(p.a.id, p.b.id);

  const clusters: Record<string, string[]> = {};
  for (const c of customers) {
    const root = find(c.id);
    (clusters[root] ??= []).push(c.id);
  }

  const reviews = listReviews();
  const reviewFor = (a: string, b: string) => reviews.find((r) => r.pairKey === pairKey(a, b));

  const groups: DuplicateGroup[] = [];
  for (const memberIds of Object.values(clusters)) {
    if (memberIds.length < 2) continue;

    const gPairs = pairs.filter(
      (p) => memberIds.includes(p.a.id) && memberIds.includes(p.b.id),
    );
    if (gPairs.length === 0) continue;

    // highest confidence wins
    const order: ConfidenceLevel[] = ["high", "medium", "low"];
    const confidence = order.find((lvl) => gPairs.some((p) => p.confidence === lvl))!;

    // dedupe reasons by code
    const reasonMap = new Map<string, MatchReason>();
    for (const p of gPairs) for (const r of p.reasons) reasonMap.set(r.code, r);

    // status: derive from reviews on every pair
    const allPairsReviewed = gPairs.every((p) => {
      const rv = reviewFor(p.a.id, p.b.id);
      return !!rv;
    });
    const anyNotDup = gPairs.some((p) => reviewFor(p.a.id, p.b.id)?.decision === "not_duplicate");
    const anyLater = gPairs.some((p) => reviewFor(p.a.id, p.b.id)?.decision === "review_later");

    let reviewStatus: DuplicateGroup["reviewStatus"] = "needs_review";
    if (allPairsReviewed && anyNotDup && !anyLater) reviewStatus = "not_duplicate";
    else if (anyLater) reviewStatus = "review_later";

    const id = "grp_" + memberIds.slice().sort().join("_").slice(0, 40);
    groups.push({ id, memberIds, confidence, reasons: [...reasonMap.values()], reviewStatus });
  }

  // Merged groups (recently completed)
  const events = listMergeEvents().filter((e) => e.status === "completed");
  for (const ev of events) {
    const id = "grp_" + [ev.primaryCustomerId, ev.secondaryCustomerId].sort().join("_").slice(0, 40);
    if (groups.some((g) => g.id === id)) continue;
    groups.push({
      id,
      memberIds: [ev.primaryCustomerId, ev.secondaryCustomerId],
      confidence: "high",
      reasons: ev.matchReasons,
      reviewStatus: "merge_completed",
    });
  }

  // Order: needs_review high → medium → low → later → not_duplicate → merged
  const rank: Record<DuplicateGroup["reviewStatus"], number> = {
    needs_review: 0, review_later: 1, not_duplicate: 2, merge_completed: 3,
  };
  const crank: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 };
  groups.sort((x, y) => {
    if (rank[x.reviewStatus] !== rank[y.reviewStatus]) return rank[x.reviewStatus] - rank[y.reviewStatus];
    return crank[x.confidence] - crank[y.confidence];
  });

  return groups;
}

export function getDuplicateGroup(id: string): DuplicateGroup | undefined {
  return detectDuplicateGroups().find((g) => g.id === id);
}

// ------------------------------------------------------------------ summary
export type DuplicateSummary = {
  groups: number;
  highConfidence: number;
  mediumConfidence: number;
  unreviewed: number;
  mergesCompleted: number;
};

export function summariseDuplicates(): DuplicateSummary {
  const groups = detectDuplicateGroups();
  const merges = listMergeEvents().filter((e) => e.status === "completed").length;
  return {
    groups: groups.filter((g) => g.reviewStatus !== "merge_completed").length,
    highConfidence: groups.filter((g) => g.confidence === "high" && g.reviewStatus !== "merge_completed").length,
    mediumConfidence: groups.filter((g) => g.confidence === "medium" && g.reviewStatus !== "merge_completed").length,
    unreviewed: groups.filter((g) => g.reviewStatus === "needs_review").length,
    mergesCompleted: merges,
  };
}

// ------------------------------------------------------------------ merge
export type FieldSelection = Partial<Pick<
  Customer,
  "name" | "phone" | "whatsapp" | "email" | "address" | "city" | "state" | "preferredLanguage" | "notesSummary"
>>;

export type MergePreview = {
  primary: Customer;
  secondary: Customer;
  conflicts: {
    field: keyof FieldSelection;
    label: string;
    primaryValue: string | null;
    secondaryValue: string | null;
    suggested: "primary" | "secondary";
  }[];
  orders: { fromSecondary: Order[]; existingOnPrimary: Order[] };
  totals: {
    combinedTotalSpent: number;
    combinedAmountPaid: number;
    combinedOutstanding: number;
    cancelledExcluded: number;
  };
};

const FIELD_LABELS: Record<keyof FieldSelection, string> = {
  name: "Customer name",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
  email: "Email",
  address: "Address",
  city: "City",
  state: "State",
  preferredLanguage: "Preferred language",
  notesSummary: "Notes summary",
};

function valStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function buildMergePreview(primaryId: string, secondaryId: string): MergePreview | null {
  const primary = getCustomer(primaryId);
  const secondary = getCustomer(secondaryId);
  if (!primary || !secondary) return null;

  const fields: (keyof FieldSelection)[] = [
    "name", "phone", "whatsapp", "email", "address", "city", "state", "preferredLanguage", "notesSummary",
  ];
  const conflicts: MergePreview["conflicts"] = [];
  for (const f of fields) {
    const pv = valStr(primary[f] as unknown);
    const sv = valStr(secondary[f] as unknown);
    if (pv !== sv) {
      // Suggested: prefer non-empty; if both non-empty, prefer more-recently-updated record.
      let suggested: "primary" | "secondary" = "primary";
      if (!pv && sv) suggested = "secondary";
      else if (pv && sv) {
        suggested = (secondary.updatedAt > primary.updatedAt) ? "secondary" : "primary";
      }
      conflicts.push({ field: f, label: FIELD_LABELS[f], primaryValue: pv, secondaryValue: sv, suggested });
    }
  }

  // Orders
  const allOrders = listOrders();
  const secOrders = allOrders.filter((o) => {
    const explicit = getCustomerIdForOrder(o.id);
    if (explicit) return explicit === secondary.id;
    const np = normalizePhone(o.customerPhone);
    if (np && secondary.normalizedPhone && np === secondary.normalizedPhone) return true;
    if (!np && !secondary.normalizedPhone && o.customerName?.trim().toLowerCase() === secondary.name.trim().toLowerCase()) return true;
    return false;
  });
  const priMetrics = computeMetrics(primary.id);
  const secMetrics = computeMetrics(secondary.id);

  return {
    primary, secondary, conflicts,
    orders: { fromSecondary: secOrders, existingOnPrimary: priMetrics.validOrders },
    totals: {
      combinedTotalSpent: priMetrics.totalSpent + secMetrics.totalSpent,
      combinedAmountPaid: priMetrics.amountPaid + secMetrics.amountPaid,
      combinedOutstanding: Math.max((priMetrics.totalSpent + secMetrics.totalSpent) - (priMetrics.amountPaid + secMetrics.amountPaid), 0),
      cancelledExcluded: allOrders.filter((o) => o.orderStatus === "cancelled" && secOrders.includes(o)).length,
    },
  };
}

export type MergeInput = {
  primaryId: string;
  secondaryId: string;
  selection: FieldSelection;
  reasons: MatchReason[];
  mergedBy?: string;
};

export type MergeResult =
  | { ok: true; event: MergeEvent }
  | { ok: false; error: string; code: "already_merged" | "same_customer" | "not_found" | "unknown" };

export function performMerge(input: MergeInput): MergeResult {
  const { primaryId, secondaryId, selection, reasons } = input;
  const by = input.mergedBy ?? "You";

  if (primaryId === secondaryId) return { ok: false, error: "Primary and secondary must differ.", code: "same_customer" };
  const primary = getCustomer(primaryId);
  const secondary = getCustomer(secondaryId);
  if (!primary || !secondary) return { ok: false, error: "Customer not found.", code: "not_found" };
  if (isMerged(primaryId) || isMerged(secondaryId)) {
    return { ok: false, error: "One of these customer records has already been merged.", code: "already_merged" };
  }

  // Snapshot before
  const primarySnapshot: Customer = { ...primary };
  const secondarySnapshot: Customer = { ...secondary };

  // 1) Move orders — record previous links for reversal
  const allOrders = listOrders();
  const moved: MergeEvent["recordsMoved"]["orders"] = [];
  for (const o of allOrders) {
    const explicit = getCustomerIdForOrder(o.id);
    let belongsToSecondary = explicit === secondary.id;
    if (!explicit) {
      const np = normalizePhone(o.customerPhone);
      if (np && secondary.normalizedPhone && np === secondary.normalizedPhone) belongsToSecondary = true;
      else if (!np && !secondary.normalizedPhone && o.customerName?.trim().toLowerCase() === secondary.name.trim().toLowerCase()) belongsToSecondary = true;
    }
    if (belongsToSecondary) {
      moved.push({ orderId: o.id, previousCustomerId: explicit ?? null });
      linkOrderToCustomer(o.id, primary.id);
    }
  }

  // 2) Apply chosen field values to primary
  applyFieldSelection(primary.id, selection);

  // 3) Deactivate & mark secondary merged
  setCustomerActive(secondary.id, false);
  setMergeMeta({ customerId: secondary.id, mergedIntoCustomerId: primary.id, mergedAt: new Date().toISOString() });

  // 4) Emit customer events
  addEvent({
    customerId: primary.id, eventType: "customer_updated",
    title: "Merged in duplicate record",
    description: `Combined with ${secondary.name}. ${moved.length} order${moved.length === 1 ? "" : "s"} moved.`,
    sourceType: "manual", createdBy: by,
  });
  addEvent({
    customerId: secondary.id, eventType: "customer_updated",
    title: "Marked as merged",
    description: `Merged into ${primary.name}.`,
    sourceType: "manual", createdBy: by,
  });

  const event: MergeEvent = {
    id: nid("merge"),
    primaryCustomerId: primary.id,
    secondaryCustomerId: secondary.id,
    primarySnapshot, secondarySnapshot,
    selectedFieldValues: selection,
    matchReasons: reasons,
    recordsMoved: { orders: moved, notes: 0, events: 0 },
    mergedBy: by,
    mergedAt: new Date().toISOString(),
    status: "completed",
  };
  const rows = read<MergeEvent>(MERGE_EVENT_KEY);
  rows.push(event); write(MERGE_EVENT_KEY, rows);
  return { ok: true, event };
}

// ------------------------------------------------------------------ history + undo
export function listMergeEvents(): MergeEvent[] {
  return read<MergeEvent>(MERGE_EVENT_KEY).sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : -1));
}
export function getMergeEvent(id: string): MergeEvent | undefined {
  return listMergeEvents().find((e) => e.id === id);
}

export type UndoEligibility = { canUndo: boolean; reason?: string };

export function canUndoMerge(eventId: string): UndoEligibility {
  const ev = getMergeEvent(eventId);
  if (!ev) return { canUndo: false, reason: "Merge not found." };
  if (ev.status !== "completed") return { canUndo: false, reason: "This merge is not in a reversible state." };

  // Time window: 7 days
  const ageMs = Date.now() - new Date(ev.mergedAt).getTime();
  if (ageMs > 7 * 86_400_000) {
    return { canUndo: false, reason: "This merge is older than 7 days and can no longer be reversed automatically." };
  }

  // Check whether primary received new payments AFTER the merge on a moved order.
  const orders = listOrders();
  const movedIds = new Set(ev.recordsMoved.orders.map((m) => m.orderId));
  for (const o of orders) {
    if (!movedIds.has(o.id)) continue;
    const laterPayment = o.payments.some((p) => new Date(p.createdAt).getTime() > new Date(ev.mergedAt).getTime());
    if (laterPayment) {
      return {
        canUndo: false,
        reason: "New payments were added after the merge on one of the moved orders. Review the linked records manually.",
      };
    }
  }
  // Secondary record must still exist
  const secondary = getCustomer(ev.secondaryCustomerId);
  if (!secondary) return { canUndo: false, reason: "The original secondary record is no longer available." };
  return { canUndo: true };
}

export function undoMerge(eventId: string, by = "You"): { ok: boolean; error?: string } {
  const eligible = canUndoMerge(eventId);
  if (!eligible.canUndo) return { ok: false, error: eligible.reason };
  const rows = read<MergeEvent>(MERGE_EVENT_KEY);
  const idx = rows.findIndex((e) => e.id === eventId);
  if (idx < 0) return { ok: false, error: "Merge not found." };
  const ev = rows[idx];

  // Restore order links
  for (const m of ev.recordsMoved.orders) {
    if (m.previousCustomerId) linkOrderToCustomer(m.orderId, m.previousCustomerId);
    else {
      // no explicit prior link: remove the current explicit link back to primary
      const raw = read<{ orderId: string; customerId: string }>(ORDER_LINK_KEY);
      write(ORDER_LINK_KEY, raw.filter((r) => r.orderId !== m.orderId));
    }
  }
  // Restore primary field snapshot
  applyFieldSelection(ev.primaryCustomerId, ev.primarySnapshot);
  // Reactivate secondary
  setCustomerActive(ev.secondaryCustomerId, true);
  clearMergeMeta(ev.secondaryCustomerId);

  rows[idx] = { ...ev, status: "reversed", reversedAt: new Date().toISOString(), reversedBy: by };
  write(MERGE_EVENT_KEY, rows);

  addEvent({
    customerId: ev.primaryCustomerId, eventType: "customer_updated",
    title: "Merge reversed",
    description: `Restored ${ev.secondarySnapshot.name} as a separate record.`,
    sourceType: "manual", createdBy: by,
  });
  return { ok: true };
}

// ------------------------------------------------------------------ relink
export type RelinkPreview = {
  order: Order;
  currentCustomer: Customer | null;
  targetCustomer: Customer;
  currentOutstandingAfter: number;
  targetOutstandingAfter: number;
};

export function buildRelinkPreview(orderId: string, targetCustomerId: string): RelinkPreview | null {
  const order = listOrders().find((o) => o.id === orderId);
  const target = getCustomer(targetCustomerId);
  if (!order || !target) return null;
  const currentId = getCustomerIdForOrder(orderId);
  const current = currentId ? getCustomer(currentId) ?? null : null;
  const targetMetrics = computeMetrics(target.id);
  const currentMetrics = current ? computeMetrics(current.id) : null;
  return {
    order,
    currentCustomer: current,
    targetCustomer: target,
    currentOutstandingAfter: Math.max((currentMetrics?.outstanding ?? 0) - order.balance, 0),
    targetOutstandingAfter: targetMetrics.outstanding + order.balance,
  };
}

export function relinkOrder(orderId: string, targetCustomerId: string, by = "You"):
  { ok: boolean; error?: string } {
  const target = getCustomer(targetCustomerId);
  if (!target) return { ok: false, error: "Target customer not found." };
  linkOrderToCustomer(orderId, targetCustomerId);
  addEvent({
    customerId: targetCustomerId, eventType: "order_recorded",
    title: `Order ${orderId} relinked to this customer`,
    sourceType: "order", sourceRecordId: orderId,
    createdBy: by,
  });
  return { ok: true };
}

// ------------------------------------------------------------------ helpers
export function confidenceLabel(c: ConfidenceLevel): string {
  return c === "high" ? "High confidence" : c === "medium" ? "Medium confidence" : "Low confidence";
}
export function reviewStatusLabel(s: DuplicateGroup["reviewStatus"]): string {
  return s === "needs_review" ? "Needs review"
    : s === "not_duplicate" ? "Not a duplicate"
    : s === "review_later" ? "Review later"
    : "Merge completed";
}

export function formatMoneyExport(n: number) { return formatMoney(n); }
