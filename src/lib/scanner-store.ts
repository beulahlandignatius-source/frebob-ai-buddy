// LocalStorage-backed prototype store for FreBob Batch 7A (Scanner & Document Capture).
// Persists document scans, page images (as data URLs), AI extractions, user
// reviews and approval events. Approved scans are also pushed into the
// existing Business Memory via records-store (reused, not duplicated).

import type { Extraction, ApprovedRecord } from "./records-store";
import { newId, saveConversation } from "./records-store";

export type DocumentType =
  | "sales_receipt"
  | "supplier_invoice"
  | "expense_receipt"
  | "transfer_confirmation"
  | "pos_receipt"
  | "customer_order"
  | "stock_list"
  | "handwritten_note"
  | "other";

export type ScanStatus =
  | "uploaded"
  | "processing"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "extraction_failed"
  | "needs_better_image"
  | "draft";

export type ReviewStatus = "unreviewed" | "in_progress" | "approved" | "rejected";

export type QualityStatus = "ok" | "blurry" | "dark" | "cropped" | "glare" | "unknown";

export type ScanPage = {
  id: string;
  pageNumber: number;
  dataUrl: string;       // base64 encoded image (or first-page render for PDF)
  originalDataUrl: string;
  rotation: 0 | 90 | 180 | 270;
  qualityStatus: QualityStatus;
  qualityWarnings: string[];
  fileName?: string;
  fileType: string;
  fileSize: number;
};

export type LineItem = {
  id: string;
  productName: string | null;
  variant: string | null;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  reviewed: boolean;
};

export type ScanExtraction = {
  documentType: DocumentType;
  businessName?: string | null;
  customerName?: string | null;
  supplierName?: string | null;
  merchantName?: string | null;
  phone?: string | null;
  documentNumber?: string | null;
  transactionReference?: string | null;
  documentDate?: string | null;   // ISO or free text
  documentTime?: string | null;
  currency: string;               // default ₦
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  deliveryFee: number | null;
  totalAmount: number | null;
  amountPaid: number | null;
  outstandingBalance: number | null;
  paymentMethod: string | null;
  bankName?: string | null;
  terminalId?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  expenseCategory?: string | null;
  deliveryNote?: string | null;
  notes: string | null;
  lineItems: LineItem[];
  rawText: string;
  missingFields: string[];
  needsReview: boolean;
  confidence: "high" | "needs_review" | "missing_information";
  perFieldNeedsReview?: string[]; // list of field keys the reviewer should double-check
};

export type ScanEvent = {
  id: string;
  eventType:
    | "created"
    | "processed"
    | "extraction_failed"
    | "reviewed"
    | "approved"
    | "rejected"
    | "reprocessed"
    | "draft_saved";
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;
};

export type DocumentScan = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;                 // generated or user-entered
  documentType: DocumentType;
  status: ScanStatus;
  reviewStatus: ReviewStatus;
  source: "camera" | "upload" | "demo";
  pages: ScanPage[];
  fileHash: string;              // simple checksum for duplicate detection
  processingMode?: "ai" | "mock";
  processingError?: string | null;
  extraction?: ScanExtraction;   // original AI draft
  reviewed?: ScanExtraction;     // user-corrected version
  approvedRecordId?: string | null;
  rejectionReason?: string | null;
  events: ScanEvent[];
};

const SCAN_KEY = "frebob.documentScans.v1";
const MAX_PAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// -- I/O ---------------------------------------------------------------------

function isBrowser() { return typeof window !== "undefined"; }

function read(): DocumentScan[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SCAN_KEY);
    return raw ? (JSON.parse(raw) as DocumentScan[]) : [];
  } catch {
    return [];
  }
}

function write(rows: DocumentScan[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SCAN_KEY, JSON.stringify(rows));
  } catch (err) {
    // Likely storage quota (large images). Surface a clean error.
    console.warn("[scanner-store] Failed to persist scans", err);
    throw new Error(
      "Storage is full. Remove older scans, or use smaller images.",
    );
  }
}

export const SCANNER_LIMITS = { MAX_PAGES, MAX_IMAGE_BYTES, MAX_PDF_BYTES };

