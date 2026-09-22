# Merline brand — Phase 2 rebrand

Source of truth for the design tokens, asset pipeline, and rationale behind
the navy/lemon identity introduced in Phase 2. If you need to regenerate an
asset or add a new one, start here.

## Source asset

`apps/frontend/public/brand/master.png` — the original upload
(`merline-logo-research-intelligence.png`), untouched, 1920×1920,
`TrueColorAlpha` (real alpha channel, not a flattened black background —
verify with `identify -verbose master.png | grep Alpha` if a future export
tool strips it). Never edit this file; derive from it.

## Sampled brand colors

Pixel-sampled from the master, not approximated:

| Token | Hex | HSL | Sample point |
|---|---|---|---|
| Navy | `#012C76` | `218 98% 23%` | Dominant fill color, ~1.14M px of the 1920² canvas |
| Lemon | `#C9EC73` | `77 76% 69%` | Accent panel, ~84K px |

Extracted via:
```bash
convert master.png -background white -flatten /tmp/on-white.png
convert /tmp/on-white.png -colors 8 -depth 8 -format %c histogram:info:-
```

## Contrast decisions (WCAG 2.2, computed, not eyeballed)

| Pairing | Ratio | Verdict |
|---|---|---|
| White text on navy | 12.94:1 | Pass (AAA) |
| Navy-ink (`#0B1220`) text on lemon | 14.02:1 | Pass (AAA) |
| **White text on lemon** | **1.34:1** | **Fail — never do this** |
| Lemon text on navy | 9.69:1 | Pass (AAA) — safe for small text/status labels on a navy surface |
| Lemon as a bare ring/border on a white page | 1.32:1 | Fail — lemon focus rings only work on dark surfaces |

Rule that follows from this table, enforced throughout: **a lemon fill
always pairs with `--lemon-foreground` (dark navy-ink) text/icons, never
white.** Lemon never carries body text or long copy on its own. Lemon as a
bare outline (focus ring, border) is dark-mode only.

Recompute with `docs/scripts` is not checked in — the one-off script used:
```python
def luminance(rgb):
    def ch(c):
        c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b=rgb; return .2126*ch(r)+.7152*ch(g)+.0722*ch(b)
def contrast(a,b):
    la,lb = luminance(a)+.05, luminance(b)+.05
    return max(la,lb)/min(la,lb)
```

## Token architecture

`apps/frontend/src/app/globals.css` — `--color-primary-*` (50–900) is a
brand-navy ramp anchored so `--color-primary-500` (the `DEFAULT` every
`bg-primary`/`text-primary` class resolves to) equals the exact sampled navy.
`--color-lemon-*` is a separate, parallel family — deliberately **not** wired
into `primary`, so it never becomes the accidental default button color.
Everything that should read as "the brand" (buttons, links, active nav,
focus rings) goes through `primary`; everything that should read as "an
evidence/readiness/active signal" reaches for `lemon` explicitly.

Dark mode keeps navy as the hue family but lightens it (raw `L23%` navy is
too close to the dark-mode page background, `L10%`, to register as an
accent) — same pattern the file already used pre-rebrand (it used to swap to
teal; now it stays navy, just lighter). `--primary-foreground` flips from
white to dark ink in dark mode accordingly (white-on-the-lightened-blue is
2.97:1, fails; navy-ink-on-it is 6.3:1).

`tailwind.config.ts` exposes both families (`primary.50…900`, `lemon.50…900`)
plus `primary.foreground` / `lemon.foreground`. **Real bug fixed in passing:**
`text-primary-foreground` was used throughout `button.tsx` etc. but the
underlying `--primary-foreground` CSS variable never existed — a silently
no-op Tailwind class, meaning default buttons were rendering with whatever
color happened to inherit, not a deliberate one. Now defined in both themes.

`--brand-navy` / `--brand-lemon` are raw (non-ramped) tokens for one-off
literal uses — hero panels, the field app's chrome — where a full 50–900
scale isn't needed.

## Asset derivatives

All generated from `brand/master.png` via ImageMagick (`apt-get install
imagemagick`). Commands, in order:

```bash
# 1. Trim to content, re-pad to a square with safe margin
convert master.png -trim +repage mark-trimmed.png
convert mark-trimmed.png -gravity center -background none -extent 2090x2090 mark-light.png

# 2. Dark-surface variant — the navy mark is nearly invisible on a navy
#    background (verified by compositing before this fix existed), so this
#    is a genuine recolor: navy fill -> white, lemon accent untouched.
convert mark-light.png -fuzz 15% -fill "#FFFFFF" -opaque "#012C76" mark-dark.png

# 3. Favicons (transparent, navy mark)
for size in 16 32 48; do
  convert mark-light.png -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} icons/favicon-${size}.png
done
convert icons/favicon-16.png icons/favicon-32.png icons/favicon-48.png favicon.ico

# 4. PWA "any" icons (transparent)
convert mark-light.png -resize 192x192 -background none -gravity center -extent 192x192 icons/icon-192.png
convert mark-light.png -filter Lanczos -resize 512x512 -background none -gravity center -extent 512x512 icons/icon-512.png

# 5. Maskable icons — solid navy canvas, dark-surface mark at ~65% (inside
#    the ~80% safe-zone circle platforms use for adaptive icon masking)
convert -size 512x512 xc:"#012C76" icons/icon-maskable-512.png
convert mark-dark.png -filter Lanczos -resize 333x333 /tmp/dm.png
convert icons/icon-maskable-512.png /tmp/dm.png -gravity center -composite icons/icon-maskable-512.png
# (same pattern at 192x192 with a 125px mark)

# 6. Apple touch icon — solid navy, no transparency (iOS convention)
convert -size 180x180 xc:"#012C76" icons/apple-touch-icon.png
convert mark-dark.png -resize 148x148 /tmp/dm2.png
convert icons/apple-touch-icon.png /tmp/dm2.png -gravity center -composite icons/apple-touch-icon.png
```

Final tree:
```
public/brand/master.png       — untouched original, preserve forever
public/brand/mark-light.png   — navy on transparent, light surfaces
public/brand/mark-dark.png    — white+lemon on transparent, dark/navy surfaces
public/icons/favicon-{16,32,48}.png, favicon.ico
public/icons/icon-{192,512}.png                  — PWA, purpose "any"
public/icons/icon-maskable-{192,512}.png         — PWA, purpose "maskable"
public/icons/apple-touch-icon.png                — 180×180, iOS
```

## Wordmark

There is no flattened "Merline" wordmark image, deliberately. The old
`logo-full-light.png` / `logo-full-dark.png` raster wordmarks are gone;
`components/brand/logo.tsx`'s `variant="full"` now renders the mark image
next to real text in the Sora display face (`font-display`), colored via the
existing `text-foreground` token. Crisper at every size, needs no light/dark
image pair of its own, and is actually readable by assistive tech instead of
being an image of text.

## Typography

Unchanged from pre-rebrand — already a solid system, not part of what was
broken: Inter (`--font-sans`) for body/UI, Sora (`--font-display`) for the
wordmark and display headings. No new fonts introduced.

## What deliberately did not change

Legacy MERL routes (studies, questionnaires, indicators, submissions,
dashboards) inherit the new tokens automatically (no visual regression) but
got no bespoke redesign attention — their backend modules are deregistered,
unlinked from navigation, and carry no live data (see `LEGACY.md`). Design
effort went to auth, the shared component library (which cascades
everywhere), and the surfaces that are the actual product: participants,
interviews, findings, and the field app.
