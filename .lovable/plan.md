
# FreBob Design System — Phased Plan

Rolling the full spec out in 5 reviewable phases. Each phase ships independently so you can check the preview and course-correct before the next batch. I'll start **Phase 1** immediately after you approve.

## Phase 1 — Design Tokens (this batch)

Formalize every reusable value in `src/styles.css` so the rest of the phases have a single source of truth.

- **Spacing**: 8-point scale tokens `--space-1..--space-24` (4, 8, 12, 16, 24, 32, 40, 48, 64, 96).
- **Type scale**: `--text-display`, `--text-h1..h4`, `--text-body-lg`, `--text-body`, `--text-small`, `--text-caption` with matching line-heights; max measure 75ch utility.
- **Radii**: keep existing `--radius-*`, add `--radius-pill`.
- **Shadows / elevation**: `--shadow-xs..--shadow-xl` (existing elegant/card/soft folded in).
- **Motion**: `--duration-fast/base/slow`, `--ease-standard/emphasized`, `@media (prefers-reduced-motion)` global override.
- **Semantic status**: confirm success/warning/error/info tokens + `-foreground` pairs pass WCAG AA on white and on tinted surfaces.
- **Breakpoints**: document 320 → 2560 as CSS custom media; Tailwind v4 handles the utilities.
- **Focus ring**: single `--ring` treatment (2px + 2px offset) as a `@utility focus-ring`.

## Phase 2 — Core Components + States

Standardize every primitive with the full state matrix (default / hover / active / focus-visible / disabled / loading / error).

- Button, Input, Select, Textarea, Field (already partial) → all states, min 44×44 tap target.
- Card, Badge, Alert, Tooltip, Toast, Dialog, Drawer, Tabs, Accordion.
- New primitives: `Skeleton`, `EmptyState` (unify with existing `IntelligentEmptyState`), `LoadingState`, `ErrorState` with retry + support link.
- Icon-only buttons: enforce `aria-label` via a lint pass.

## Phase 3 — Accessibility + Responsive Sweep (WCAG 2.2 AA)

- Contrast audit against new tokens; fix any subtle text on white.
- Keyboard nav + visible focus on every interactive element.
- Skip-to-content link in `AppShell`.
- Tap targets ≥ 44×44 on mobile bottom nav, chips, icon buttons.
- Sweep all routes at 320, 375, 414, 768, 1024, 1440, 1920 — no horizontal scroll, no clipped text, use `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` pattern for header rows.
- `prefers-reduced-motion` respected by tour, carousel, frustration reel.
- Semantic landmarks: one `<main>`, proper heading order per route.

## Phase 4 — Per-Screen Polish

Applied in priority order (I'll ask you to confirm/reorder before starting):
Dashboard → Bob chat → Add Record + voice → Orders detail (tabs) → Reports (Sales/Expenses/Profit/Inventory/Customer) → Inventory → Customers → Scanner → Business Memory → Settings/Profile → Auth/Onboarding → Landing.

Each screen gets: empty state, skeleton loader, error state with retry, real-time form validation with preserved input, evidence/confidence surfacing where AI is involved.

## Phase 5 — QA + Release Checklist

- Automated: typecheck, lint, build.
- Manual: responsive matrix, keyboard-only pass, screen-reader spot-check (VoiceOver), Lighthouse a11y ≥ 95 on key routes.
- Living checklist committed to `docs/DESIGN-QA.md`.
- Offline UX: queued action banner + retry (uses existing stores).

## Out of scope (call out explicitly)

- Dark mode (spec says "future") — tokens will be dark-mode-ready but no theme shipped.
- Biometrics, device management — flagged future.
- Backend/business-logic changes — none; this is presentation only.

## Deliverable for Phase 1

One PR-sized change to `src/styles.css` plus a short `docs/DESIGN-TOKENS.md` reference. No component rewrites yet, no visual regressions expected — existing utilities (`brand-gradient`, `glass-card`, `shadow-elegant`, `shadow-card`) keep working.

Approve and I'll ship Phase 1 now.
