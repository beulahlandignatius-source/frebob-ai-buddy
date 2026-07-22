# FreBob v1.0.0 — Hackathon MVP Release

**Release date:** 2026-07-22
**Stack:** TanStack Start (Vite) on Lovable hosting · Lovable Cloud (Supabase) · Gemini via Lovable AI Gateway · YarnGPT TTS

---

## 1. Production URLs

| Purpose | URL |
|---|---|
| Production app | Set after Publish (`*.lovable.app` or custom domain) |
| Preview | `https://id-preview--0aef0da9-422a-4490-b4b4-a1b574223778.lovable.app` |
| Demo entry | `/signin` → **Explore Demo Business** |
| Presentation | `/dashboard` (in Demo Mode) |
| Admin (hidden) | `/admin/yarngpt` (admin role required) |

---

## 2. Environment Variables

Managed by Lovable Cloud — **never commit `.env`**.

**Frontend-safe (VITE_ prefix):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Server-only secrets (stored in Cloud Secrets):**
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` (Gemini + connectors, auto-provisioned)
- `YARNGPT_API_KEY`

No secret is prefixed `VITE_`, `NEXT_PUBLIC_`, or `PUBLIC_`. Verified: no API keys in frontend source.

---

## 3. Database (Supabase / Lovable Cloud)

**Tables with RLS enabled:** `profiles`, `businesses`, `user_roles`, `audio_cache`, `yarngpt_voice_status`, `settings_audit`.

**Auth-scoped policies:** all policies use `auth.uid()`; no anon writes on business data. Admin gate via `public.has_role(uuid, app_role)` (SECURITY DEFINER, `service_role` execute only).

**Migrations:** applied through `supabase--migration` in earlier batches; production schema matches preview.

---

## 4. AI & Integrations

- **Gemini** — via Lovable AI Gateway using `LOVABLE_API_KEY`. Server-only; used in `extraction.functions.ts`, `copilot.functions.ts`, `scanner-extraction.functions.ts`, `reporting/ai-insights.functions.ts`.
- **YarnGPT** — server-only in `yarngpt.functions.ts` + `yarngpt.server.ts`. PII scrub, 2000-char chunking, per-user rate limit, cached audio in `audio_cache`. Pidgin is text-only (documented in UI).
- **Scanner** — Gemini vision extraction; review-before-approve; idempotent conversion.

---

## 5. Auth

- Email/OTP + phone mock, Google (via Supabase provider when configured).
- HIBP leaked-password check enabled (Batch 14).
- Redirects: `/signin`, `/signup`, `/onboarding`, `/business-setup`, `/dashboard`.
- Unauthenticated users cannot reach protected routes (guarded in loaders/components).

---

## 6. Demo Mode

- LocalStorage snapshot/restore (`src/lib/demo/mode.ts`).
- Amaka Style Hub seed (`src/lib/demo/seed.ts`).
- 13-step guided tour + contextual hints.
- Prepared AI fallback answers (`src/lib/demo/fallback-answers.ts`).
- Reset + Exit Demo restore prior state cleanly.

---

## 7. Smoke Test Checklist (run on the live URL after Publish)

- [ ] Sign up / sign in / sign out
- [ ] Onboarding → business setup → dashboard
- [ ] Add product, adjust stock
- [ ] Create order, record payment, balance auto-updates to Paid
- [ ] Add customer, view profile with order history
- [ ] Process conversation → review extraction → approve → appears in Business Memory
- [ ] Upload scanner doc → review → approve → convert
- [ ] Reports: totals + date range
- [ ] Bob AI: ask a grounded question, verify evidence chips
- [ ] YarnGPT: play EN / YO / HA / IG; Pidgin shows text-only state
- [ ] Demo: Enter → run scenario → Reset → Exit

---

## 8. Rollback Plan

1. In Lovable → Project → Deployments, revert to the previous published build.
2. Database: no destructive migrations shipped in Batch 18. If a future migration must be reverted, use Supabase point-in-time restore (Lovable Cloud → Advanced settings).
3. Secrets: rotate `LOVABLE_API_KEY` via `lovable_api_key--rotate` if compromise suspected; rotate `YARNGPT_API_KEY` in provider dashboard and update via `update_secret`.
4. Demo: run in-app **Reset Demo** to clear seed drift.

---

## 9. Known Limitations

- Live WhatsApp / SMS ingestion not included (audio upload + manual paste supported).
- Nigerian Pidgin TTS unverified upstream — surfaced as text-only.
- Supplier management, full accounting, and forecasting out of scope for v1.0.0.
- Some non-English UI strings need native-speaker review.
- Scanner OCR accuracy varies with image quality.
- Auth uses mock OTP in preview; production sign-in relies on Supabase Auth providers.

---

## 10. Monitoring

- Frontend errors → `reportLovableError` + root `ErrorComponent` boundary.
- SSR crashes → `src/server.ts` normalises h3-swallowed errors and renders safe error page.
- Server function logs available via Lovable server-function logs.
- No sensitive payloads logged (verified in `yarngpt.server.ts` scrub + copilot functions).

---

## 11. Release Gate — All Green

- [x] Auth works, HIBP on
- [x] RLS on all sensitive tables, `auth.uid()`-scoped
- [x] No secrets in frontend / git
- [x] Production build succeeds, 0 TS errors (Batch 15)
- [x] Demo resets cleanly
- [x] Payment math + reports reconcile
- [x] Scanner storage private, review-before-approve
- [x] No critical console errors on core routes
