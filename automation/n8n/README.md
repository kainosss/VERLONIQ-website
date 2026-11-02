# VERLONIQ AI Lead Assistant — n8n workflow (v2)

> **Status: built and tested locally; not yet connected to real accounts.**
> - **Verified:** every path has run in a real local n8n (1.123.91). The real HTTP Request node called a local *mock* of the Anthropic and OpenAI APIs; Google Sheets and Gmail were replaced by stand-ins (see [Testing](#testing)).
> - **Not yet verified:** the real Claude API, real Google Sheets and real Gmail. They haven't been connected, so nothing here has contacted a real AI service, spreadsheet or mailbox.
> - **Inactive by default:** the workflow ships inactive. Don't activate it until you've completed [step 9](#9-activate-safely) and approved live testing.

## What it does

```
Enquiry (website backend, form tool or test script)
  → Webhook (secret header required)                         → 403 without the secret
  → Workflow Configuration (business profiles, AI provider, staff address)
  → Validate & normalise                                      → 400 + reasons if invalid
  → Duplicate check (Google Sheets lookup, or submission_id)  → 200 "duplicate", nothing re-processed
  → AI classification: Anthropic (default) | OpenAI | Mock (demo, no AI)
       ↳ AI fails after 3 tries → Manual Review Fallback (lead still saved, no draft)
  → Parse & Safety Check: strict schema validation, invented details removed, safety rules the AI can't override,
    review flags (links, payment wording, prompt injection, sensitive data, low confidence, no contact details)
  → Google Sheets lead register (one row per lead)
       ↳ register fails → full lead emailed to staff + HTTP 503 to the caller
  → Gmail DRAFT reply to the customer (only if there's an email address; never sent)
  → Internal staff notification email (to the configured staff address only)
  → Response to the caller (summary, no customer details)
```

**Customers are never emailed automatically.**
- The only node that addresses a customer creates a **Gmail draft**.
- A person reviews, edits and sends it from Gmail.
- The only emails n8n actually sends go to the **staff address in the configuration**, never to an address taken from an enquiry. The tests check this on every path.

## Files

| Path | Purpose |
| --- | --- |
| `verloniq-lead-assistant.workflow.json` | **Live template.** Import this for real use. Inactive. Generated, so don't hand-edit it. |
| `verloniq-lead-assistant.demo.workflow.json` | **Demo.** Needs no credentials. Mock AI and stand-ins; contacts no external service. |
| `verloniq-lead-assistant-error-alert.workflow.json` | Optional error workflow. Emails staff if a run crashes. |
| `build-workflow.mjs` | Rebuilds all three files from the sources: `node automation/n8n/build-workflow.mjs` |
| `code/00-config.js` | **The configuration:** business profiles, AI provider and model, staff address, drafts on/off. |
| `code/*.js` | Source for every Code node (validation, AI request, parsing and safety, fallback, mock AI, notifications). |
| `prompts/classify-enquiry.system.md` | The AI system prompt. |
| `schema/ai-classification.schema.json` | The JSON shape the AI must return. It's enforced by the provider and validated again in the workflow. |
| `schema/enquiry-input.schema.json`, `schema/lead-result.schema.json` | Webhook input shape; result shape for a future website integration. |
| `google-sheets/lead-register-columns.csv` | Header row for the Google Sheet (34 columns). |
| `demo/scenarios.json` | **14 fictional test scenarios**, each with its expected outcome. |
| `samples/*.json`, `scripts/send-test-enquiry.sh` | Sample enquiries and a script that sends one to your webhook. |
| `test/` | Local test harness: mini interpreter, real-n8n runners, AI API mock and node-parameter validator. |
| `docs/operating-costs.md` | Estimated running costs for a small customer, with assumptions. |
| `docs/test-results.md` | What was tested, how, and what still needs live testing. |

The deterministic safety rules come from `public/lead-assistant.js`, which this folder only reads; they cover gas, burning smell, sparks, shocks, water near electrics, flooding, carbon monoxide, break-ins and asbestos. The website demo and the workflow therefore always use the same rules.

---

## Quick start: the demo in 5 minutes (no accounts, no cost)

1. Start n8n (see [step 1](#1-run-n8n)) and open it in your browser.
2. **Workflows → Import from File** → `verloniq-lead-assistant.demo.workflow.json`.
3. Open **Choose Demo Scenario** and set `SCENARIO` to one of the ids below.
4. Click **Execute workflow**. Click any node to see what it produced; the last node shows the response the caller would receive.

| Scenario id | Shows |
| --- | --- |
| `routine-maintenance` | Routine service request → draft reply + staff notification |
| `installation-quote` | Quote request → draft asking for the missing details |
| `urgent-service` | No cooling, elderly occupant → **urgent**, phone the customer (no email given) |
| `emergency-safety` | Burning smell at the switchboard → **emergency**, safety flag, `[URGENT]` notification |
| `missing-contact` | No phone or email → "no contact details" status, flagged |
| `ambiguous` | Vague enquiry → low confidence flagged for review |
| `duplicate` | Same enquiry again → "duplicate"; AI not called, no new row |
| `invalid-input` | Bad submission → HTTP 400 with reasons |
| `ai-failure` | AI outage → lead saved for manual review; staff still notified |
| `integration-failure` | Google Sheets down → whole lead emailed to staff, HTTP 503 to the caller |
| `unsafe-sensitive` | Gas smell + "ignore your instructions" + bank details + a compromised AI draft with a payment link → emergency, every risk flagged |
| `other-industry` | A commercial cleaning business: the workflow isn't trade-specific |
| `draft-failure` | Gmail draft fails → lead saved; staff told to write the reply manually |
| `duplicate-check-unavailable` | Sheets lookup fails → enquiry processed anyway and flagged for a manual duplicate check |

The **Mock AI is not artificial intelligence.** It reuses the website demo's keyword rules, so the rest of the workflow can be shown without an API key or cost. The Google Sheets and Gmail nodes are **DEMO stand-ins**: they store and send nothing, and say so in their output.

---

## Setup guide (live template)

Use **test accounts and a test spreadsheet** first. Don't connect production mailboxes until the [step 10](#10-what-still-needs-manual-testing) checklist passes.

### 1. Run n8n
Choose one:
- **n8n Cloud.** Sign up at n8n.io and use the hosted editor. Check current plans first; see `docs/operating-costs.md`.
- **Locally on your computer** (Node.js 20+), for testing:
  ```bash
  npx n8n
  ```
  Then open http://localhost:5678. Webhooks on a local n8n are only reachable from your own computer, which is ideal for testing.
- **Self-hosted** on a small server, using n8n's Docker image. You're then responsible for HTTPS, updates and backups, so follow n8n's hosting docs.

Tested with n8n **1.123.91**. Recent 1.x versions should work; re-run the [tests](#testing) after upgrading.

### 2. Import the workflows
**Workflows → Import from File**, once each for:
1. `verloniq-lead-assistant.workflow.json` (the live template)
2. `verloniq-lead-assistant-error-alert.workflow.json` (optional; recommended)
3. `verloniq-lead-assistant.demo.workflow.json` (optional; for demonstrations)

All three import **inactive**. Leave them that way until step 9.

### 3. Credentials you'll need

Create these in n8n under **Credentials → New**. Secrets live only in n8n credentials, never in the workflow JSON, this public repository or the website.

| Credential | n8n type | Used by | Where the value comes from |
| --- | --- | --- | --- |
| VERLONIQ webhook secret | Header Auth: Name `X-VERLONIQ-Secret`, Value = a long random string (`openssl rand -hex 32`) | Enquiry Webhook | You generate it; keep it in a password manager |
| AI API key, **Anthropic** (default) | Header Auth: Name `x-api-key`, Value = your Anthropic API key | AI: Classify Enquiry | Anthropic Console (see step 4) |
| AI API key, **OpenAI** (only if you switch) | Header Auth: Name `Authorization`, Value = `Bearer <your OpenAI key>` | AI: Classify Enquiry | OpenAI platform dashboard |
| Google Sheets | Google Sheets OAuth2 API | Find Existing Lead, Append to Lead Register | Sign in with the Google account that owns the sheet |
| Gmail | Gmail OAuth2 | Gmail: Create Draft, Gmail: Notify Staff, Gmail: Alert Staff (+ error workflow) | Sign in with the mailbox that should hold drafts and send staff notifications |

On n8n Cloud, Google sign-in works out of the box. On self-hosted n8n you first create a Google Cloud OAuth client; follow n8n's "Google OAuth2" credential docs.

### 4. Connect the AI provider
Open **Workflow Configuration** and check the `ai` block:

```js
ai: { provider: 'anthropic', model: 'claude-opus-5-5', effort: 'medium', max_tokens: 16000, openai_model: '' }
```

**Anthropic (default):**
1. Create an account in the **Anthropic Console** (console.anthropic.com).
2. Add a payment method or credits.
3. Ideally create a dedicated workspace with a **monthly spend limit**.
4. Create an API key and put it in the *Anthropic* Header Auth credential (step 3).
5. Open **AI: Classify Enquiry** and choose **Authentication: Generic Credential Type → Header Auth →** that credential.

**API usage is billed separately from any Claude subscription.** A Claude.ai or Claude Code subscription does **not** include API usage. The API is pay-as-you-go per token (see `docs/operating-costs.md`).

The workflow sends `anthropic-version: 2026-10-21`, structured JSON output (`output_config.format`) and `effort: medium`. For Opus/Sonnet-class models it also enables server-side refusal fallback (`fallbacks: "default"`); this is skipped automatically for Haiku, which doesn't support it.

**Model choices.** `claude-sonnet-5-5` and `claude-haiku-5-5` are cheaper. Only switch after running the sample enquiries through both models and comparing the classifications and drafts.

**OpenAI (alternative).** Set `provider: 'openai'` and `openai_model` to a current model from your OpenAI account, then select the OpenAI Header Auth credential on **AI: Classify Enquiry**. The workflow uses Chat Completions with a strict JSON schema. It's tested against a mock only.

**Mock.** `provider: 'mock'` runs the demo rules instead of AI. Use it only for demonstrations; leads are labelled `DEMO MODE`.

### 5. Connect Google Sheets (lead register)
1. In a **test** Google account, create a spreadsheet, e.g. *VERLONIQ Lead Register (TEST)*, with a tab named **`Leads`**.
2. Paste the contents of `google-sheets/lead-register-columns.csv` into cell A1, then use **Data → Split text to columns**. That gives 34 headers in row 1.
3. In **Find Existing Lead** and **Append to Lead Register**, select the Google Sheets credential and the spreadsheet (by URL or ID). Keep the sheet name as **Leads**.
4. Optional:
   - In **Workflow Configuration**, set `staff_notification.lead_register_url` to the sheet's URL so notifications link to it.
   - Freeze row 1.
   - Add conditional formatting for `safety_flag = YES`.
   - Restrict sharing to the people who handle enquiries.

### 6. Connect Gmail
1. Create the Gmail credential with the mailbox that should hold the drafts and send internal notifications.
2. Select it in **Gmail: Create Draft for Approval**, **Gmail: Notify Staff** and **Gmail: Alert Staff - Lead Not Saved**, plus **Gmail: Alert Staff** in the error workflow.
3. In **Workflow Configuration**, set `staff_notification.to` to the **internal** address that should hear about new leads, e.g. `office@your-business.example`.
4. In the error workflow's **Prepare Error Alert**, set `STAFF_EMAIL` to the same address.
5. Open the main workflow's **Settings → Error workflow** and choose **VERLONIQ - Lead Assistant Error Alert**.

How each Gmail node behaves:
- **Gmail: Create Draft for Approval** uses *Resource: Draft → Create*, so it can't send.
- The notification nodes send only to `$json.notification.to`, which is built from the configuration. A configured address that equals the customer's email is refused.

### 7. Run the fictional demonstration
- **Without credentials:** use the demo workflow ([Quick start](#quick-start-the-demo-in-5-minutes-no-accounts-no-cost)).
- **With your test accounts:**
  1. Open the live workflow and click **Execute workflow** (or **Listen for test event**). n8n shows a **Test URL** ending in `/webhook-test/verloniq-lead-assistant`.
  2. On your computer, run:
     ```bash
     export N8N_WEBHOOK_URL="<the Test URL>"
     export N8N_WEBHOOK_SECRET="<your secret>"
     automation/n8n/scripts/send-test-enquiry.sh automation/n8n/samples/electrical-urgent.json
     ```
  3. Click **Listen for test event** again before each sample.
  4. The samples use fictional people and `example` email domains, and drafts are never sent. Delete the test drafts and rows afterwards.

### 8. Inspect results and troubleshoot
- **Executions** (left sidebar): every run, with each node's input and output. Click a failed (red) node to see the error.
- **Lead register:** one row per lead. Check these columns:
  - `review_reasons`: why a person must check this lead
  - `ai_tokens`: token usage per lead, for cost tracking
  - `processing_mode`: `ai`, `fallback` or `mock`
- **Webhook response:** `status`, `assessed_urgency`, `draft_status` and `staff_notified` summarise what happened.

| Symptom | Likely cause and fix |
| --- | --- |
| HTTP 403 | Missing or wrong `X-VERLONIQ-Secret` header, or the webhook credential isn't selected. |
| HTTP 400 | See the `errors` list. Usually `business_id` isn't a key in `businesses`, the text is too short or long, or there's an unexpected field. |
| HTTP 500 "Workflow Configuration: …" | A setup mistake in the configuration, e.g. `openai_model` is empty while the provider is `openai`. The message says what to fix. |
| Every lead is "AI unavailable" | Open **AI: Classify Enquiry**'s error output. 401 means a wrong key or credential not selected; 400 means a wrong model name; 429 means a rate or spend limit. |
| HTTP 503 `register_failed` | Google Sheets credential, spreadsheet ID or tab name. Staff were emailed the lead. Add it to the sheet manually. |
| No staff email | `staff_notification.to` is empty or wrong, or the Gmail credential isn't selected. The response's `staff_notification_note` says why. |
| `draft_status: FAILED` | Gmail credential or permission problem. The staff email asks for a manual reply. |
| Duplicates not caught | Check the `dedupe_key` column exists and is filled. Have callers send a `submission_id`. |

### 9. Activate safely
Don't activate until **all** of these are done:
- [ ] The step 10 checklist passed with test accounts.
- [ ] The webhook credential uses a long random secret, stored only in n8n and in the calling backend's secret store.
- [ ] Only a **trusted backend** calls the webhook, never a browser. The website must not contain the webhook URL or secret (see `../website-backend/lead-assistant-proxy.example.js`). Any public form that feeds it has Cloudflare Turnstile and rate limiting in front.
- [ ] The error workflow is set (step 6) and tested: temporarily break the Sheets credential, send a test, and check the alert arrives.
- [ ] **Settings → Save execution data:** set retention to suit. n8n stores enquiry text in execution logs.
- [ ] The privacy policy for the business using it names the processors: the AI provider (Anthropic or OpenAI), Google (Sheets/Gmail) and the n8n host.
- [ ] The Anthropic workspace has a monthly spend limit.
- [ ] Real business profile, sign-off and staff address are set in **Workflow Configuration**, and the fictional demo profiles are removed.
- [ ] You've explicitly approved going live.

Then toggle the workflow **Active**. The production URL ends in `/webhook/verloniq-lead-assistant`.

### 10. What still needs manual testing
These can only be tested with real accounts (see `docs/test-results.md`):
- [ ] **Real AI:** send the 12 samples and check classifications, missing information and draft tone are acceptable, and record the `ai_tokens` values. Expected cost: well under US$1 for the set.
- [ ] **Prompt-injection sample** (`samples/prompt-injection-attempt.json`): the draft doesn't follow the injected instructions, and the injection is flagged.
- [ ] **Real Google Sheets:** a row is appended under the right headers, and the duplicate lookup finds it (send the same sample twice).
- [ ] **Real Gmail:** the draft appears in **Drafts** (not Sent), and the staff notification arrives at the configured address.
- [ ] **Failures:**
  - Break the Anthropic key and confirm the "AI unavailable" row and the staff email.
  - Break the Sheets credential and confirm HTTP 503 and the alert email.
- [ ] **Sent folder:** nothing was ever sent to a customer address.
- [ ] **Error workflow:** it fires on a forced crash.

---

## Configuration reference (`Workflow Configuration` node)

| Setting | Default | Notes |
| --- | --- | --- |
| `ai.provider` | `anthropic` | `anthropic`, `openai` or `mock` |
| `ai.model` | `claude-opus-5-5` | Anthropic model id |
| `ai.effort` | `medium` | Anthropic `low`, `medium` or `high`; higher costs more |
| `ai.max_tokens` | `16000` | Upper limit on output; you pay only for what's generated |
| `ai.openai_model` | `''` | Required when the provider is `openai` |
| `staff_notification.enabled` / `.to` | `true` / `''` | Internal address. Empty means no notifications (the response says so). |
| `staff_notification.lead_register_url` | `''` | Optional link in notifications |
| `customer_drafts.enabled` | `true` | Turn off to skip Gmail drafts entirely |
| `businesses` | 5 fictional profiles | Each key is a `business_id`, with `name`, `trade`, `service_area` and `signoff`. Use **one workflow copy per client**. |
| `limits` | 15–4,000 characters | Enquiry text length |

To adapt it for a new industry, add a profile with that business's trade description. The prompt, schema and rules aren't trade-specific; the `cleaning` profile and scenario show this. The deterministic safety rules focus on trade hazards and simply won't fire for unrelated industries.

## Data in and out

**Webhook request:** `POST` with JSON and the header `X-VERLONIQ-Secret`.

```json
{ "business_id": "electrical", "enquiry_text": "Our power keeps tripping…", "customer_name": "optional", "customer_email": "optional", "customer_phone": "optional", "source": "website_form", "submission_id": "optional-unique-id-from-the-caller" }
```

`submission_id` is optional but recommended. A retry with the same id is recognised as a duplicate, even on a later day.

**Responses:**

| Situation | HTTP | Body |
| --- | --- | --- |
| Missing or wrong secret | 403 | (from n8n) |
| Invalid request | 400 | `{ "ok": false, "errors": ["…"] }` |
| Already received (same day, or same `submission_id`) | 200 | `{ "ok": true, "status": "duplicate", "lead_id": "VQ-…" }` |
| Lead saved | 200 | `{ "ok": true, "status": "…", "lead_id": "VQ-…", "assessed_urgency": "…", "safety_flag": "YES/no", "draft_created": true, "draft_status": "…", "staff_notified": true, "staff_notification_note": "", "processing_mode": "ai" }` |
| Lead register unavailable | 503 | `{ "ok": false, "status": "register_failed", "lead_id": "VQ-…", "staff_alerted": true, "message": "…" }`. Retry later. |
| Configuration error or crash | 500 | (from n8n). The error workflow emails staff. |

**Lead statuses:**
- `New - draft awaiting approval`
- `New - no email, call customer`
- `New - no contact details, review enquiry`
- `URGENT - call customer, draft awaiting approval`
- `URGENT - call customer`
- `URGENT - call customer (AI unavailable)`
- `AI unavailable - manual review needed`

**Urgency** (`assessed_urgency`): `emergency`, `urgent`, `soon`, `routine` or `quote`. It's an **automated assessment** that a person must confirm, and it's described that way in the notification and the prompt. It's never a guarantee.

## Safety and security design

- **Secrets:** only in n8n credentials. The workflow JSON contains none (the tests check this); the repository is public.
- **Webhook:** header-secret authentication. The request headers, which include the secret, aren't passed beyond the configuration node. The workflow ships inactive.
- **Input validation:**
  - an allow-listed `business_id`
  - length limits
  - email, phone and `submission_id` format checks
  - unexpected fields rejected
  - control characters stripped
- **Duplicate protection:**
  - A key from the business, contact details and normalised text (per day), or from `submission_id`, is checked before any AI cost.
  - If the lookup fails, the enquiry is still processed and flagged, rather than lost.
- **AI output:**
  - The provider enforces the schema, and the workflow **validates it again**.
  - Refusals, truncation, invalid JSON or schema violations go to manual review.
  - Any contact detail, organisation or address the AI reports that isn't in the enquiry is **removed** and noted. Missing details are listed, never guessed.
- **Safety:**
  - Deterministic rules run after the AI and **can only raise** urgency.
  - Hazards force `emergency` and an `URGENT` status, and the notification leads with the safety note.
  - A vulnerable occupant with a fault raises urgency to at least `urgent`.
- **Prompt injection and sensitive data:**
  - The enquiry is delimited and treated as data.
  - Injection phrases, card, bank or ID numbers and passwords, and drafts containing links, other email addresses or payment wording are all flagged in `review_reasons`.
- **Failures never lose a lead:**
  - AI outage: retried 3 times, then saved for manual review.
  - Sheets outage: the whole lead is emailed to staff, and the caller gets 503.
  - Draft or notification failure: the lead is still saved and the response says so.
  - Unexpected crash: the error workflow emails staff.
- **No customer-facing sending:** customer replies are Gmail drafts only. Sending is limited to the configured staff address.
- **Privacy:** enquiries go to the AI provider, Google and the n8n host. List them in the client's privacy policy, limit sheet access and set execution-data retention.

## Testing

```bash
node --test tests/*.test.mjs
```
This needs no accounts and takes seconds. It runs:
- unit tests for every Code node, against the exact code in the workflow JSON
- all 14 demo scenarios through the generated demo workflow (using a small test interpreter)
- the main live-workflow paths
- checks that the committed JSON matches its sources

```bash
automation/n8n/test/run-local-e2e.sh
```
This is optional and needs `npm i -g n8n`. In a throwaway **local** n8n, it:
1. validates every node's parameters against the installed n8n's own node definitions
2. runs all 14 demo scenarios with `n8n execute`
3. activates the live workflow structure and posts real webhook requests. The real HTTP Request node calls a **local mock** of the Anthropic and OpenAI APIs, and Google Sheets and Gmail are stand-ins.

It checks auth, validation, duplicates, `submission_id` retries, the safety override, schema rejection, removal of invented details, AI and Sheets outages, draft failure, the staff-only recipient, the request format for both providers and retries. Results are in `docs/test-results.md`.

## Connecting the website later

The website's demo (`public/lead-assistant.js`) is **simulated**: browser rules, no AI and no network calls. It must stay labelled that way until a real backend exists. To connect it:
1. Deploy a same-origin backend, e.g. a Cloudflare Worker route `/api/lead-assistant` based on `../website-backend/lead-assistant-proxy.example.js`. It holds the webhook URL and secret as Worker secrets, and adds Turnstile and rate limiting.
2. Use a **separate demo workflow copy and sheet** for website visitors, so demo traffic never mixes with a real lead register.
3. Extend **Build Response** to return the fields the demo displays (`schema/lead-result.schema.json`), and update the demo's "Simulated" labels.

This is a separate, approved change. This folder never modifies the website.

## Known limitations

- **Live services untested:** the real Claude/OpenAI API, Google Sheets and Gmail haven't been tested (step 10).
- **Concurrent duplicates:** two identical enquiries arriving within the same second or two could both be processed, because the check relies on the Sheets lookup. `submission_id` helps with retries but not with true simultaneous duplicates.
- **Status after a failed draft:** the sheet row is written before the draft is attempted. If the draft fails, the row still reads "draft awaiting approval"; the staff email and webhook response say the draft failed.
- **Mock AI:** it only understands the four demo trades in detail. Other businesses get a generic answer. It isn't AI.
- **Gmail sending limits:** Gmail's daily sending limits apply to staff notifications (far above small-business volumes).
- **One client per copy:** each workflow copy serves one client (one sheet, one mailbox). Multi-client hosting is out of scope.
