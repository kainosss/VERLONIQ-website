# Cost structure — who pays for what

**The principle:** customers pay their own software subscriptions and AI usage directly to each provider. VERLONIQ charges separately for implementation and, optionally, ongoing support. VERLONIQ doesn't resell or mark up third-party services.

Use this page to explain costs in the discovery call and proposal. It's written so you can paraphrase it, or paste parts of it, to customers.

## The two kinds of cost

| | **Third-party running costs** | **VERLONIQ fees** |
| --- | --- | --- |
| What | Automation platform (n8n), AI usage (Anthropic Claude API), email and spreadsheet (Google Workspace or Microsoft 365), optional job system or SMS | Implementation (fixed price per package) and optional monthly support/advisory |
| Paid to | Each provider, directly, on the customer's card or invoice | VERLONIQ |
| Account owner | The customer | — |
| Pricing | The provider's published pricing; some bill in USD | Set in the proposal (AUD) |
| Changes | Can change when providers change pricing or the customer's usage changes | Fixed for the agreed scope; changes by written agreement |

## Why customers hold their own accounts

1. **Ownership and continuity:** the customer keeps their automation, data and history even if they stop working with VERLONIQ.
2. **Transparency:** customers see exactly what they pay each provider, with no hidden margin.
3. **Security and privacy:** customer data stays in accounts the customer controls, and they can remove VERLONIQ's access at any time.
4. **Simpler for VERLONIQ:** no exposure to customers' usage spikes, currency movements or unpaid provider bills.

## How to estimate a customer's running costs (for the proposal)

1. **Automation platform:** the n8n plan (or self-hosting cost) the customer will use. Check n8n's current pricing page when writing each proposal, because plans change.
2. **AI usage:** depends on the number of enquiries and their length. A simple estimate:

   ```
   monthly AI cost ≈ enquiries per month × (input tokens × input price + output tokens × output price)
   ```

   Use the **Customer Cost Estimate** tab in `internal/profitability-worksheet.xlsx`. At the example assumptions there (150 enquiries a month, roughly 2,500 input and 2,500 output tokens each, published Claude Opus 5.5 rates as at October 2026, and an example exchange rate), it comes to **roughly A$14 a month**. Treat this as an order of magnitude only: verify the current rates, and measure real token usage during testing.
3. **Email and spreadsheet:** usually already paid, with no change.
4. **Optional:** job management system (usually already paid), SMS alerts (per message), and any web-developer time to add a form.

Present these as **estimates** in a separate table from VERLONIQ's fees, and include the date you checked the prices.

## How to explain it to a customer (script)

> "There are two parts to the cost. First, the tools the automation runs on — the automation platform and the AI usage. Those are in your business's name and you pay the providers directly, so you own everything and see exactly what you're paying; for a business your size it's usually a modest monthly amount, and I'll put an estimate in the proposal. Second, our fee to design, build, test and train your team, which is a fixed price, plus an optional monthly support plan if you'd like us to look after it."

## Exceptions (decide case by case and record in the proposal)

- **VERLONIQ hosts n8n on the customer's behalf:** only if the customer can't run their own, and only under written terms that say who owns the account, how costs are recharged (at cost, disclosed) and how it's handed over. **Not offered by default.** This is an open decision.
- **Testing costs during delivery:** small AI usage on VERLONIQ's own development key before handover is VERLONIQ's direct cost, and is already in the profitability worksheet.
- **Customer asks VERLONIQ to pay and re-bill:** decline by default. If accepted, pass the cost through at cost, show it separately on the invoice, and confirm the GST treatment with an accountant.

## Scope reminder

VERLONIQ explains the *running costs of the automation it builds*. It doesn't advise on the customer's wider finances, pricing of their own services, tax or budgeting. Refer those questions to the customer's accountant.
