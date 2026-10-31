# VERLONIQ AI Lead Assistant — n8n workflow

> **Status: template, not yet operational.** The workflow has been built and tested locally in n8n 1.123.91. Google Sheets, Gmail and the Claude API were replaced by stand-ins for that test (see [Testing](#testing)). It hasn't been connected to real accounts, imported into your n8n, or tested with the real Claude API. Treat it as **not operational** until you've completed [Tomorrow's setup](#tomorrows-setup-step-by-step) and the test checklist.

## What it does

```
Customer enquiry
  → n8n Webhook  (secret header required)
  → Validate & normalise          → 400 if invalid
  → Duplicate check (Google Sheets lookup)  → "duplicate" if already received today
  → AI classification (Claude Messages API, structured JSON output)
      ↳ on API failure → Manual Review Fallback (lead still saved, no draft)
  → Deterministic safety rules (can't be overridden by the AI)
  → Google Sheets lead register (one row per lead)
  → Gmail DRAFT reply (only if the customer gave an email address)
  → Human approval: a person reviews, edits and sends the draft from Gmail
```

**It never sends an email to a customer.** Gmail is only used to create drafts.

## Files

| Path | Purpose |
| --- | --- |
| `verloniq-lead-assistant.workflow.json` | **Import this into n8n.** Generated — don't edit by hand. |
| `build-workflow.mjs` | Rebuilds the workflow JSON from the files below: `node automation/n8n/build-workflow.mjs` |
| `code/*.js` | Source for the five Code nodes (validation, AI request, parsing + safety, fallback, duplicate check). |
| `prompts/classify-enquiry.system.md` | The AI system prompt. |
| `schema/enquiry-input.schema.json` | What the webhook accepts. |
| `schema/ai-classification.schema.json` | The JSON shape the AI must return (sent as structured output). |
| `schema/lead-result.schema.json` | The website demo's result shape, which a future live backend should match. |
| `google-sheets/lead-register-columns.csv` | Header row for the Google Sheet. |
| `samples/*.json` | 12 fictional trade enquiries, plus an invalid request and a prompt-injection attempt. |
| `scripts/send-test-enquiry.sh` | Sends one sample to your webhook. |
| `test/` | Optional local end-to-end test (needs n8n installed locally; no real accounts). |
| `../website-backend/lead-assistant-proxy.example.js` | Example (not deployed) of how the website could call n8n securely later. |

The safety rules (gas, burning smell, sparks, shocks, water near electrics, flooding, carbon monoxide, break-ins, asbestos) come from `public/lead-assistant.js`. The website demo and the workflow therefore always use the same rules.

## Data in and out

**Webhook request** (`POST`, JSON — see `schema/enquiry-input.schema.json`):

```json
{ "business_id": "electrical", "enquiry_text": "Our power keeps tripping…", "customer_email": "optional", "customer_phone": "optional", "customer_name": "optional", "source": "website_form" }
```

The request must include the header `X-VERLONIQ-Secret: <your secret>`. `business_id` is one of `electrical`, `plumbing`, `aircon` or `security` (the fictional demo businesses). For a real client, edit `BUSINESSES` in `code/02-build-ai-request.js` and `ALLOWED_BUSINESSES` in `code/01-validate-enquiry.js`, then rebuild.

**Webhook responses:**

| Situation | HTTP | Body |
| --- | --- | --- |
| Missing or wrong secret | 403 | (from n8n) |
| Invalid request | 400 | `{ "ok": false, "errors": ["…"] }` |
| Same enquiry already received today | 200 | `{ "ok": true, "status": "duplicate", "lead_id": "VQ-…" }` |
| Lead saved | 200 | `{ "ok": true, "lead_id": "VQ-20261030-AB12C", "status": "…", "urgency": "emergency", "safety_flag": "YES", "draft_created": false }` |

**Lead register row:** the 30 columns in `google-sheets/lead-register-columns.csv`. They include `status`, `urgency`, `safety_flag`, `hazards`, the customer and job details, `missing_information`, `review_reasons`, the draft subject and body, `confidence`, the original enquiry and `dedupe_key`.

**Status values:**
- `New - draft awaiting approval`
- `URGENT - call customer, draft awaiting approval`
- `New - no email, call customer`
- `AI unavailable - manual review needed`

---

## Tomorrow's setup, step by step

Use **test accounts and a test spreadsheet** first. Don't connect production mailboxes until the checklist passes. Nothing below needs a paid plan to try, but check each provider's current pricing and your n8n plan before relying on it.

### 1. n8n
1. Open your n8n instance (n8n Cloud, or self-hosted 1.x — tested on **1.123.91**).
2. Go to **Workflows → Import from File** and choose `automation/n8n/verloniq-lead-assistant.workflow.json`.
3. Leave the workflow **inactive** for now.

### 2. Webhook secret
1. Generate a long random value, e.g. `openssl rand -hex 32`, and keep it in your password manager.
2. In n8n, go to **Credentials → New → Header Auth**. Set **Name** to `X-VERLONIQ-Secret` and **Value** to the random value. Call the credential *VERLONIQ webhook secret*.
3. Open the **Enquiry Webhook** node and select that credential.

### 3. AI model (Claude)
1. In the Anthropic Console, create an API key, ideally in a dedicated workspace with a monthly spend limit.
2. In n8n, go to **Credentials → New → Header Auth**. Set **Name** to `x-api-key` and **Value** to the API key. Call it *Anthropic API key*.
3. Open **Claude: Classify Enquiry** and choose **Authentication: Generic → Header Auth → Anthropic API key**. The node already sends `anthropic-version: 2026-10-21` and `anthropic-beta: server-side-fallback-2026-07-01`.

Settings, all in `code/02-build-ai-request.js`:
- **Model:** `claude-opus-5-5`.
- **Effort:** `medium`.
- **Structured JSON output:** forces the shape in `schema/ai-classification.schema.json`.
- **`fallbacks: "default"`:** retries on a fallback model if the request is declined on safety grounds.

To try a cheaper or faster model, change `MODEL` and rebuild. Measure the results on the sample enquiries before switching for real customers.

The API key lives **only** in the n8n credential. It's never in the workflow JSON, the website or this repository.

### 4. Google Sheets (lead register)
1. In a **test** Google account, create a spreadsheet such as *VERLONIQ Lead Register (TEST)* with a tab named **`Leads`**.
2. Paste the contents of `google-sheets/lead-register-columns.csv` into row 1. Each column name goes in its own cell (**Data → Split text to columns**).
3. In n8n, go to **Credentials → New → Google Sheets OAuth2 API** and sign in with the test account.
4. Open **Find Existing Lead** and **Append to Lead Register**. In both nodes, select the credential and the spreadsheet (by URL or ID). Keep the sheet name as **Leads**.
5. Optional: freeze row 1, filter on `status`, and add conditional formatting on `safety_flag = YES` to highlight urgent rows.

### 5. Gmail (drafts only)
1. In n8n, go to **Credentials → New → Gmail OAuth2** and sign in with the **test** mailbox that should hold the drafts.
2. Open **Gmail: Create Draft for Approval** and select the credential. The node is set to **Resource: Draft → Create**, so it can't send.

### 6. Human approval process
1. New rows appear in the sheet. Sort or filter by `safety_flag` and `urgency`, and **call every `URGENT` lead first**.
2. Open the matching draft in Gmail **Drafts**, check it against `review_reasons` and `missing_information`, edit it, then send it yourself.
3. Update `status` in the sheet, e.g. `Replied`, `Booked` or `Quote sent`.
4. For `AI unavailable - manual review needed` rows, read `enquiry_text` and reply manually.

---

## Testing

### Testing in your n8n tomorrow
1. Open the workflow and click **Execute workflow** (or "Listen for test event"). n8n then shows a **Test URL** for the webhook, ending in `/webhook-test/verloniq-lead-assistant`.
2. On your computer:
   ```bash
   export N8N_WEBHOOK_URL="<the Test URL>"
   export N8N_WEBHOOK_SECRET="<your secret>"
   automation/n8n/scripts/send-test-enquiry.sh automation/n8n/samples/electrical-urgent.json
   ```
3. Repeat for each sample (click "Listen for test event" again each time) and tick off this checklist:

| Sample | Expect |
| --- | --- |
| `invalid-request.json` | HTTP 400 with errors; nothing in the sheet |
| Any sample sent **without** the secret (remove the `-H` line) | HTTP 403 |
| `electrical-urgent.json` | `emergency`, `safety_flag YES`, status `URGENT…`, no Gmail draft (no email in the enquiry) |
| `electrical-urgent.json` again | `"status": "duplicate"`, no new row |
| `electrical-quote.json` | `quote`, a Gmail **draft** to priya.nair@example.com (don't send it) |
| `plumbing-urgent.json` | `emergency` (water near power points), status `URGENT…` |
| `aircon-urgent.json` | `urgent` (no cooling, elderly occupant) |
| `security-urgent.json` | `emergency` (break-in) |
| `prompt-injection-attempt.json` | Still `emergency` because of the sparks. Any link or deposit request in the draft is listed in `review_reasons`. `notes_for_staff` should mention the injection attempt |
| Temporarily break the API key, then send any sample | Row saved as `AI unavailable - manual review needed`, no draft, HTTP 200 |

4. Read every draft for tone and accuracy before you trust the setup. Check that nothing was sent from the mailbox (**Sent** folder).
5. Only then **activate** the workflow. The production URL is `/webhook/verloniq-lead-assistant`.

Sample enquiries use made-up names and `example` email domains. Gmail drafts addressed to them are harmless as long as they're never sent. Delete them after testing.

### Automated tests (already run, no accounts needed)
```bash
node --test tests/*.test.mjs
```
This runs the website demo engine tests and unit tests for every n8n Code node, executing the exact code that's in the workflow JSON.

```bash
automation/n8n/test/run-local-e2e.sh
```
This optional script runs the whole workflow in a throwaway **local** n8n:
- Google Sheets and Gmail are replaced by stand-ins.
- A local mock receives the **real** HTTP Request node's Claude API calls.

It checks webhook auth, validation, duplicates, the safety override, link and payment flagging, AI-failure fallback with retries, all samples, the sheet columns, draft creation and the exact API request format. It needs `npm i -g n8n`.

---

## Security and safety design

- **Secrets:** the webhook secret, Anthropic key and Google tokens live only in n8n credentials. The workflow JSON contains none, and the repository is public.
- **Callers:**
  - Only a trusted backend should call the webhook, never a browser. The website must not contain the webhook URL or secret; see `../website-backend/lead-assistant-proxy.example.js`.
  - Add Cloudflare Turnstile and rate limiting on any public form that feeds it.
- **Input validation:**
  - Allow-listed `business_id`, length limits (15–4,000 characters) and email and phone format checks.
  - Unexpected fields are rejected, and control characters are stripped.
- **Duplicate protection:** a hash of business, contact details and normalised message, scoped to the day, is looked up in the sheet before any AI cost is incurred.
- **Prompt injection:**
  - The customer text is delimited and the model is told to treat it as data.
  - Structured output limits the response shape.
  - Drafts containing links, other email addresses or payment wording are flagged in `review_reasons`.
  - A person approves every reply.
- **Safety:**
  - Deterministic rules run after the AI and **can only raise** urgency.
  - Hazards force `emergency` and an `URGENT – call customer` status.
  - Vulnerable occupants raise faults to at least `urgent`.
  - The AI's draft includes basic safety advice (e.g. call 000) for staff to check, not to send blindly.
- **Failure handling:**
  - The Claude call retries up to 3 times, 5 seconds apart, then falls back to saving the lead for manual review, so no enquiry is lost.
  - Refusals, cut-off output or invalid JSON are also routed to manual review.
- **Privacy:**
  - Real customer enquiries processed this way are sent to Anthropic (AI), Google (Sheets/Gmail) and your n8n host.
  - Before using it with real customers, **add these providers to the relevant privacy policy**.
  - Limit who can access the sheet, and set n8n's execution-data retention to suit (n8n stores execution payloads, which include enquiry text).
- **No automatic sending:** there's no Send Email node, and Gmail creates drafts only.

## Connecting the website later

Right now the website's demo (`public/lead-assistant.js`) is **simulated**: keyword rules in the browser, no AI and no network calls. To connect it to real processing later:

1. **Deploy a backend:** a small backend on the same domain, e.g. a Cloudflare Worker route `/api/lead-assistant` based on `../website-backend/lead-assistant-proxy.example.js`. It holds `N8N_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` as **Worker secrets**.
2. **Point the demo at it:** call `VerloniqLeadAssistant.processEnquiry(text, businessId, { endpoint: '/api/lead-assistant' })`. The function only accepts same-origin `/api/…` paths, so an n8n URL can't be put in the browser by mistake.
3. **Return the full result:** extend the workflow's **Respond: Lead Saved** node to return the fields the demo displays, in the shape in `schema/lead-result.schema.json`, and update the demo's "Simulated" labels.
4. **Keep demo data separate:** use a separate demo workflow or sheet for website visitors so demo traffic never mixes with a real lead register. Add Turnstile and rate limiting first.

## Known limitations

- **Untested against real services:** never run against the real Claude API, Google Sheets or Gmail. Those connections are tomorrow's test.
- **Duplicate check timing:** it relies on the Sheets lookup. Two identical enquiries arriving within a second or two of each other could both be processed.
- **Location:** suburb detection in the *website demo* uses a fixed list of Brisbane suburbs. The AI handles any location.
- **Response is a summary:** the webhook response includes a summary, not the full classification.
- **Business profiles:** the four profiles are fictional demo businesses.
