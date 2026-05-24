#!/usr/bin/env bash
#
# Processes book cover images from assets/ → public/covers/
#
# Generates two sizes per image:
#   <name>.webp   — 320px wide (retina-ready for ~160px card display)
#   <name>@2x.webp — 640px wide (for detail pages)
#
# Usage:
#   ./scripts/process-covers.sh                # process all PNGs/JPGs in assets/
#   ./scripts/process-covers.sh assets/jesus.png  # process a single file

set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/covers"
QUALITY=80
THUMB_WIDTH=320
DETAIL_WIDTH=640

mkdir -p "$OUTPUT_DIR"

process_image() {
  local src="$1"
  local name
  name="$(basename "${src%.*}")"

  echo "Processing $name..."

  # Thumbnail (catalog cards) — 320px wide
  magick "$src" -resize "${THUMB_WIDTH}x>" -quality "$QUALITY" "$OUTPUT_DIR/${name}.webp"

  # Detail page — 640px wide
  magick "$src" -resize "${DETAIL_WIDTH}x>" -quality "$QUALITY" "$OUTPUT_DIR/${name}@2x.webp"

  # Report sizes
  local orig_size thumb_size detail_size
  orig_size=$(stat -f%z "$src" 2>/dev/null || stat -c%s "$src")
  thumb_size=$(stat -f%z "$OUTPUT_DIR/${name}.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}.webp")
  detail_size=$(stat -f%z "$OUTPUT_DIR/${name}@2x.webp" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}@2x.webp")

  printf "  %-12s %6s → thumb %6s, detail %6s\n" \
    "$name" \
    "$(numfmt --to=iec "$orig_size" 2>/dev/null || echo "${orig_size}B")" \
    "$(numfmt --to=iec "$thumb_size" 2>/dev/null || echo "${thumb_size}B")" \
    "$(numfmt --to=iec "$detail_size" 2>/dev/null || echo "${detail_size}B")"
}

if [ $# -gt 0 ]; then
  for f in "$@"; do
    process_image "$f"
  done
else
  shopt -s nullglob
  files=("$ASSETS_DIR"/*.png "$ASSETS_DIR"/*.jpg "$ASSETS_DIR"/*.jpeg)
  if [ ${#files[@]} -eq 0 ]; then
    echo "No images found in $ASSETS_DIR"
    exit 0
  fi
  for f in "${files[@]}"; do
    process_image "$f"
  done
fi

echo "Done! Covers written to $OUTPUT_DIR"
