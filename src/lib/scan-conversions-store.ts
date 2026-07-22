// FreBob Scan Conversions — Batch 7B.
// Tracks conversion actions performed on approved scans (order created,
// payment recorded, inventory received, customer linked). Idempotent: an
// action key (scanId + actionType + targetId) can only be executed once.
// Every action produces an immutable event for the audit trail.

import type { DocumentScan, DocumentType, ScanExtraction } from "./scanner-store";

export type ConversionActionType =
  | "create_order"
  | "link_order"
  | "record_payment"
  | "receive_inventory"
  | "adjust_inventory"
  | "create_customer"
  | "link_customer"
  | "record_expense";

export type ConversionRecordType = "order" | "payment" | "inventory_event" | "customer" | "expense";

export type ConversionAction = {
  id: string;
  scanId: string;
  actionType: ConversionActionType;
  recordType: ConversionRecordType;
  targetId: string;             // e.g. order reference, customer id, payment id
  actionKey: string;            // idempotency: `${scanId}:${actionType}:${targetId}`
  summary: string;              // short human-readable summary
  createdBy: string;
  createdAt: string;
  undone?: boolean;
  undoneAt?: string;
};

export type ConversionEvent = {
  id: string;
  scanId: string;
  eventType: "suggested" | "started" | "completed" | "skipped" | "undone" | "duplicate_detected";
  actionType?: ConversionActionType;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: string;
};

export type SuggestedAction = {
  actionType: ConversionActionType;
  label: string;
  description: string;
  priority: "primary" | "secondary";
  disabledReason?: string;
};

const ACTIONS_KEY = "frebob.scanConversions.v1";
const EVENTS_KEY = "frebob.scanConversionEvents.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function write<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}
function nid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`; }

// ---- Queries --------------------------------------------------------------

export function listConversionActions(scanId?: string): ConversionAction[] {
  const rows = read<ConversionAction>(ACTIONS_KEY);
  const filtered = scanId ? rows.filter((r) => r.scanId === scanId) : rows;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listConversionEvents(scanId: string): ConversionEvent[] {
  return read<ConversionEvent>(EVENTS_KEY)
    .filter((e) => e.scanId === scanId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function findActionsByTarget(recordType: ConversionRecordType, targetId: string): ConversionAction[] {
  return read<ConversionAction>(ACTIONS_KEY).filter(
    (r) => r.recordType === recordType && r.targetId === targetId && !r.undone,
  );
}

/** Returns the scan(s) that produced this record, if any. */
export function findSourceScanIds(recordType: ConversionRecordType, targetId: string): string[] {
  const rows = findActionsByTarget(recordType, targetId);
  return Array.from(new Set(rows.map((r) => r.scanId)));
}

export function hasCompletedAction(scanId: string, actionType: ConversionActionType): boolean {
  return listConversionActions(scanId).some((a) => a.actionType === actionType && !a.undone);
}

// ---- Recording ------------------------------------------------------------

export function recordConversionAction(input: Omit<ConversionAction, "id" | "createdAt" | "actionKey">): ConversionAction {
  const actionKey = `${input.scanId}:${input.actionType}:${input.targetId}`;
  const existing = read<ConversionAction>(ACTIONS_KEY).find((r) => r.actionKey === actionKey && !r.undone);
  if (existing) return existing; // idempotent — return same row instead of duplicating

  const row: ConversionAction = {
    id: nid("cvn"),
    createdAt: new Date().toISOString(),
    actionKey,
    ...input,
  };
  const rows = read<ConversionAction>(ACTIONS_KEY);
  rows.push(row);
  write(ACTIONS_KEY, rows);

  recordConversionEvent({
    scanId: input.scanId,
    eventType: "completed",
    actionType: input.actionType,
    title: input.summary,
    createdBy: input.createdBy,
  });
  return row;
}

export function recordConversionEvent(input: Omit<ConversionEvent, "id" | "createdAt"> & { createdAt?: string }): ConversionEvent {
  const row: ConversionEvent = {
    id: nid("cev"),
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input,
  };
  const rows = read<ConversionEvent>(EVENTS_KEY);
  rows.push(row);
  write(EVENTS_KEY, rows);
  return row;
}

// ---- Suggested actions per document type ---------------------------------

export function suggestActionsFor(scan: DocumentScan, reviewed?: ScanExtraction | null): SuggestedAction[] {
  const type: DocumentType = reviewed?.documentType ?? scan.documentType;
  const suggestions: SuggestedAction[] = [];

  switch (type) {
    case "sales_receipt": {
      suggestions.push({
        actionType: "create_order",
        label: "Create order from receipt",
        description: "Turn this sales receipt into an order in your Orders module.",
        priority: "primary",
      });
      if ((reviewed?.amountPaid ?? 0) > 0) {
        suggestions.push({
          actionType: "record_payment",
          label: "Record payment",
          description: "Log the payment shown on the receipt against an order.",
          priority: "secondary",
        });
      }
      break;
    }
    case "customer_order": {
      suggestions.push({
        actionType: "create_order",
        label: "Create order",
        description: "Save this customer request as a pending order.",
        priority: "primary",
      });
      break;
    }
    case "transfer_confirmation":
    case "pos_receipt": {
      suggestions.push({
        actionType: "record_payment",
        label: "Record payment",
        description: "Match this payment confirmation to an existing order.",
        priority: "primary",
      });
      break;
    }
    case "supplier_invoice": {
      suggestions.push({
        actionType: "receive_inventory",
        label: "Receive stock",
        description: "Add these items to your inventory as goods received.",
        priority: "primary",
      });
      suggestions.push({
        actionType: "record_expense",
        label: "Log as expense",
        description: "Record this supplier invoice as a business expense.",
        priority: "secondary",
      });
      break;
    }
    case "stock_list": {
      suggestions.push({
        actionType: "adjust_inventory",
        label: "Adjust stock levels",
        description: "Update inventory quantities from this stock count.",
        priority: "primary",
      });
      break;
    }
    case "expense_receipt": {
      suggestions.push({
        actionType: "record_expense",
        label: "Log expense",
        description: "Save this receipt as a business expense.",
        priority: "primary",
      });
      break;
    }
    default: {
      suggestions.push({
        actionType: "create_order",
        label: "Create order",
        description: "Use this document to create a manual order entry.",
        priority: "secondary",
      });
    }
  }

  // Customer suggestion whenever we detected a customer name
  if (reviewed?.customerName) {
    suggestions.push({
      actionType: "create_customer",
      label: "Add customer to directory",
      description: `Save "${reviewed.customerName}" to Customers if they're new.`,
      priority: "secondary",
    });
  }

  return suggestions;
}
