# Batch 7B — Scanner Record Conversion & Module Linking

Convert approved scans into orders, payments, customers, and inventory events — with previews, duplicate checks, idempotency, evidence trails, and safe reversals. Reuse the existing localStorage stores (scanner, records, orders, customers, duplicates, notifications). Nothing gets written until the user confirms.

## Data layer (`src/lib/scan-conversions-store.ts`)

New localStorage store, mirroring the pattern used by other stores.

- `ScanConversionAction` — `{ id, scanId, actionType, destinationType, destinationRecordId, status, inputSnapshot, outputSnapshot, idempotencyKey, error?, confirmedBy, confirmedAt, reversedAt? }`
  - `actionType`: `create_order | link_order | create_payment | link_payment | update_inventory | link_customer | create_customer | save_evidence`
  - `status`: `not_started | in_progress | completed | linked | failed | reversed | needs_review`
- `ScanRecordLink` — `{ id, scanId, recordType, recordId, relationshipType, actionId, createdAt }`
- `ScanConversionEvent` — audit rows tied to a scan and (optionally) an action
- Idempotency key = `sha1(scanId | actionType | destinationRecordId | attempt)` (simple hash utility, no crypto dep).
- Helpers: `suggestActions(scan)` (deterministic map by doc type), `findExistingLinks(scanId)`, `recordAction()`, `linkRecord()`, `reverseAction()`, `hasCompleted(idempotencyKey)`, `listForScan(scanId)`, `listForRecord(type,id)`.
- All writes emit a `ScanConversionEvent` for audit.

## Suggested-action mapping

Pure function inside the store, no AI call:

```
sales_receipt        → create_order, create_payment, link_customer
customer_order       → create_order, link_customer
transfer_confirmation→ create_payment, link_order
pos_receipt          → create_payment, link_order, save_evidence
supplier_invoice     → update_inventory (add), save_evidence
stock_list           → update_inventory (correction)
expense_receipt      → save_evidence
handwritten_note     → gated by extracted fields; require review flag
```

Cards render as disabled with an explanation when the target module or approved data is missing.

## Screen 1 — Action Centre (extend `/scanner/$scanId`)

Add a "What would you like to do with this document?" section under the approved header:
- Grid of `SuggestedActionCard`s (title, explanation, destination, impact, status pill, CTA).
- Chip row summarising conversion status: `Not converted / In progress / Partially converted / Converted / Linked / Failed / Needs review`.
- New "Related records" panel listing every `ScanRecordLink`: type, name/number, status, created date, "View" button, "Unlink" (safe reversal only).
- "History" collapsible showing conversion events for this scan.

## Screen 2 — Focused conversion routes

One route per action type (each keeps a single job simple):

- `/scanner/$scanId/convert/order` — Create Order From Scan (Workflow A)
- `/scanner/$scanId/convert/link-order` — Link to Existing Order (B)
- `/scanner/$scanId/convert/payment` — Record Payment From Scan (C)
- `/scanner/$scanId/convert/link-payment` — Link to Existing Payment (D)
- `/scanner/$scanId/convert/inventory` — Prepare Inventory Update (E)
- `/scanner/$scanId/convert/customer` — Link or Create Customer (F)

Every route shows: approved document summary card, selected action, destination, duplicate warnings, editable preview, Confirm/Cancel. Uses existing form primitives (`fb/Input`, `fb/Button`, `PageCanvas`, `SurfaceHeader`).

### Workflow A — Create order
- Prefill customer, date, line items, prices, paid, balance from scan extraction.
- Customer matcher reuses `customers-store` + `duplicates-store` (Select existing / Review possible match / Create new / Continue without).
- Line-item table: each row = scanned name → suggested product (from `mock-data.inventory`) → link/search/create/keep unlinked/remove.
- Duplicate check: same reference #, customer, date, total, line items, source scan → shows "similar order may exist" panel with View / Link scan / Continue / Cancel.
- Inventory impact banner explains "Pending won't reduce stock; Reserved will".
- On confirm: creates order via `orders-store.createOrder(...)`, writes `ScanConversionAction(completed)`, links via `ScanRecordLink(type=order)`.

### Workflow B — Link to existing order
Search orders by number/customer/date/amount/balance. Show matching + conflicting fields side-by-side. Only writes a `ScanRecordLink(relationshipType=evidence)`; no order mutation. Option "Review order changes" opens a separate confirm before applying edits.

### Workflow C — Create payment
- Prefill amount, date, method, reference, related order, customer.
- Order selector: search by customer/order#/balance, or "Unallocated payment".
- Duplicate check: same tx ref + amount + date + order → warn.
- Validation: amount > 0; ≤ balance unless overpayment allowed; unique reference; not on cancelled order; same business.
- Confirmation shows current balance → payment → new balance.
- Atomic path: `recordPayment` in orders-store already updates paid/balance/status. Wrap in try/rollback: if link write fails, delete the payment.