// -- Queries -----------------------------------------------------------------

export function listScans(): DocumentScan[] {
  return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getScan(id: string): DocumentScan | undefined {
  return read().find((s) => s.id === id);
}

export function saveScan(scan: DocumentScan) {
  const rows = read().filter((s) => s.id !== scan.id);
  rows.push({ ...scan, updatedAt: new Date().toISOString() });
  write(rows);
}

export function deleteScan(id: string) {
  write(read().filter((s) => s.id !== id));
}

// -- Validation --------------------------------------------------------------

export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function validateFile(file: File): string | null {
  const mime = file.type.toLowerCase();
  if (!ACCEPTED_MIME.includes(mime)) {
    return "This file type is not supported. Upload a JPG, PNG, WEBP or PDF.";
  }
  if (file.size === 0) return "This file is empty.";
  const isPdf = mime === "application/pdf";
  const cap = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > cap) {
    return `File is too large. Maximum ${Math.round(cap / 1024 / 1024)}MB.`;
  }
  return null;
}

// Simple checksum used for duplicate-document heuristics.
export function hashDataUrl(dataUrl: string): string {
  let h = 5381;
  const s = dataUrl.slice(0, 40000);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `h_${(h >>> 0).toString(36)}_${dataUrl.length.toString(36)}`;
}

// -- Creation ---------------------------------------------------------------

export function createScan(input: {
  source: DocumentScan["source"];
  documentType?: DocumentType;
  pages: ScanPage[];
  title?: string;
}): DocumentScan {
  const now = new Date().toISOString();
  const combined = input.pages.map((p) => p.dataUrl).join("|").slice(0, 20000);
  const scan: DocumentScan = {
    id: newId("scan"),
    createdAt: now,
    updatedAt: now,
    title: input.title ?? defaultTitle(input.documentType ?? "other"),
    documentType: input.documentType ?? "other",
    status: "uploaded",
    reviewStatus: "unreviewed",
    source: input.source,
    pages: input.pages,
    fileHash: hashDataUrl(combined),
    events: [
      {
        id: newId("evt"),
        eventType: "created",
        title: "Document uploaded",
        createdAt: now,
        createdBy: "You",
      },
    ],
  };
  saveScan(scan);
  return scan;
}

export function defaultTitle(type: DocumentType) {
  const base = type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const stamp = new Date().toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
  return `${base} · ${stamp}`;
}

// -- Duplicate detection ----------------------------------------------------

export function findDuplicateCandidates(scan: DocumentScan): DocumentScan[] {
  return listScans().filter((s) => {
    if (s.id === scan.id) return false;
    if (s.fileHash && s.fileHash === scan.fileHash) return true;
    const a = s.extraction ?? s.reviewed;
    const b = scan.extraction ?? scan.reviewed;
    if (!a || !b) return false;
    if (a.transactionReference && a.transactionReference === b.transactionReference) return true;
    if (a.documentNumber && a.documentNumber === b.documentNumber) return true;
    if (a.totalAmount && a.totalAmount === b.totalAmount && a.documentDate && a.documentDate === b.documentDate) return true;
    return false;
  });
}

// -- Events -----------------------------------------------------------------

export function pushEvent(scan: DocumentScan, evt: Omit<ScanEvent, "id" | "createdAt">) {
  const next: DocumentScan = {
    ...scan,
    events: [
      ...scan.events,
      { ...evt, id: newId("evt"), createdAt: new Date().toISOString() },
    ],
  };
  saveScan(next);
  return next;
}

// -- Approval → Business Memory --------------------------------------------

