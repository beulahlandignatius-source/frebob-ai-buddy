
# Batch 8A — Reports & Business Insights

Rebuild `/reports` on top of the real operational stores (orders, payments, customers, products, inventory events, scans) using the principle: **"Operational records calculate the numbers. AI explains the numbers."**

## Scope

Replace the current mock-data reports screen with a tabbed reporting module driven by a single shared analytics service. Keep dashboard, notifications shell, and all other modules untouched except for wiring dashboard tiles into the same service.

## New files

- `src/lib/reporting/period.ts` — date-range presets (Today, Yesterday, This/Last week, This/Last month, Last 30 days, Custom) + comparison-period resolver + Africa/Lagos formatting.
- `src/lib/reporting/service.ts` — the single source of truth. Pure functions over existing stores:
  - `getSalesReport(range)` — totals, trend series, sales-by-product, sales-by-day.
  - `getPaymentsReport(range)` — totals, method breakdown, trend, outstanding balances per customer.
  - `getOrdersReport(range)` — status counts, completion/cancellation rate, orders-by-day, delayed orders.
  - `getInventoryReport(range)` — stock status counts, top sellers, slow movers, movements from `inventory-events-store`.
  - `getCustomersReport(range)` — new / repeat / returning, top customers, outstanding, dormant.
  - `getOverview(range, compare)` — 6 headline metrics + comparison values + direction.
  - Shared exclusions: cancelled orders excluded from sales, reversed payments excluded, merged-duplicate customers excluded, drafts/rejected scans excluded.
- `src/lib/reporting/ai-insights.functions.ts` — `createServerFn` that receives already-computed metrics + selected language and asks Lovable AI (Gemini 2.5 flash) to write a plain-language summary. Server fn never touches raw records; if metrics are empty it returns the "not enough approved records" copy without calling the model.
- `src/components/reports/` — shared UI primitives:
  - `DateRangeBar.tsx` (range + compare + refresh + last-updated stamp)
  - `MetricCard.tsx` (label, value, comparison line, direction chip, drill link)
  - `TrendChart.tsx`, `BarCompareChart.tsx`, `StatusDonut.tsx`, `RankBar.tsx` — thin wrappers over recharts with title, empty/loading/error states, ₦ formatting, accessible text summary.
  - `ReportTable.tsx` — sortable, paginated, mobile-cards fallback.
  - `TabsBar.tsx` — horizontally scrollable tabs on mobile.

## Route changes

- `src/routes/reports.tsx` — becomes the Reports shell: header, `DateRangeBar`, tabs (Overview / Sales / Payments / Orders / Inventory / Customers / AI Insights). Tab state stored in URL search params (`tab`, `from`, `to`, `preset`, `compare`) via TanStack search validation so drill-downs preserve context.
- Each tab is a component in `src/components/reports/tabs/` (OverviewTab, SalesTab, PaymentsTab, OrdersTab, InventoryTab, CustomersTab, AIInsightsTab).
- Drill-downs use `<Link>` to `/orders`, `/customers`, `/inventory`, `/customers/$id`, etc., passing filter query params where those routes already support them; otherwise link to the entity page unchanged.

## Dashboard integration

- Update `src/routes/dashboard.tsx` today-tiles (sales / received / outstanding / pending / low-stock / new customers) to call the same `reporting/service.ts` with a `Today` range so numbers cannot diverge from `/reports`. No visual overhaul.

## Data rules encoded once

- `valid_sales` = sum of non-cancelled order totals in range.
- `money_received` = sum of non-reversed payments in range.
- `outstanding_current` = Σ max(order_total − paid, 0) across all open orders (not range-bound); `outstanding_created_in_period` reported separately and clearly labelled.
- Percentage change guarded against zero previous — shows "No sales were recorded in the comparison period." No infinite growth.
- Inventory value hidden with the required message when cost coverage is incomplete.

## Notifications hook

- Add a small helper `src/lib/reporting/alerts.ts` used by the existing notifications page to surface: unusual outstanding, low stock on top sellers, many pending orders, no sales in period, approved records awaiting conversion. No new notification UI — reuses the existing shell.

## Explicitly out of scope (kept for later batches)

- CSV / PDF export (export button remains a "coming soon" placeholder).
- Saved report views / advanced filter management.
- Server-side cached summary tables — everything computed client-side from existing stores; documented in `service.ts` header so 8B can add caching without breaking callers.

## Technical notes

- All stores are localStorage-backed; no Supabase schema changes needed for 8A.
- AI insight route uses existing `LOVABLE_API_KEY` and follows the same server-fn pattern as `copilot.functions.ts` / `extraction.functions.ts`.
- Multilingual insights reuse the language preference already on `profiles.preferred_language`; the prompt instructs Gemini to preserve ₦ amounts, dates, names, and order numbers verbatim.
