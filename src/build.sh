#!/bin/sh
# Build the Greenboard theme from src/css/*.css and src/js/*.js (concatenated in filename order).
#   ./src/build.sh   -> themes/greenboard/stylesheets/application.css, themes/greenboard/javascripts/theme.js
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
OUT_CSS="$ROOT/themes/greenboard/stylesheets/application.css"
OUT_JS="$ROOT/themes/greenboard/javascripts/theme.js"
mkdir -p "$(dirname "$OUT_CSS")" "$(dirname "$OUT_JS")"
{
  echo '@import url(/application.css);'
  for f in "$SRC"/css/*.css; do printf '\n/* === %s === */\n' "$(basename "$f")"; cat "$f"; done
} > "$OUT_CSS"
for f in "$SRC"/js/*.js; do printf '\n// === %s ===\n' "$(basename "$f")"; cat "$f"; done > "$OUT_JS"
if command -v node >/dev/null 2>&1; then node --check "$OUT_JS"; fi
echo "built: $(wc -l < "$OUT_CSS") css lines, $(wc -l < "$OUT_JS") js lines"