export function approveScan(scan: DocumentScan, reviewed: ScanExtraction, approvedBy = "You"): ApprovedRecord {
  const now = new Date().toISOString();
  const record: ApprovedRecord = {
    id: newId("rec"),
    reference: `SC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    conversationId: scan.id, // link back to scan via conversationId slot
    approvedAt: now,
    approvedBy,
    data: toExtraction(reviewed),
    sourceText: reviewed.rawText ?? "",
    sourceType: scan.source === "demo" ? "demo" : "upload",
  };
  // Persist in the existing approved-records store so Business Memory + AI
  // Assistant see it — no duplicate system.
  const approvedKey = "frebob.approvedRecords.v1";
  const existing = safeReadArray<ApprovedRecord>(approvedKey);
  window.localStorage.setItem(approvedKey, JSON.stringify([...existing, record]));

  // Create a tiny conversation stub so the existing memory card can deep-link
  // to a page that already understands `conversationId`.
  saveConversation({
    id: scan.id,
    createdAt: scan.createdAt,
    sourceType: "upload",
    fileName: scan.pages[0]?.fileName,
    language: "auto",
    text: reviewed.rawText ?? "(Scanned document)",
    status: "approved",
    edited: record.data,
    approvedRecordId: record.id,
    processingMode: scan.processingMode,
  });

  const next: DocumentScan = {
    ...scan,
    reviewed,
    status: "approved",
    reviewStatus: "approved",
    approvedRecordId: record.id,
  };
  const saved = pushEvent(next, {
    eventType: "approved",
    title: "Approved and saved to Business Memory",
    description: `Reference ${record.reference}`,
    createdBy: approvedBy,
  });
  saveScan(saved);
  return record;
}

export function rejectScan(scan: DocumentScan, reason: string) {
  const next: DocumentScan = { ...scan, status: "rejected", reviewStatus: "rejected", rejectionReason: reason };
  const saved = pushEvent(next, {
    eventType: "rejected",
    title: "Rejected",
    description: reason,
    createdBy: "You",
  });
  saveScan(saved);
  return saved;
}

export function saveDraft(scan: DocumentScan, reviewed: ScanExtraction) {
  const next: DocumentScan = { ...scan, reviewed, status: "draft", reviewStatus: "in_progress" };
  const saved = pushEvent(next, {
    eventType: "draft_saved",
    title: "Draft saved",
    createdBy: "You",
  });
  saveScan(saved);
  return saved;
}

// -- Mapping to Business-Memory Extraction shape ---------------------------

function toExtraction(r: ScanExtraction): Extraction {
  return {
    event_type: mapEvent(r.documentType),
    language: "auto",
    customer: {
      name: r.customerName ?? r.supplierName ?? r.merchantName ?? null,
      phone: r.phone ?? null,
    },
    items: r.lineItems.length
      ? r.lineItems.map((li) => ({
          product_name: li.productName,
          variant: li.variant,
          quantity: li.quantity,
          unit_price: li.unitPrice,
        }))
      : [{ product_name: null, variant: null, quantity: null, unit_price: null }],
    total_amount: r.totalAmount,
    amount_paid: r.amountPaid,
    balance: r.outstandingBalance,
    payment_status:
      r.amountPaid == null || r.totalAmount == null ? "unknown" :
      r.amountPaid <= 0 ? "unpaid" :
      r.amountPaid >= r.totalAmount ? "paid" : "partially_paid",
    order_status: r.documentType === "customer_order" ? "pending"
      : r.documentType === "sales_receipt" ? "completed"
      : "unknown",
    delivery_or_pickup: r.deliveryNote ?? null,
    internal_note: r.notes ?? `Source: ${r.documentType.replace(/_/g, " ")}`,
    missing_fields: r.missingFields,
    needs_confirmation: r.needsReview,
    confidence: r.confidence,
  };
}

function mapEvent(t: DocumentType): Extraction["event_type"] {
  switch (t) {
    case "sales_receipt": return "sale_order";
    case "supplier_invoice": return "sale_order";
    case "customer_order": return "reservation";
    case "transfer_confirmation":
    case "pos_receipt": return "payment";
    default: return "unknown";
  }
}

function safeReadArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

// -- Financial validation helpers ------------------------------------------

export function validateExtraction(e: ScanExtraction): string[] {
  const warnings: string[] = [];
  for (const li of e.lineItems) {
    if (li.quantity != null && li.unitPrice != null) {
      const calc = li.quantity * li.unitPrice;
      if (li.lineTotal != null && Math.abs(li.lineTotal - calc) > 1) {
        warnings.push(`Line total for "${li.productName ?? "item"}" (${li.lineTotal}) does not match qty × price (${calc}).`);
      }
    }
    if (li.quantity != null && li.quantity <= 0) warnings.push(`Quantity must be greater than zero for "${li.productName ?? "item"}".`);
    if (li.unitPrice != null && li.unitPrice < 0) warnings.push(`Unit price cannot be negative for "${li.productName ?? "item"}".`);
  }
  const calcSubtotal = e.lineItems.reduce(
    (s, li) => s + (li.lineTotal ?? (li.quantity ?? 0) * (li.unitPrice ?? 0)), 0,
  );
  if (e.subtotal != null && calcSubtotal > 0 && Math.abs(calcSubtotal - e.subtotal) > 1) {
    warnings.push(`Calculated subtotal (${calcSubtotal}) does not match extracted subtotal (${e.subtotal}).`);
  }
  if (e.totalAmount != null && e.totalAmount < 0) warnings.push("Total amount cannot be negative.");
  if (e.amountPaid != null && e.amountPaid < 0) warnings.push("Amount paid cannot be negative.");
  if (e.totalAmount != null && e.amountPaid != null && e.amountPaid > e.totalAmount + 1) {
    warnings.push("Amount paid is greater than total — review this document.");
  }
  if (e.outstandingBalance != null && e.outstandingBalance < 0) warnings.push("Outstanding balance cannot be negative.");
  if (e.totalAmount != null && e.amountPaid != null) {
    const calcBalance = Math.max(e.totalAmount - e.amountPaid, 0);
    if (e.outstandingBalance != null && Math.abs(calcBalance - e.outstandingBalance) > 1) {
      warnings.push(`Scanned balance (${e.outstandingBalance}) differs from total − paid (${calcBalance}). Review before approving.`);
    }
  }
  return warnings;
}

export function emptyExtraction(type: DocumentType, rawText = ""): ScanExtraction {
  return {
    documentType: type,
    businessName: null, customerName: null, supplierName: null, merchantName: null,
    phone: null, documentNumber: null, transactionReference: null,
    documentDate: null, documentTime: null,
    currency: "₦",
    subtotal: null, discount: null, tax: null, deliveryFee: null,
    totalAmount: null, amountPaid: null, outstandingBalance: null,
    paymentMethod: null, bankName: null, terminalId: null,
    senderName: null, recipientName: null, expenseCategory: null,
    deliveryNote: null, notes: null,
    lineItems: [],
    rawText,
    missingFields: [],
    needsReview: true,
    confidence: "missing_information",
  };
}

// -- Demo scan --------------------------------------------------------------

export const DEMO_SCAN_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='560' viewBox='0 0 420 560'>
    <rect width='420' height='560' fill='#fff8f0'/>
    <text x='30' y='60' font-family='monospace' font-size='22' fill='#111'>ALABA SMART ELECTRONICS</text>
    <text x='30' y='90' font-family='monospace' font-size='14' fill='#333'>Receipt #INV-4471</text>
    <text x='30' y='115' font-family='monospace' font-size='14' fill='#333'>Date: 12/03/2026    Time: 14:22</text>
    <line x1='30' y1='135' x2='390' y2='135' stroke='#333'/>
    <text x='30' y='165' font-family='monospace' font-size='14'>Samsung A15 128GB   x2    N185,000</text>
    <text x='30' y='190' font-family='monospace' font-size='14'>Oraimo Power Bank   x1    N 12,500</text>
    <text x='30' y='215' font-family='monospace' font-size='14'>USB-C Cable         x3    N  3,000</text>
    <line x1='30' y1='240' x2='390' y2='240' stroke='#333'/>
    <text x='30' y='270' font-family='monospace' font-size='16'>Subtotal:            N 382,500</text>
    <text x='30' y='300' font-family='monospace' font-size='16'>Amount Paid:         N 300,000</text>
    <text x='30' y='330' font-family='monospace' font-size='16'>Balance:             N  82,500</text>
    <text x='30' y='370' font-family='monospace' font-size='14'>Customer: Amaka Okafor</text>
    <text x='30' y='390' font-family='monospace' font-size='14'>Phone: +234 803 555 0912</text>
    <text x='30' y='430' font-family='monospace' font-size='12' fill='#555'>Thank you for your business.</text>
  </svg>`);
