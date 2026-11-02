#!/usr/bin/env bash
# OPTIONAL developer test: runs the workflows in a throwaway LOCAL n8n. Uses no real accounts, keys or data,
# and makes no outside network calls (the AI APIs are mocked on 127.0.0.1:5680).
#   1. All demo scenarios through the DEMO workflow (n8n CLI `execute`).
#   2. The LIVE workflow (webhook, header auth, real HTTP Request node → local AI mock; Sheets/Gmail stand-ins).
# Requires Node 20+ and n8n on PATH (npm i -g n8n; tested with 1.123.91).
# Usage: automation/n8n/test/run-local-e2e.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="$(mktemp -d)"
cleanup() { kill $(jobs -p) 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT
export N8N_USER_FOLDER="$WORK" N8N_PORT=5679 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false \
  N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false N8N_SECURE_COOKIE=false N8N_RUNNERS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false
export MOCK_AI_BASE=http://127.0.0.1:5680
node "$HERE/../build-workflow.mjs"

echo "== 0. Node parameters vs the installed n8n's node definitions =="
N8N_PKG="$(dirname "$(dirname "$(readlink -f "$(command -v n8n)")")")"   # .../node_modules/n8n
NM="$N8N_PKG/node_modules"; [ -d "$NM/n8n-workflow" ] || NM="$(dirname "$N8N_PKG")"
node "$HERE/validate-node-params.cjs" "$NM" "$HERE/../verloniq-lead-assistant.workflow.json" "$HERE/../verloniq-lead-assistant.demo.workflow.json" "$HERE/../verloniq-lead-assistant-error-alert.workflow.json" | tail -1
echo "== 1. Demo workflow: every scenario in real n8n =="
node "$HERE/run-demo-in-n8n.mjs"

echo "== 2. Live workflow structure (webhook + real HTTP Request node) =="
node "$HERE/make-test-workflow.mjs" "$HERE/../verloniq-lead-assistant.workflow.json" "$WORK/test-anthropic.json" "$WORK/test-openai.json"
n8n import:credentials --input="$HERE/test-credentials.json" >/dev/null
n8n import:workflow --input="$WORK/test-anthropic.json" >/dev/null
n8n import:workflow --input="$WORK/test-openai.json" >/dev/null
n8n update:workflow --id=vqLeadAssistTest --active=true >/dev/null
n8n update:workflow --id=vqLeadAssistOpAI --active=true >/dev/null
node "$HERE/mock-claude.mjs" &
n8n start > "$WORK/n8n.log" 2>&1 &
# Wait until both test workflows are activated (health alone is not enough: webhooks register after it).
for _ in $(seq 1 120); do
  if [ "$(grep -c 'Activated workflow' "$WORK/n8n.log" 2>/dev/null || true)" -ge 2 ]; then break; fi
  sleep 1
done
grep -q 'Activated workflow' "$WORK/n8n.log" || { echo "n8n did not activate the test workflows:"; tail -40 "$WORK/n8n.log"; exit 1; }
sleep 2
node "$HERE/e2e.mjs"
