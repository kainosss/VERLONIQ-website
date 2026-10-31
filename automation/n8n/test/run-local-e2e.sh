#!/usr/bin/env bash
# OPTIONAL developer test: runs the workflow end-to-end in a throwaway LOCAL n8n with stand-ins for
# Google Sheets and Gmail, and a local mock of the Claude API. Uses no real accounts, keys or data.
# Requires: Node 20+ and n8n installed locally (npm i -g n8n). Usage: automation/n8n/test/run-local-e2e.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="$(mktemp -d)"; trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$WORK"' EXIT
export N8N_USER_FOLDER="$WORK" N8N_PORT=5679 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false N8N_SECURE_COOKIE=false N8N_RUNNERS_ENABLED=false
export MOCK_CLAUDE_URL=http://127.0.0.1:5680/v1/messages
node "$HERE/../build-workflow.mjs"
node "$HERE/make-test-workflow.mjs" "$HERE/../verloniq-lead-assistant.workflow.json" "$WORK/test-workflow.json"
n8n import:credentials --input="$HERE/test-credentials.json" >/dev/null
n8n import:workflow --input="$WORK/test-workflow.json" >/dev/null
n8n update:workflow --id=vqLeadAssistTest --active=true >/dev/null
node "$HERE/mock-claude.mjs" & n8n start > "$WORK/n8n.log" 2>&1 &
for _ in $(seq 1 90); do curl -sf http://127.0.0.1:5679/healthz >/dev/null && break; sleep 2; done; sleep 5
node "$HERE/e2e.mjs"
