#!/usr/bin/env bash
# Preview the VERLONIQ website locally, exactly as Cloudflare will serve it.
# Nothing is deployed and no Cloudflare login is needed.
#
#   ./scripts/preview.sh            # Cloudflare's local runtime (needs Node.js 20+), http://localhost:8787
#   ./scripts/preview.sh --simple   # plain Python server (no Node needed), http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")/.."

cat <<'NOTE'
──────────────────────────────────────────────────────────────────────────────
 VERLONIQ local preview
 • The ENQUIRY FORM IS LIVE (public/config.js): a form submitted from this
   preview is delivered to the real Formspree inbox. Use an obvious test
   message, or just don't submit.
 • "Choose a time" opens the real Cal.com booking page. Don't confirm a
   booking unless you mean to (or cancel it afterwards).
 • The AI Lead Assistant demo is a simulation: nothing leaves your browser.
──────────────────────────────────────────────────────────────────────────────
NOTE

if [[ "${1:-}" == "--simple" ]]; then
  echo "Serving public/ at http://localhost:8000   (security headers and the 404 page aren't applied in this mode)"
  exec python3 -m http.server 8000 --directory public
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js isn't installed. Install it from https://nodejs.org, or run: ./scripts/preview.sh --simple" >&2
  exit 1
fi
echo "Starting Cloudflare's local runtime at http://localhost:8787 (first run downloads Wrangler; Ctrl+C to stop)"
exec npx --yes wrangler@4 dev --port 8787
