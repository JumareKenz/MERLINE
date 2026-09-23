# Merline brand and design system

Source of truth for the identity, the design tokens and the asset pipeline.
If you regenerate an asset or add a token, start here.

## Source asset

`apps/frontend/public/brand/master.png` is the supplied
`merline-logo-research-intelligence.png`, byte-identical (md5
`00bbcf3fe33b55bfe29f91284d504565`), 1920×1920 with a real alpha channel.
**Never edit it.** Every other brand file is derived from it by
`apps/frontend/scripts/brand-assets.sh`.

The mark: an architectural M built from document-like planes, in navy, with
one lemon-green "insight" panel.

## Brand colors (pixel-sampled from the master)

| Token | Hex | HSL |
|---|---|---|
| Navy | `#012C76` | `218 98% 23%` |
| Lemon | `#C9EC73` | `77 76% 69%` |

## Contrast decisions (WCAG 2.2, computed)

| Pairing | Ratio | Use |
|---|---|---|
| White on navy | 12.9:1 | Primary buttons, field chrome |
| Ink `222 47% 11%` on white | 17.9:1 | Body text |
| `--text-secondary` `217 19% 30%` on white | 9.1:1 | Secondary text |
| `--text-tertiary` `215 14% 43%` on white / field paper | 5.4:1 / 4.9:1 | Small meta text (was 3.1:1, failing) |
| Dark-mode tertiary `215 12% 62%` on dark page | 6.7:1 | (was 2.75:1, failing) |
| Lemon-foreground ink on lemon | 13.4:1 | Accent buttons, selected states |
| Lemon on navy | 9.7:1 | Field status pill, field brand text |
| `lemon-800` `80 60% 26%` on white | 6.1:1 | Lemon-family text on light surfaces |
| **White on lemon** | **1.3:1** | **Never** |
| **Lemon on white (as ring/border)** | **1.3:1** | **Never**; lemon rings only on dark surfaces |

Rules that follow:

- Lemon is an accent (readiness, active/selected, evidence, sync success, the
  record button). A lemon fill always carries `--lemon-foreground`. Lemon never
  carries body text or small text on a light surface.
- Evidence and active-nav indicators use `lemon-600` as a 3px bar. The state is
  also conveyed by weight, background or text, never by the bar alone.
- Status never relies on color alone: every `StatusBadge` has an icon and a word.
- The focus ring is navy on light surfaces and lemon on dark ones.

## Tokens

All in `apps/frontend/src/app/globals.css`, exposed through
`tailwind.config.ts`. Don't hard-code hex values in components.

| Group | Tokens |
|---|---|
| Brand | `--color-primary-50…900` (500 = navy), `--color-lemon-50…900` (500 = lemon), `--brand-navy`, `--brand-navy-deep`, `--brand-lemon` |
| Surfaces | `--bg-page` (soft-tinted `#F7F9FC`), `--bg-surface`, `--bg-elevated` (white), `--bg-inset`, `--bg-hover/active` |
| Field surfaces | `--field-paper` (warm neutral), `--field-card`, `--field-line` |
| Text | `--text-primary/secondary/tertiary/link/…` (ratios above) |
| Status | `--color-success/warning/error/info` (+ `-bg`), `--color-recording` (distinct from error, so "live" never reads as "broken") |
| Glass | `--glass-bg`, `--glass-border`; the `.glass` class applies blur only under `@supports`, with a solid fallback |
| Radius | `--radius-sm 6 / md 8 / lg 12 / xl 16 / 2xl 22` |
| Controls | `--control-sm 32 / md 40 / lg 48 / field 56` px |
| Motion | `--ease-standard`, `--ease-emphasized`, `--duration-fast 120 / base 180 / slow 280` ms; all motion is disabled under `prefers-reduced-motion` |
| Elevation | `shadow-soft` (panels), `shadow-float` (floating layers) |
| Type roles | `.type-title`, `.type-section`, `.type-eyebrow`, `.type-body` |

Typography: **Inter** (`--font-sans`) for all UI text; **Sora**
(`--font-display`) for the wordmark and the field app's large headings. Both
come from `next/font` with `display: swap`, so there's no layout-shifting
external font request.

## Admin vs field: same family, different products

| | Admin workspace | Field app |
|---|---|---|
| Surface | Cool tinted page, white panels | Warm paper, navy chrome |
| Navigation | Left rail: 6 workflow areas + account menu; drawer on small screens | Navy top bar (sync pill, account) + 3-item bottom bar |
| Type scale | 14–15px body, 22–26px titles | 15–17px body, 28px titles, 56px recording timer |
| Controls | 32–40px | 48–56px, 96px record button |
| Lemon use | Active-nav bar, evidence bars, highlights | Record button, selected answers, bottom-nav pill, status on navy |
| Sign-in | Split screen, email + password, evidence-chain diagram | Full-height navy, 10-character access code |

## Asset derivatives

Regenerate everything (it's deterministic, and outputs are byte-stable):

```bash
cd apps/frontend && bash scripts/brand-assets.sh   # needs ImageMagick
```

| File | What | Referenced by |
|---|---|---|
| `brand/mark-{32,64,128,256,512}.png` | Navy mark, transparent | `Logo` (picks the smallest size that's sharp at 2×) |
| `brand/mark-dark-{…}.png` | White mark + lemon accent, for navy/dark surfaces | `Logo theme="dark"` |
| `brand/mark-light.png`, `mark-dark.png` | 512px copies kept for old external links (were 2090px / 894 KB) | — |
| `favicon.ico`, `icons/favicon-{16,32,48}.png` | Favicons | root metadata |
| `icons/icon-{192,512}.png` | Admin PWA icons (transparent mark) | `manifest.json` |
| `icons/field-icon-{192,512}.png` | Field PWA icons (navy rounded tile) | `field.webmanifest` |
| `icons/icon-maskable-{192,512}.png` | Maskable: navy canvas, mark at 62% (inside the 80% safe circle) | both manifests |
| `icons/apple-touch-icon.png` | 180×180, navy, no alpha | metadata |
| `splash/launch-*.png` | 8 iOS launch screens (navy, centered mark) | `appleWebApp.startupImage` |
| `brand/og-image.png` | 1200×630 share image | Open Graph / Twitter metadata |

A header logo now costs about 5 KB instead of 894 KB. Android builds its
splash screen from the manifest's `background_color` and icon.

## Manifests

- `public/manifest.json`: **Merline** (admin), start `/`, light background.
- `public/field.webmanifest`: **Merline Field**, navy background and theme,
  portrait. Linked from `app/field/layout.tsx` and `app/field-login/layout.tsx`,
  so on field.jrecc.org it installs as a separate app with its own icon.

Both manifests, the service worker, icons, splash screens and
`offline.html` are excluded from the auth middleware (`src/middleware.ts`
matcher), so they are never redirected to `/login`.
