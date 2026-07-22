# Batch 13 — Demo Data & Guided Product Tour

Scope: add a self-contained demo experience and guided tour on top of existing FreBob. No changes to core business logic.

## Approach: local demo dataset (not a separate Supabase business)

All existing stores (`orders-store`, `customers-store`, `records-store`, `scanner-store`, `notifications-store`, `user-products-store`, `inventory-events-store`, `duplicates-store`) are localStorage-backed. That makes a **deterministic in-memory demo seed** the safest, most reliable path — no schema changes, no RLS risk, no cross-business leakage.

- New `src/lib/demo/` module holds fixed seed data for **Amaka Style Hub** (Enugu, fashion retail + tailoring).
- Enabling demo mode: swaps every store's namespace to a `frebob-demo:*` localStorage prefix and seeds it if empty. Exiting restores the real namespace untouched.
- Reset = wipe demo namespace + re-seed from the deterministic source.
- Flag `demo_mode_enabled` in localStorage + a lightweight `DemoContext` provider.

No new tables. Real user data is never read or written while in demo mode.

## Seed contents (deterministic, fixed dates relative to a `demoNow`)

- 15 products (Ankara, ready-made, tailoring services) — mix of in/low/out/reserved
- 10 customers (Adaeze Nwosu, Chinedu Okafor, …) + 1 duplicate pair
- 16 orders across all statuses; totals reconcile
- 12 payments (cash/transfer/POS), including multi-payment orders
- 10 inventory events consistent with final stock
- 6 Business Memory records (approved)
- 6 conversations (en, pcm, yo, ha, ig) — 3 extraction-ready but **not** auto-approved
- 5 scanner documents with pre-computed extractions (fallback data)
- 10 notifications (mixed read/unread, priorities)
- 30 days of report activity derived from orders/payments

Integrity check runs after seed; blocks "ready" if totals don't reconcile.

## Demo entry points

1. `/auth`, `/signin`, `/signup` — "Explore Demo" button below primary CTAs
2. Onboarding — skip link → demo
3. Empty states across Inventory / Orders / Customers / Reports / Notifications / Scanner / AI Assistant → "Try Demo"
4. Profile menu → "Enter Demo Mode"
5. Help menu in AppShell → "Explore Demo" + "Start Product Tour"

## Demo Mode Banner

Persistent, non-blocking, soft-purple bar under the app header:
`Demo Mode — You're exploring Amaka Style Hub. Changes won't affect real data.`
Actions: **Start Tour · Reset Demo · Exit Demo**. Confirm dialogs for reset/exit.

## Guided Tour

Custom lightweight tour (no new heavy dep) — a `<GuidedTour>` provider with:
- Steps target elements via `data-tour="dashboard-metrics"` etc.
- Tooltip positioned with Floating UI patterns (already have Radix; I'll use a small custom positioner to avoid a new dep) or add `@floating-ui/react` if needed.
- Back / Next / Skip / Progress (e.g. 3 of 13), keyboard nav, focus trap, respects `prefers-reduced-motion`.
- Missing target → skip silently, warn in dev.
- Completion persisted in `localStorage` (`frebob:tour_completed_v1`); auto-starts once for new users in demo mode.
- Restart from Help / Profile menu.

13 steps as specified: Welcome → Dashboard → Add Record → AI Extraction → Human Review → Business Memory → Inventory → Orders/Payments → Customers → Scanner → Reports → AI Assistant → Finish.

## Contextual first-use hints

Small dismissible `<ContextualHint>` with "Got it" / "Don't show again" for first Inventory, AI question, Scan, Report, Approval, Language change. Dismissal stored per-key in localStorage.

## Fallbacks (presentation reliability)

- **AI Copilot**: if Gemini call fails while in demo mode, return pre-baked answer keyed by the suggested question, labelled *"Prepared demo answer — live AI unavailable."*
- **YarnGPT**: if audio fetch fails, show `Audio unavailable right now. The text response is still available.` For English demo answer, ship one cached WAV as an ultimate fallback (best-effort; if generation isn't possible offline we surface the honest message).
- **Scanner**: demo scans use their pre-computed extractions directly, labelled *"Showing prepared demo extraction."*

## Files

### New
- `src/lib/demo/seed.ts` — deterministic seed data (products, customers, orders, payments, events, memory, conversations, scans, notifications)
- `src/lib/demo/mode.ts` — enable/disable/reset, namespace swap for all stores, integrity checks
- `src/lib/demo/context.tsx` — `DemoProvider` + `useDemo()` hook
- `src/lib/demo/fallback-answers.ts` — canned AI answers for suggested questions
- `src/components/demo/DemoModeBanner.tsx`
- `src/components/demo/EnterDemoButton.tsx`
- `src/components/demo/ExitDemoDialog.tsx`
- `src/components/demo/ResetDemoDialog.tsx`
- `src/components/demo/DemoBadge.tsx`
- `src/components/demo/DemoFallbackNotice.tsx`
- `src/components/tour/GuidedTour.tsx` (provider + engine)
- `src/components/tour/TourTooltip.tsx`
- `src/components/tour/TourLauncher.tsx`
- `src/components/tour/tour-steps.ts`
- `src/components/tour/ContextualHint.tsx`
- `src/routes/demo.tsx` — landing / launcher for `?demo=1` deep link

### Modified (minimal, additive)
- Each store file (`orders-store`, `customers-store`, `records-store`, `scanner-store`, `notifications-store`, `user-products-store`, `inventory-events-store`, `duplicates-store`, `business-settings-store`): swap the localStorage key through a `getNamespace()` helper that reads demo mode. Non-breaking; real data key unchanged when not in demo.
- `src/routes/__root.tsx` — wrap with `DemoProvider` + `GuidedTourProvider`; render `DemoModeBanner`.
- `src/components/nav/AppShell.tsx` — add `data-tour` anchors + Help menu with "Start Tour / Explore Demo".
- `src/routes/signin.tsx`, `signup.tsx`, `auth.tsx` — add Explore Demo button.
- `src/routes/onboarding.tsx` — Skip → demo link.
- `src/routes/dashboard.tsx` — `data-tour` anchors; auto-start tour on first demo entry.
- `src/routes/profile.tsx` — Enter/Exit Demo, Start Tour entries.
- Inventory / Orders / Customers / Reports / Notifications / Scanner / AI Assistant routes — empty-state "Try Demo" CTA + `data-tour` anchors.
- `src/lib/copilot.functions.ts` + `src/routes/ai-assistant.tsx` — fallback path when demo mode + AI error.
- `src/components/audio/ListenButton.tsx` / `YarnAudioPlayer.tsx` — surface honest fallback message on error.

## Out of scope (as specified)

New tables, live WhatsApp/SMS/email, billing, offline mode, new business modules. Existing `businesses.is_demo` column stays untouched — the local-namespace approach doesn't need it.

## Risks / assumptions

- Assumes local-namespace isolation is acceptable in place of a separate demo business row. This preserves RLS trivially (no writes to real tables during demo).
- Cached YarnGPT audio: if we can't pre-generate a WAV in-repo, the "audio fallback" is the honest text message rather than a bundled file. I'll attempt one cached English clip; if size/pipeline blocks it, we ship the text fallback only and note the limitation.
- Tour uses a small custom positioner to avoid adding a driver.js/shepherd dep. If positioning proves fiddly on mobile, I'll add `@floating-ui/react` (single small dep).

Ready to build on approval.