### Workflow D — Link to existing payment
Search by tx ref/amount/date/customer/order/method. Compare fields. Evidence-only link, no value changes.

### Workflow E — Prepare inventory update
- Table: scanned name → suggested product → variant → scanned qty → current stock → proposed adj → new expected → action.
- Adjustment type: Add / Correct / Evidence only.
- Formulas rendered before confirm: `new = current + qty` or `new = confirmed_count`.
- Duplicate check: same scan already converted, same invoice#, same product+qty set.
- Confirm creates an `inventory_event` in a new lightweight `inventory-events-store.ts` (append-only) plus updates the in-memory product stock. Reuses existing `mock-data.inventory` snapshot.

### Workflow F — Link/Create customer
- Show extracted name/phone/email/address + `duplicates-store` matches.
- Actions: Link / Create / Skip / Review later. Creating goes through `customers-store.upsertCustomer(...)` and existing duplicate rules; profile is not overwritten silently.

## Multi-step progress
On the scan Action Centre, once ≥1 conversion exists, render a `ConversionProgressPanel` (Customer linked → Order created → Payment pending → Completed). Users can Skip / Save progress / Complete later — nothing is forced.

## Conversion summary screen
After each confirm, show a summary card inline (records created, linked, financial + inventory impact, remaining suggested actions, View buttons). No separate route needed.

## Evidence on destination pages
Small "Source Document" panel added to:
- `orders.$id.tsx` — thumbnail + doc type + "View approved scan" (queries `listForRecord('order', id)`)
- `orders.$id.payment.tsx` — same for payment (evidence card)
- `customers.$id.tsx` — "Linked from approved document" row in activity
- Inventory events surface a source scan chip

## Reversal
- Safe: unlink scan from record, reverse untouched inventory adjustment with opposite event, delete newly-created order if `status === 'pending'` and no payments, unlink customer source.
- Unsafe: message "Use the destination record's correction workflow." Evidence never deleted.

## Idempotency
Before every mutating confirm, compute the idempotency key and `hasCompleted()` → if true, show "This action has already been completed for this document" with a link.

## Dashboard + notifications
- Dashboard: add a single "Scanner ready" strip listing counts (approved-not-converted, payment docs to link, stock lists awaiting review). Click → filtered `/scanner` list.
- Notifications: extend `mock-data.notifications` seed with a `scanner` category (or reuse `system`) and push events on completion/failure via existing localStorage notification pattern — no push/SMS.

## AI Assistant integration
Extend the snapshot in `copilot-context.ts` with a `scans` summary (approved count, unconverted, pending payment/stock docs) so Bob can answer "which scans have not been converted?" grounded on real data. No new server function.

## Security / RLS
This prototype stores everything client-side, so RLS lives conceptually in helpers:
- `assertSameBusiness(scan, destination)` guard in the store; every conversion helper checks approval status and business id.
- Server-side calls (`extract-scanner`, `transcribe`, `askCopilot`) unchanged — they already keep the AI key server-side.
- No new tables this batch. When the app moves to Supabase, the three tables (`scan_record_links`, `scan_conversion_actions`, `scan_conversion_events`) plus RLS policies map directly from the store shape.

## Files touched

New:
- `src/lib/scan-conversions-store.ts` (types, suggestions, idempotency, links, events, reversal)
- `src/lib/inventory-events-store.ts` (append-only adjustments)
- `src/components/scanner/conversion.tsx` (SuggestedActionCard, ConversionStatusChip, ConversionProgressPanel, RelatedRecordsPanel, DuplicateWarning, EvidenceLink)
- `src/routes/scanner.$scanId.convert.order.tsx`
- `src/routes/scanner.$scanId.convert.link-order.tsx`
- `src/routes/scanner.$scanId.convert.payment.tsx`
- `src/routes/scanner.$scanId.convert.link-payment.tsx`
- `src/routes/scanner.$scanId.convert.inventory.tsx`
- `src/routes/scanner.$scanId.convert.customer.tsx`

Edited:
- `src/routes/scanner.$scanId.tsx` — Action Centre + Related records + History
- `src/routes/orders.$id.tsx`, `orders.$id.payment.tsx`, `customers.$id.tsx` — evidence panels
- `src/routes/dashboard.tsx` — "Scanner ready" strip
- `src/lib/copilot-context.ts` — add scan snapshot fields
- `src/lib/mock-data.ts` — extend notifications with scanner category

## Verification
- `bunx tsgo --noEmit` after each store + route batch.
- Smoke test in preview: approve a demo scan → convert to order → convert to payment → check evidence panel appears on the order page → attempt duplicate conversion → confirm idempotency block.
