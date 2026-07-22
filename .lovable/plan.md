Two parallel tracks, shipped as separate batches. Track A goes first (bigger blast radius), Track B follows immediately after.

## Track A — Multi-business data architecture

Goal: every user has one or more private business workspaces; Demo is fully sandboxed; no cross-business bleed anywhere (DB, stores, AI, dashboard).

### A1. Schema — memberships & business scoping
- Add `business_members(user_id, business_id, role)` with unique `(user_id, business_id)`; `role` is `owner|admin|member`.
- Backfill existing `businesses.owner_id` rows into `business_members` as `owner`.
- New security-definer helpers: `is_business_member(_business_id)`, `current_business_id()` (reads a per-request GUC or falls back to the user's first membership).
- Rewrite every RLS policy on `approved_records`, `conversations`, `customers`, `products`, `orders`, `payments`, `notifications`, `inventory_events`, `scans`, `scan_conversions`, `duplicate_reviews`, `order_status_overrides`, `audio_cache`, `settings_audit` to filter by `is_business_member(business_id)` instead of owner-only checks.
- Add missing `business_id` FKs on any table that stores per-business rows but currently keys off `user_id` only.
- Preserve existing GRANTs; keep `service_role` grants intact.

### A2. Client business context
- Refactor `useCurrentBusiness`:
  - Load all memberships for the signed-in user.
  - Persist `activeBusinessId` in `localStorage` (`frebob.activeBusinessId`), fallback to first membership.
  - Expose `businesses[]`, `switch(businessId)`, `create(businessInput)`.
- New `<BusinessSwitcher />` in the app shell header (compact chip → dropdown).
- Business Setup now calls a `createBusinessWorkspace` server fn that inserts the row + membership atomically and sets it active.

### A3. Store isolation (Demo vs real)
- Namespace every `frebob.*` localStorage key by active business id: `frebob.<businessId>.<key>`. Demo uses reserved id `demo`.
- Update all 15+ stores (`orders-store`, `customers-store`, `expenses-store`, `notifications-store`, `inventory-events-store`, `scan-conversions-store`, `duplicates-store`, `order-extras-store`, `scanner-store`, `records-store`, `user-products-store`, `business-settings-store`, `demo-conversations`, `copilot-context`, `reporting/service`) to derive the storage key from the active business.
- Rework `lib/demo/mode.ts`: entering demo switches active business to `demo` and seeds only that namespace; exiting switches back to the previous real business. No more `frebob-real-backup:` copy — real data stays untouched under its own namespace.
- Demo edits are session-only: on exit, `demo` namespace is wiped and re-seeded on next entry.

### A4. AI + dashboard scoping
- `copilot-context` and `copilot.functions` receive `businessId` from the client and filter every query/read by it. Server fns using `requireSupabaseAuth` verify membership before responding.
- `assessBusinessHealth`, reporting service, and Business Memory reads switch to the active-business namespace/rows.
- Dashboard: remove any mock preloads for empty real businesses; render `IntelligentEmptyState` CTAs (Add customer / Create order / Add inventory / Scan / Chat with Bob) when the active business has zero rows.

### A5. Verification
- Sign-in as User A, create biz → sign-in as User B → confirm zero visibility.
- Enter Demo → make edits → exit → real workspace untouched; re-enter → seed reset.
- Create second business for one user → switcher swaps dashboard, memory, Bob context.
- `supabase--linter` + targeted `read_query` policy checks.

## Track B — Form validation sweep (RHF + Zod)

Goal: every user-facing form uses `react-hook-form` + `zod`, with inline red errors and a green success hint per field once valid.

### B1. Shared primitives
- `bun add react-hook-form @hookform/resolvers zod` (zod already present in some places — confirm).
- New `src/components/fb/Field.tsx`: label, description, control slot, `FormMessage` (error) and `FormHint` (green check + text when `isDirty && !error`).
- New `src/lib/validation/schemas.ts`: shared zod schemas (phone NG, email, currency amount, non-empty trimmed string, sku, url, quantity ≥ 0, etc.).

### B2. Forms migrated (all switch to RHF + Zod + Field)
- Auth: `signin`, `signup`, `auth` (OTP)
- Business setup (all 3 steps) + `settings.business`
- Customers: `customers.new`, `customers.$id.edit`
- Records: `records.manual`, `conversations.new`, `add-record` voice metadata
- Orders: order-item editor on `orders.$id`, `orders.$id.payment` (amount/kind/proof)
- Inventory: add-product form (`components/inventory/*` and `user-products-store` inputs)
- Expenses: expense form
- Scanner: metadata capture on `scanner.new`
- Profile + Settings

### B3. UX rules
- Validate on blur, revalidate on change after first submit attempt.
- Error text uses `text-destructive`; success uses green success token from Phase 1 tokens with a small check icon.
- Submit button `aria-busy` while pending; disabled only when `!isValid` after first submit.

## Delivery order

1. Track A migration (needs approval) → wait → land A2–A5 code.
2. Track B in the next batch: shared primitives → forms in the order above.

## Notes / trade-offs

- Namespacing localStorage by business is invasive but avoids a schema-per-store rewrite; real DB tables already have `business_id`. Existing users' local caches will be re-seeded on next load (no data loss — canonical data lives in Supabase).
- Full multi-business is scoped to owner + member roles only for now; admin UI for invites is out of scope for this batch (schema supports it).

Reply "go" to start with Track A's migration.