// LocalStorage-backed prototype store for FreBob Batch 3.
// Persists conversations, AI draft extractions and approved business records
// so the review + approval workflow works without a live database.

export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "unknown";
export type OrderStatus =
  | "enquiry"
  | "reserved"
  | "pending"
  | "awaiting_pickup"
  | "awaiting_delivery"
  | "completed"
  | "cancelled"
  | "unknown";
export type EventType =
  | "enquiry"
  | "reservation"
  | "sale_order"
  | "payment"
  | "cancellation"
  | "unknown";
export type ConfidenceLabel = "high" | "needs_review" | "missing_information";
export type SourceType = "paste" | "upload" | "demo";
export type Language =
  | "english"
  | "nigerian_pidgin"
  | "yoruba"
  | "hausa"
  | "igbo"
  | "mixed"
  | "auto";

export type ExtractionItem = {
  product_name: string | null;
  variant: string | null;
  quantity: number | null;
  unit_price: number | null;
};

export type Extraction = {
  event_type: EventType;
  language: Language;
  customer: { name: string | null; phone: string | null };
  items: ExtractionItem[];
  total_amount: number | null;
  amount_paid: number | null;
  balance: number | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_or_pickup: string | null;
  internal_note: string | null;
  missing_fields: string[];
  needs_confirmation: boolean;
  confidence: ConfidenceLabel;
};

export type ConversationRecord = {
  id: string;
  createdAt: string;
  sourceType: SourceType;
  fileName?: string;
  language: Language;
  text: string;
  status: "draft" | "approved" | "rejected";
  draft?: Extraction;
  edited?: Extraction;
  approvedRecordId?: string;
  processingMode?: "ai" | "mock";
};

export type ApprovedRecord = {
  id: string;
  reference: string;
  conversationId: string;
  approvedAt: string;
  approvedBy: string;
  data: Extraction;
  sourceText: string;
  sourceType: SourceType;
};

const CONV_KEY = "frebob.conversations.v1";
const RECORD_KEY = "frebob.approvedRecords.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// Conversations ---------------------------------------------------------------

export function listConversations(): ConversationRecord[] {
  return read<ConversationRecord>(CONV_KEY).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getConversation(id: string): ConversationRecord | undefined {
  return listConversations().find((c) => c.id === id);
}

export function saveConversation(row: ConversationRecord) {
  const rows = read<ConversationRecord>(CONV_KEY).filter((r) => r.id !== row.id);
  rows.push(row);
  write(CONV_KEY, rows);
}

export function createConversation(input: {
  text: string;
  language: Language;
  sourceType: SourceType;
  fileName?: string;
}): ConversationRecord {
  const row: ConversationRecord = {
    id: newId("conv"),
    createdAt: new Date().toISOString(),
    sourceType: input.sourceType,
    fileName: input.fileName,
    language: input.language,
    text: input.text,
    status: "draft",
  };
  saveConversation(row);
  return row;
}

// Approved records ------------------------------------------------------------

export function listApprovedRecords(): ApprovedRecord[] {
  return read<ApprovedRecord>(RECORD_KEY).sort((a, b) => (a.approvedAt < b.approvedAt ? 1 : -1));
}

export function getApprovedRecord(id: string) {
  return listApprovedRecords().find((r) => r.id === id);
}

export function approveConversation(
  conv: ConversationRecord,
  data: Extraction,
  approvedBy = "You",
): ApprovedRecord {
  const record: ApprovedRecord = {
    id: newId("rec"),
    reference: `FB-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    conversationId: conv.id,
    approvedAt: new Date().toISOString(),
    approvedBy,
    data,
    sourceText: conv.text,
    sourceType: conv.sourceType,
  };
  const rows = read<ApprovedRecord>(RECORD_KEY);
  rows.push(record);
  write(RECORD_KEY, rows);
  saveConversation({
    ...conv,
    edited: data,
    status: "approved",
    approvedRecordId: record.id,
  });
  return record;
}

export function rejectConversation(conv: ConversationRecord, note?: string) {
  saveConversation({
    ...conv,
    status: "rejected",
    edited: conv.edited,
    draft: conv.draft ? { ...conv.draft, internal_note: note ?? conv.draft.internal_note } : conv.draft,
  });
}

// Validation ------------------------------------------------------------------

export function requiredMissingFields(e: Extraction): string[] {
  const missing: string[] = [];
  const item = e.items[0];
  const needsProduct = e.event_type === "sale_order" || e.event_type === "reservation";
  if (needsProduct) {
    if (!item?.product_name) missing.push("Product name");
    if (!item?.quantity || item.quantity <= 0) missing.push("Quantity");
    if (e.order_status === "unknown") missing.push("Order status");
  }
  return missing;
}

export function computeBalance(e: Extraction): Extraction {
  const total =
    e.total_amount ??
    (e.items.reduce((s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0) || null);
  const paid = e.amount_paid;
  const balance = total !== null && paid !== null ? Math.max(total - paid, 0) : e.balance;
  return { ...e, total_amount: total, balance };
}
