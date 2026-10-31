# VERLONIQ sales & delivery toolkit — AI Lead Assistant

Everything needed to sell, scope, deliver and support VERLONIQ's first service: **AI enquiry automation for Australian trade businesses** (electricians, plumbers, air-conditioning contractors and electronic security companies).

> **This repository is public.** These documents contain no prices or margins. VERLONIQ's suggested pricing and the profitability workbook live in `internal/`, which is **git-ignored and never committed**. Keep them in private storage (e.g. a private Google Drive or Notion page) or a private repository.

| # | Document | Use it when |
| --- | --- | --- |
| 1 | [Service packages](01-service-packages.md) | Explaining what Basic, Standard and Custom include, exclude and require |
| 2 | [Sales process](02-sales-process.md) | Moving a lead from first contact to go-live and ongoing support |
| 3 | [Business Clarity Call guide](03-discovery-call-guide.md) | Running the free 20-minute Business Clarity Call |
| 4 | [Proposal template](04-proposal-template.md) | Writing a customer proposal after scoping |
| 5 | [Customer onboarding checklist](05-onboarding-checklist.md) | Collecting information, accounts, permissions and approvals before building |
| 6 | [Demonstration script](06-demo-script.md) | Showing the website's AI Lead Assistant demo in five minutes |
| 7 | [Cost structure](07-cost-structure.md) | Explaining who pays for software, AI usage and VERLONIQ's fees |
| 8 | Profitability worksheet — `internal/profitability-worksheet.xlsx` (not committed) | Checking hours, costs, contingency and margin before quoting |
| — | Internal pricing guide — `internal/pricing-guide.md` (not committed) | Suggested AUD price ranges for each package and support plan |

## How it fits together

```
Website / referral
  → Free 20-minute Business Clarity Call ............ 03-discovery-call-guide.md, 06-demo-script.md
  → Technical scoping (if qualified) ......... 02-sales-process.md, 05-onboarding-checklist.md (pre-check)
  → Proposal .................................. 04-proposal-template.md + 01-service-packages.md + 07-cost-structure.md
                                                (price checked in internal/profitability-worksheet.xlsx)
  → Acceptance & deposit
  → Onboarding ................................ 05-onboarding-checklist.md
  → Implementation ............................ automation/n8n/README.md (setup, security, testing)
  → Go-live, hypercare, optional support plan
```

## Related material already in this repository

- **The product itself:** [`automation/n8n/`](../../automation/n8n/) holds the workflow template, setup guide, security design and test checklist. Its [README](../../automation/n8n/README.md) is the delivery runbook. This toolkit doesn't repeat it.
- **The website demo:** `public/lead-assistant.js` and the "Interactive demo" section. It's **simulated**: browser-side rules with no AI. See the [demonstration script](06-demo-script.md).
- **Legal drafts:** `public/privacy.html` and `public/terms.html` are VERLONIQ's own website policies, still drafts. Customer contracts and terms of engagement **don't exist yet** (see "Decisions" below).
- **Website journey:** a free Business Clarity Call, then an optional paid assessment **or** a direct quote, then implementation, then optional support. This toolkit follows the same journey.

## Ground rules for everything in this toolkit

1. **Honesty first.** The website demo is scripted rules, not AI. Never present it as live AI. Don't promise savings, response-time improvements or ROI without the customer's own data.
2. **VERLONIQ is a business improvement and AI automation consultancy.** This toolkit covers the AI Automation service. Business consulting and the paid Business Improvement Assessment are a separate, standalone service. We don't give regulated financial, tax, accounting or legal advice. Point customers to their accountant or lawyer for those questions.
3. **Customers own their accounts.** Software and AI usage are billed to the customer directly (see [cost structure](07-cost-structure.md)).
4. **People approve every customer-facing message.** The Lead Assistant creates drafts; it never sends emails automatically.
5. **Safety beats speed.** Anything involving gas, electrical faults, flooding, break-ins or vulnerable people is flagged for a person to call the customer.

## Decisions still to make

These are tracked in each document and summarised here. Until each is made, treat the related documents as drafts.

- [x] **Business Clarity Call length:** settled at **20 minutes**. The website and the Cal.com event (`free-20-minute-discovery-call`) match.
- [ ] **Prices.** Confirm the starting prices in `internal/pricing-guide.md` after reviewing the profitability workbook with your own cost rate.
- [ ] **GST.** Confirm with an accountant whether VERLONIQ is or must be registered for GST, then show prices ex-GST or inc-GST consistently.
- [ ] **Terms of engagement.** A lawyer-reviewed services agreement (liability cap, IP, data processing, warranty, termination) is needed before the first signed proposal.
- [ ] **Payment terms.** The toolkit suggests 50% on acceptance and 50% at go-live, invoices due in 14 days. Confirm these.
- [ ] **Insurance.** Decide on professional indemnity and public liability cover before delivering paid work.
- [ ] **Who hosts n8n for customers.** The default is the customer's own n8n account. Decide whether VERLONIQ will ever host on the customer's behalf (see [cost structure](07-cost-structure.md)).
- [ ] **Internal storage.** Choose where `internal/` files live permanently, or make this repository private.
