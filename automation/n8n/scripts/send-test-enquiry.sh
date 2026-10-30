#!/usr/bin/env bash
# Sends ONE fictional test enquiry to your n8n webhook and prints the response.
# Usage:
#   export N8N_WEBHOOK_URL="https://<your-n8n-host>/webhook-test/verloniq-lead-assistant"   # test URL while building
#   export N8N_WEBHOOK_SECRET="<the value of your Header Auth credential>"
#   automation/n8n/scripts/send-test-enquiry.sh automation/n8n/samples/electrical-urgent.json
# The secret is read from the environment so it never lands in shell history files or the repository.
set -euo pipefail
: "${N8N_WEBHOOK_URL:?Set N8N_WEBHOOK_URL}"; : "${N8N_WEBHOOK_SECRET:?Set N8N_WEBHOOK_SECRET}"
FILE="${1:?Pass a sample JSON file, e.g. automation/n8n/samples/plumbing-quote.json}"
curl -sS -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-VERLONIQ-Secret: $N8N_WEBHOOK_SECRET" \
  --data-binary "@$FILE" \
  -w '\nHTTP %{http_code}\n'
