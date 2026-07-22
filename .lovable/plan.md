## Batch 12A + Inventory Thumbnails

### 1. Inventory thumbnails (bundled in)
- Show product image in the inventory list (small thumbnail) and product detail cards.
- Use the existing `image` field on `UserProduct` (already stored as data URL). No schema change.

### 2. Localization foundation
Install `i18next` + `react-i18next` + `i18next-browser-languagedetector`.

```
src/i18n/
  config.ts               // init, fallback=en, namespaces, detection order
  languages.ts            // { code, label, nativeLabel, audioStatus }
  locales/
    en/  common.json, auth.json, nav.json, dashboard.json, ai.json,
         inventory.json, orders.json, payments.json, customers.json,
         scanner.json, reports.json, notifications.json, settings.json,
         errors.json, audio.json, onboarding.json
    pcm/ … (same namespaces)
    yo/  … (same namespaces)
    ha/  … (same namespaces)
    ig/  … (same namespaces)
```
Semantic keys only (`inventory.empty.title`, `orders.status.pending`, …). Statuses stay stable English identifiers in code, translated at render.

### 3. Language preference
- Reuse `profiles.preferred_language` (already exists).
- Add `ai_response_language`, `audio_enabled`, `preferred_voice`, `audio_playback_speed` to `profiles` (single migration).
- Priority: user profile → business `settings.language` → browser → `en`.
- Unauthenticated onboarding falls back to localStorage; on sign-in, server value wins.

### 4. Shared multilingual/audio components (new)
`LanguageSelector`, `LanguageOption`, `TranslationFallbackNotice`, `ListenButton`, `YarnAudioPlayer`, `AudioSpeedSelector`, `VoiceSelector`, `VoicePreviewButton`, `AudioUnsupportedNotice`, `AudioGenerationError`, `MultilingualText`, `LocalizedStatusBadge`, `LocalizedCurrency`, `LocalizedDate`, `AIResponseLanguageSelector`. Reuse existing `Button`, `Input`, cards — no duplicates.

### 5. Screens wired to i18n (first pass)
Nav, dashboard, AI assistant, inventory, orders, payments, customers, scanner, reports, notifications, settings, profile, auth, onboarding — replace visible strings with `t()` calls. Business data (names, prices, refs) stays untouched.

### 6. AI Assistant multilingual
- Extend `copilot.functions.ts` to take `responseLanguage`, instruct Gemini to reply in that language, preserve names/numbers verbatim.
- Add `AIResponseLanguageSelector` in the chat header.

### 7. YarnGPT audio integration
- **Secret**: add `YARNGPT_API_KEY` to the project secrets so the value is empty until you paste it.
- **Hidden admin page**: `src/routes/_admin.yarngpt.tsx` — not linked from any nav; reachable only by typing `/-admin/yarngpt` (or similar obscure path). Shows key status (configured / not configured), lets you run a preview generation for each voice+language combo, and toggles which combos are marked `tested`. Nothing sensitive is displayed.
- **Server route**: `src/routes/api/audio/generate.ts` — `createServerFn`-style TSS route. Reads `process.env.YARNGPT_API_KEY` inside the handler, validates auth via `requireSupabaseAuth`, enforces per-user rate limit (in-memory bucket for MVP), validates language/voice against server allowlist, splits >2000-char text on sentence boundaries, calls `POST https://yarngpt.ai/api/v1/tts`, returns base64 MP3 (or signed URL if we cache in storage).
- **Caching**: `audio_cache` table keyed by `sha256(text|language|voice|format)` → base64 stored inline for MVP (small clips). Private, scoped by `business_id` via RLS. Larger clips can move to Storage later.
- **Voice mapping (server-side)**: only voices marked `tested=true` are surfaced.
  - MVP tested list (assumed until you validate in the admin page):
    - `en` → Idera (default), Emma, Zainab
    - `yo` → Wura, Femi
    - `ha` → Zainab, Umar
    - `ig` → Chinenye, Adaora
  - Pidgin (`pcm`) → **no audio**, shows `AudioUnsupportedNotice` with the exact copy from the spec.
- **Player**: reusable `YarnAudioPlayer` with play/pause/stop/replay, speed 0.75/1/1.25/1.5, aria-live status, keyboard accessible, no autoplay, stops on unmount and sign-out.
- **Listen surfaces**: AI answer bubbles, report AI summary, notification card "Listen" action, business memory approved-record summary. Never auto-plays.

### 8. Privacy
- Server strips full phone numbers, emails, bank/card digits from text before sending to YarnGPT (regex scrub → `«redacted»`).
- Disclosure line rendered in Settings → Audio.

### 9. Fallback + errors
- Missing translation key → English + dev-only console warn (never raw key on screen).
- Audio failure → keep text visible, show `AudioGenerationError` with retry.

### 10. Out of scope (per spec)
No speech-to-text, no voice commands, no autoplay, no downloadable audio, no Pidgin audio claims.

### Files summary
- **New**: 16 translation JSON files (5 langs × ~14 namespaces = ~70 small files, generated with English keys + machine-translated drafts marked `"_status": "draft"`), i18n config, ~15 shared components, admin page, audio server route, migration.
- **Modified**: nav shell, dashboard, AI assistant, inventory (+ thumbnails), orders, customers, scanner, reports, notifications, settings (audio section), profile, onboarding, auth, copilot function.
- **DB**: one migration extending `profiles` + creating `audio_cache` with RLS + grants.

### Technical notes for reviewer
- YarnGPT called only server-side via `process.env.YARNGPT_API_KEY`; never surfaced to client.
- Translations for pcm/yo/ha/ig will ship as **draft** (marked in JSON); UI works, but the spec's "native-speaker approved" bar is not met — flagged as a known limitation.
- Voice ↔ language tested map lives in `src/lib/yarngpt-config.server.ts`; the hidden admin page flips `tested` flags stored in a small `yarngpt_voice_status` table so untested combos never reach the user.
- Rate limit is in-memory per worker (spec's stated no-standard-primitive gap); documented in security memory.

Confirm and I'll build it in this order: migration → i18n scaffold → shared components → screen wiring → AI assistant → YarnGPT server route + admin page → thumbnails polish → verify.
