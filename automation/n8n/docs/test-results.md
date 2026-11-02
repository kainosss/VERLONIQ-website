# Test results: AI Lead Assistant v2

**Date:** 1 November 2026. **n8n:** 1.123.91 (local, throwaway instance). **Node.js:** 22.

> **What "passed" means here.** Every check ran against **mocks or stand-ins** for the AI APIs, Google Sheets and Gmail. No real AI request was made, no spreadsheet was written and no email was created or sent. Live behaviour is listed under [Not yet tested](#not-yet-tested-needs-real-accounts).

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| Unit and scenario tests (no n8n needed) | `node --test tests/*.test.mjs` | **77 / 77 passed.** This includes the website's own tests in the same folder. |
| Node parameters vs n8n's own node definitions | `test/validate-node-params.cjs` (step 0 of the runner) | **All nodes valid** for n8n 1.123.91: parameter names, option values, required fields and type versions |
| Demo workflow in real n8n | `test/run-local-e2e.sh` (step 1) | **14 / 14 scenarios passed** |
| Live workflow structure in real n8n | `test/run-local-e2e.sh` (step 2) | **35 / 35 checks passed** |
| Import of the committed files into a fresh n8n | `n8n import:workflow` | **All 3 imported, all inactive** |

## Demo scenarios (`demo/scenarios.json`)

Each scenario was run twice: once through the generated demo workflow in the test interpreter (`tests/n8n-demo-scenarios.test.mjs`), and once in real n8n (`n8n execute`). Both runs were checked against the same expectations (`test/expectations.mjs`).

| # | Scenario | Required category | Result (both runs) |
| --- | --- | --- | --- |
| 1 | `routine-maintenance` | Routine enquiry | 200; `routine`; draft created; staff notified |
| 2 | `installation-quote` | Installation quotation | 200; `quote`; draft created |
| 3 | `urgent-service` | Urgent service request | 200; `urgent`; vulnerable person flagged; phone the customer (no email) |
| 4 | `emergency-safety` | Urgent service request (safety) | 200; `emergency`; safety flag YES; `URGENT - call customer`; `[URGENT…]` notification |
| 5 | `missing-contact` | Missing contact information | 200; `New - no contact details, review enquiry`; "Phone number or email address" listed as missing |
| 6 | `ambiguous` | Ambiguous enquiry | 200; "AI confidence is low" flagged |
| 7 | `duplicate` | Duplicate submission | 200 `duplicate` with the original lead id; AI not called; no new row |
| 8 | `invalid-input` | Invalid input | 400 with 4 clear errors; nothing saved |
| 9 | `ai-failure` | AI service failure | 200; `AI unavailable - manual review needed`; no draft; `[Manual review]` staff notification |
| 10 | `integration-failure` | Integration failure (Sheets) | 503 `register_failed`; full lead emailed to staff |
| 11 | `unsafe-sensitive` | Potentially unsafe or sensitive request | 200; `emergency` despite the AI under-rating it; prompt injection, sensitive data, link and payment wording all flagged |
| 12 | `other-industry` | Configurability (cleaning business) | 200; draft created |
| 13 | `draft-failure` | Integration failure (Gmail draft) | 200; draft `FAILED`; staff told to reply manually |
| 14 | `duplicate-check-unavailable` | Integration failure (Sheets lookup) | 200; processed; flagged for a manual duplicate check |

**Invariants checked on every scenario:**
- Staff emails go only to the configured staff address, never a customer.
- Customer replies exist only as drafts.
- Every saved row says a person must review it.
- A safety flag always comes with an URGENT status.
- A success response always comes with a saved row.

## Live workflow structure in real n8n (35 checks)

- **Setup:** the real Webhook, header auth, IF and Respond nodes, and the **real HTTP Request node**, pointed at a local mock of `api.anthropic.com/v1/messages` and `api.openai.com/v1/chat/completions`.
- **Stand-ins:** Google Sheets and Gmail nodes were replaced by stand-ins that record what they would have done.

**What was checked:**
- **Security:** no secret → 403; wrong secret → 403.
- **Validation:** invalid business or short text, unexpected fields, a bad email and over-long text → 400.
- **Duplicates:** an identical enquiry → `duplicate` with the original id; a retry with the same `submission_id` and different text → `duplicate`.
- **Happy paths:**
  - emergency with no email → URGENT, no draft, staff notified
  - quote with email → draft created
  - no contact details → specific status
  - non-trade profile (cleaning) works
  - all 12 sample enquiries get the expected urgency
- **AI robustness:**
  - The AI under-rates a gas smell → the rules force `emergency`.
  - A refusal → manual review.
  - Schema-breaking output → rejected.
  - An invented email, phone and address → removed and noted.
  - A payment link, injection or link in the draft → flagged.
- **Failures:**
  - A 529 overloaded response is retried (at least 4 calls seen), then falls back to manual review.
  - A hazard during an AI outage still gives URGENT.
  - A Sheets outage → 503 and an alert email containing the full lead.
  - A Gmail draft failure → lead saved and staff told.
- **Register contents:** exactly one row per processed enquiry (25), each with the 34 documented columns in order. Token usage is recorded.
- **Emails:** 10 drafts, exactly one per lead with an email address. 26 internal emails, all to the staff address and none to a customer. Urgent notifications lead with the safety note.
- **Request format:**
  - Anthropic: `x-api-key` from the credential, `anthropic-version: 2026-10-21`, the fallback beta header, `claude-opus-5-5`, `effort: medium`, a strict JSON schema, no sampling parameters, and the enquiry delimited.
  - OpenAI: a Bearer credential and `response_format.json_schema.strict = true`, with the response parsed and saved.

**Issues found and fixed during testing:**
1. **Misleading statuses.**
   - An emergency with no email read "draft awaiting approval" (now `URGENT - call customer`).
   - A lead with no contact details said "phone the customer" (now "no contact details").
2. **Startup race in the old runner.** It sometimes tested before n8n had registered the webhooks; it now waits for activation.
3. **Test-only workflow IDs.** n8n doesn't save a workflow's stored data when its ID isn't 16 letters or digits. This only affected a hand-named test copy; real imports get proper IDs. The test builder now enforces 16-character IDs.

## Not yet tested (needs real accounts)

| Area | Why it couldn't be tested here | How to test |
| --- | --- | --- |
| **Real AI** (Anthropic Claude, or OpenAI) | No API key; no paid usage authorised | README step 10: send the 12 samples, review the drafts, record `ai_tokens` |
| **AI answer quality** | The mock reuses keyword rules; it isn't AI | Read every draft for tone, accuracy and missing-information requests |
| **Real Google Sheets** append and lookup | No Google account connected | README step 10 |
| **Real Gmail** drafts and notifications | No mailbox connected | Check Drafts and Sent; confirm nothing reached a customer |
| **Error workflow** firing | It needs a real crash in an active or production run | Force a failure with a test account |
| **Public-facing security** (rate limiting, Turnstile in front of the webhook) | No backend deployed | Before any public form is connected |

## How to reproduce

```bash
node --test tests/*.test.mjs          # seconds, no accounts
npm i -g n8n                          # once
automation/n8n/test/run-local-e2e.sh  # a few minutes, local only, no accounts or network calls
```
