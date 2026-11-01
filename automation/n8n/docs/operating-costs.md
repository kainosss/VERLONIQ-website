# Estimated operating costs: AI Lead Assistant for a small customer

These are the **third-party running costs** a customer pays to providers. They exclude VERLONIQ's implementation and support fees, which are quoted separately and never published in this public repository.

> **Estimates only.** Prices change, and real token usage must be measured during live testing (the lead register's `ai_tokens` column records it per lead). Confirm current prices on each provider's pricing page before quoting.

## Assumptions

| Assumption | Value used | Why |
| --- | --- | --- |
| Enquiries per month | **150** (about 5 a day) | A typical 5–30-person trade or service business. Scale linearly. |
| Tokens per enquiry | about **2,500 input** (prompt, schema and enquiry) and **2,500 output** (thinking plus JSON answer and draft) | Matches the sales toolkit's `07-cost-structure.md`. A deliberately generous estimate, because the output figure includes the model's reasoning. Measure real figures. |
| AI model | Claude Opus 5.5 (`claude-opus-5-5`), effort `medium` | The workflow's default |
| Anthropic API prices | Opus 5.5: US$4 per million input tokens, US$20 per million output. Sonnet 5.5: US$2 / US$10. Haiku 5.5: US$0.10 / US$0.50 (prompts under 100K tokens). | Anthropic's published API prices as at October 2026. Check the current pricing page. |
| Exchange rate | US$1 ≈ A$1.50; €1 ≈ A$1.70 | Example rates only |
| Retries and failures | Up to 10% extra AI calls | A failed call is retried up to 3 times |
| Executions | 1 n8n execution per enquiry | The error workflow runs only when something fails. |

## AI usage per month (the variable cost)

Formula: `enquiries × (input tokens × input price + output tokens × output price)`.

| Model | Per enquiry | 150 a month | With a 10% retry allowance |
| --- | --- | --- | --- |
| **Claude Opus 5.5** (default) | about US$0.06 | about **US$9 (≈ A$14)** | about A$15 |
| Claude Sonnet 5.5 | about US$0.03 | about US$4.50 (≈ A$7) | about A$8 |
| Claude Haiku 5.5 | about US$0.0015 | about US$0.23 (≈ A$0.35) | under A$1 |

- Only switch to a cheaper model after comparing its classifications and drafts on the sample enquiries. Haiku also has no server-side refusal fallback.
- **API usage is separate from any Claude subscription.** A Claude.ai or Claude Code plan doesn't cover API calls. The customer's own Anthropic Console account is billed per token. Set a monthly spend limit there.
- The first live test, the 12 samples plus a few failure tests, should cost **under US$1**.
- If the customer chooses OpenAI instead, apply the same formula to OpenAI's current prices for the chosen model.

## Platform costs per month

| Item | Estimate | Notes |
| --- | --- | --- |
| **n8n Cloud, Starter plan** | about €20–24 a month (≈ A$35–41), 2,500 executions | Third-party guides list Starter at 2,500 executions per month for about €20 (annual billing) to €24 (monthly billing). 150 enquiries a month uses about 6% of that. Confirm on n8n.io/pricing. |
| *or* self-hosted n8n (Community Edition) | A server of roughly A$10–30 a month, plus time for updates, backups and monitoring | The software itself has no licence fee for internal use. Read n8n's Sustainable Use Licence before hosting n8n *for* customers; `07-cost-structure.md` treats VERLONIQ-hosted n8n as an open decision. |
| Google Workspace (Gmail + Sheets) | Usually **A$0 extra**: the customer's existing account | Sheets and Gmail API use within normal quotas has no extra charge. If they don't have Workspace, check Google's current Australian per-user pricing. |
| Cloudflare (website backend, if used later) | Usually A$0 on the free tier at this volume | Only needed when the website demo is connected to a live backend. |

## Example total for a small customer

| | Monthly (approx.) |
| --- | --- |
| AI (Opus 5.5, 150 enquiries, with retries) | A$15 |
| n8n Cloud Starter | A$35–41 |
| Google Workspace | already paid |
| **Third-party running cost** | **about A$50–56 a month** |

This roughly doubles at 300 enquiries a month for the AI line only; n8n stays within the Starter allowance up to about 2,500 enquiries a month. With Sonnet 5.5 the AI line roughly halves.

**Sources for the n8n pricing:** [Jetadmin (Sep 2026)](https://www.jetadmin.io/blog/n8n-pricing/), [Sliplane](https://sliplane.io/blog/n8n-pricing), [Toolradar](https://toolradar.com/blog/n8n-pricing-2026). These are third-party summaries; n8n's own pricing page is authoritative.
