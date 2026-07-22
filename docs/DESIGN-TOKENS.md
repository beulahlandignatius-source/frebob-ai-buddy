# FreBob Design Tokens

Single source of truth. Never hard-code values — reference the token.
All tokens live in `src/styles.css` (`:root`) and are exposed to Tailwind v4 via `@theme inline` where relevant.

## Spacing (8-point grid)

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | 4px | Icon-to-label inline gap |
| `--space-2` | 8px | Chip padding, tight stacks |
| `--space-3` | 12px | Compact card padding |
| `--space-4` | 16px | Default card/section padding |
| `--space-6` | 24px | Section rhythm |
| `--space-8` | 32px | Page section gap (mobile) |
| `--space-10` | 40px | — |
| `--space-12` | 48px | Page section gap (desktop) |
| `--space-16` | 64px | Hero rhythm |
| `--space-24` | 96px | Landing hero rhythm |

## Typography

| Token | Value | Use |
| --- | --- | --- |
| `--text-display` | clamp 36→56px | Landing hero |
| `--text-h1` | clamp 28→36px | Page title |
| `--text-h2` | 24px | Section title |
| `--text-h3` | 20px | Card title |
| `--text-h4` | 18px | Sub-heading |
| `--text-body-lg` | 17px | Lead paragraph |
| `--text-body` | 16px | Body |
| `--text-small` | 14px | Meta, labels |
| `--text-caption` | 12px | Hints, timestamps |

Leading: `--leading-tight` 1.2, `--leading-snug` 1.35, `--leading-normal` 1.55, `--leading-relaxed` 1.7.
Measure cap: `class="measure"` → `max-width: 75ch`.

## Radii

`--radius-sm` 12 · `--radius-md` 14 · `--radius-lg` 16 · `--radius-xl` 20 · `--radius-2xl` 24 · `--radius-3xl` 28 · `--radius-pill` 9999.

## Elevation

`shadow-xs` · `shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-xl` (utilities).
Existing brand shadows kept: `shadow-elegant`, `shadow-card`, `shadow-soft`.

## Motion

`--duration-fast` 120ms · `--duration-base` 220ms · `--duration-slow` 360ms.
Easing: `--ease-standard`, `--ease-emphasized`.
Global `prefers-reduced-motion` override collapses all animation/transition to ~0ms.

## Semantic status (WCAG AA on white)

| Role | BG | FG |
| --- | --- | --- |
| success | `#1f7a52` | white |
| warning | `#a55a00` | white |
| destructive | `#c8181e` | white |
| info | `#1b56c4` | white |

Always pair colour with an icon or text — never rely on colour alone.

## Focus

Apply `class="focus-ring"` to any custom interactive element without a native ring. Yields 2px `--ring` outline with 2px offset on `:focus-visible`.

## Tap targets

Apply `class="tap-target"` (or Tailwind `min-h-11 min-w-11`) to icon-only buttons on mobile.

## Breakpoints (Tailwind v4 defaults)

`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. Support envelope: 320 → 2560 CSS px.

## Rules

1. Never hard-code a color, spacing, radius, shadow, duration in a component. Reference the token.
2. Glassmorphism only on Hero / AI / Chat surfaces (`glass-card`). Never on tables, forms, or financial records.
3. Every interactive element must have `:hover`, `:active`, `:focus-visible`, `:disabled` states.
4. Icon-only buttons require `aria-label`.
