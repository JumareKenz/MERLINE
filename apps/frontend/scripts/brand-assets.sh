#!/usr/bin/env bash
# Regenerates every brand derivative from the untouched master logo.
# Deterministic: same master in, same files out. Requires ImageMagick 6+.
#
#   cd apps/frontend && bash scripts/brand-assets.sh
#
# See docs/BRAND.md for what each file is for and where it is referenced.
set -euo pipefail
cd "$(dirname "$0")/../public"

MASTER=brand/master.png
NAVY='#012C76'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Strip timestamps/metadata so rebuilds are byte-stable.
IM_OUT=(-strip -define png:exclude-chunks=date,time)

# 1. Trim to the mark, pad to a square with a 4% safe margin.
convert "$MASTER" -trim +repage "$TMP/trim.png"
W=$(identify -format %w "$TMP/trim.png"); H=$(identify -format %h "$TMP/trim.png")
S=$(( (W > H ? W : H) * 104 / 100 ))
convert "$TMP/trim.png" -background none -gravity center -extent ${S}x${S} "$TMP/light.png"

# 2. Dark-surface variant: navy fill -> white, lemon accent untouched.
convert "$TMP/light.png" -fuzz 15% -fill '#FFFFFF' -opaque "$NAVY" "$TMP/dark.png"

# 3. Sized marks for the UI. The UI never loads more than it displays
#    (the previous 2090px/894 KB file was served for a 22px header logo).
for size in 32 64 128 256 512; do
  convert "$TMP/light.png" -filter Lanczos -resize ${size}x${size} "${IM_OUT[@]}" brand/mark-${size}.png
  convert "$TMP/dark.png"  -filter Lanczos -resize ${size}x${size} "${IM_OUT[@]}" brand/mark-dark-${size}.png
done
# Kept for backwards compatibility with any external reference, now 512px.
cp brand/mark-512.png brand/mark-light.png
cp brand/mark-dark-512.png brand/mark-dark.png

# 4. Favicons (transparent navy mark) and a multi-size .ico.
for size in 16 32 48; do
  convert "$TMP/light.png" -filter Lanczos -resize ${size}x${size} "${IM_OUT[@]}" icons/favicon-${size}.png
done
convert icons/favicon-16.png icons/favicon-32.png icons/favicon-48.png favicon.ico

# 5. Admin PWA "any" icons: the plain mark on transparent.
for size in 192 512; do
  convert "$TMP/light.png" -filter Lanczos -resize ${size}x${size} "${IM_OUT[@]}" icons/icon-${size}.png
done

# 6. Tiles on solid navy: maskable (mark at 62% — inside the 80% safe
#    circle Android masks to), the field app's own "any" icon (a navy
#    rounded tile, so the two apps are distinguishable on a home screen),
#    and the Apple touch icon (iOS applies its own rounding; no alpha).
tile() { # size markPct out [rounded]
  local size=$1 pct=$2 out=$3 rounded=${4:-}
  local m=$(( size * pct / 100 ))
  convert "$TMP/dark.png" -filter Lanczos -resize ${m}x${m} "$TMP/m.png"
  if [ -n "$rounded" ]; then
    local r=$(( size * 22 / 100 ))
    convert -size ${size}x${size} xc:none -fill "$NAVY" -draw "roundrectangle 0,0 $((size-1)),$((size-1)) $r,$r" "$TMP/bg.png"
  else
    convert -size ${size}x${size} xc:"$NAVY" "$TMP/bg.png"
  fi
  convert "$TMP/bg.png" "$TMP/m.png" -gravity center -composite "${IM_OUT[@]}" "$out"
}
tile 192 62 icons/icon-maskable-192.png
tile 512 62 icons/icon-maskable-512.png
tile 192 70 icons/field-icon-192.png rounded
tile 512 70 icons/field-icon-512.png rounded
tile 180 72 icons/apple-touch-icon.png
convert icons/apple-touch-icon.png -alpha off "${IM_OUT[@]}" icons/apple-touch-icon.png

# 7. iOS launch screens (apple-touch-startup-image): navy, centered mark.
#    Android builds its splash from the manifest's background_color + icon.
for dims in 750x1334 828x1792 1125x2436 1170x2532 1179x2556 1242x2688 1284x2778 1290x2796; do
  w=${dims%x*}; h=${dims#*x}; m=$(( w * 28 / 100 ))
  convert "$TMP/dark.png" -filter Lanczos -resize ${m}x${m} "$TMP/sm.png"
  convert -size ${w}x${h} xc:"$NAVY" "$TMP/sm.png" -gravity center -composite \
    -colors 64 "${IM_OUT[@]}" splash/launch-${w}x${h}.png
done

# 8. Share image for public pages (login): 1200x630, navy, mark left of centre.
convert "$TMP/dark.png" -filter Lanczos -resize 300x300 "$TMP/og.png"
convert -size 1200x630 xc:"$NAVY" "$TMP/og.png" -gravity center -composite \
  -colors 128 "${IM_OUT[@]}" brand/og-image.png

echo "Brand derivatives regenerated from $MASTER"
