# Phase 5 — QA Checklist

Final verification pass for the FreBob Design System rollout. Use this before
each release. Every item is pass/fail — no partial credit.

## 1. Accessibility (WCAG 2.2 AA)

- [ ] Every route renders exactly one `<main>` landmark (provided by `AppShell`).
- [ ] Skip-link ("Skip to main content") is the first focusable element and jumps to `#main`.
- [ ] All interactive elements show a visible focus ring (`focus-ring` utility).
- [ ] Icon-only buttons have `aria-label` (Create "+", notifications, mute, replay, remove buttons).
- [ ] Color is never the sole signal for status — pair with icon or text (health tiers, payment status).
- [ ] Contrast: body text ≥ 4.5:1, large text ≥ 3:1. No `text-gray-*` or `text-white/40` on light backgrounds.
- [ ] Form inputs have associated `<label>` or `aria-label`; errors announced via `role="alert"`.
- [ ] `prefers-reduced-motion` disables auto-scroll reels, carousels, and non-essential transitions.
- [ ] Keyboard: tab order matches visual order; Escape closes sheets/dialogs; Enter/Space activate cards.

## 2. Responsive (320 → 2560px)

- [ ] 320px: bottom nav (Home | Chat | + | Inventory | Reports) fits without horizontal scroll.
- [ ] 360–430px: no content clipped by mobile chrome — verify `h-dvh` on full-height routes.
- [ ] 768–1024px: sidebar/nav transitions cleanly; forms cap at readable width.
- [ ] 1440–2560px: hero, dashboard grids, and landing sections respect max-width and don't stretch text lines beyond ~72ch.
- [ ] Tap targets ≥ 44×44 on mobile (buttons, nav icons, close/remove controls).

## 3. Design System Fidelity

- [ ] Colors come from tokens (`bg-primary`, `text-foreground`, `border-border`) — no arbitrary hex or `text-white/black`.
- [ ] Glassmorphism only on Hero, AI/Bob surfaces, and Chat — not on data tables, forms, or dashboards.
- [ ] Spacing uses 8-point scale tokens.
- [ ] Typography: Inter/Manrope; single H1 per route; heading levels never skip.
- [ ] Buttons: correct variant per intent (primary, secondary, ghost, destructive); no custom one-offs.

## 4. Core Flows (smoke test)

- [ ] Splash → Onboarding → Sign up → Business Setup (< 2 min) → Dashboard.
- [ ] Add Record → Manual, Scan, Voice Note (each saves and returns to list).
- [ ] Bob Chat: text + voice input; Business Health Check returns tiered report with Evidence section.
- [ ] Orders: create → record payment/deposit/balance/refund → status updates → attach proof.
- [ ] Expenses: create under Reports → appears in Profit Summary.
- [ ] Customers: view metrics; merge duplicates flow.
- [ ] Inventory: add product; low-stock alert surfaces on Dashboard.
- [ ] Settings: language switch translates UI; audio "Translate to English" toggle works.

## 5. States (every data-driven screen)

- [ ] Loading skeleton renders before data.
- [ ] Empty state has illustration + primary action.
- [ ] Error state offers Retry and preserves user input.
- [ ] Offline: forms queue or surface a clear "no connection" message.

## 6. Backend / Security

- [ ] RLS enabled on every `public` table; `is_business_owner()` policies verified.
- [ ] No service-role key or secrets in client bundle (`rg "SERVICE_ROLE"` on `src/`).
- [ ] Auth-required server functions use `requireSupabaseAuth`.
- [ ] Public API routes under `/api/public/*` verify signature/secret.

## 7. Performance

- [ ] Landing hero LCP < 2.5s on 4G throttled.
- [ ] No layout shift on image/video load (aspect-ratio reserved).
- [ ] Route-level code splitting: initial JS < 250KB gzipped for landing.
- [ ] Images lazy-loaded below the fold; videos use `preload="metadata"`.

## 8. SEO

- [ ] Every content route has unique `head()`: title (< 60 chars), description (< 160 chars), og:title, og:description.
- [ ] og:image + twitter:image set on leaf routes with hero imagery (absolute URLs).
- [ ] Single H1 per route; semantic landmarks (`header`, `nav`, `main`, `footer`).
- [ ] `lang` attribute on `<html>`; canonical tags where applicable.

## 9. Release Gate

- [ ] `bun run build` succeeds with zero TypeScript errors.
- [ ] `tsgo` typecheck clean.
- [ ] Manual pass on iPhone SE (375px) and Pixel 7 (412px) viewports.
- [ ] Rollback plan confirmed (previous published deployment restorable in one click).

---

**Sign-off:** Design ▢  Engineering ▢  Product ▢  Date ▢
