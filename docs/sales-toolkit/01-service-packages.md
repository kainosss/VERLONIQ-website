# Service packages — AI enquiry automation for trade businesses

Three implementation packages for the AI Lead Assistant, plus optional monthly support. Prices are **not** in this public document. See `internal/pricing-guide.md` and the proposal for each customer.

All packages share the same core: new enquiries are read by AI, sorted, checked for safety risks and missing details, and logged. A reply **draft** is prepared for a person to approve. **No customer email is ever sent automatically.**

## At a glance

| | **Basic** | **Standard** | **Custom** |
| --- | --- | --- | --- |
| Best for | Owner-operators and small teams with one main enquiry channel | Growing teams handling enquiries across several channels | Multi-site businesses, after-hours triage or unusual systems |
| Enquiry sources | 1 (website form **or** one email inbox) | Up to 3 (e.g. website form + shared inbox + one more) | Scoped |
| AI classification, urgency and safety flags | ✓ | ✓, with categories and service-area rules tuned to the business | ✓, fully tailored |
| Lead register | Google Sheet | Google Sheet **or** an existing job management/CRM system with a supported API | Scoped |
| Reply drafts for approval | Gmail drafts | Gmail or Outlook drafts | Scoped |
| Urgent-job alert to a person | Highlighted in the sheet | Email or SMS alert to an on-call contact | Scoped (e.g. escalation rules, rosters) |
| Reply tone and templates | Standard VERLONIQ trade templates, adjusted once | Written with you, 2 rounds of changes | Scoped |
| Tuning rounds after testing | 1 | 2 | Scoped |
| Staff training | 1 × 45-minute online session | 2 sessions + short written guide | Scoped |
| Hypercare after go-live | 14 days | 30 days | Scoped |
| Typical delivery time* | 1–2 weeks | 3–4 weeks | Scoped |

\*From receiving everything on the [onboarding checklist](05-onboarding-checklist.md). Delays in account access or approvals extend the timeline.

## Basic: "Lead Assistant Starter"

**Includes**
- Discovery call, technical scoping call and a written scope.
- Setup of the VERLONIQ Lead Assistant workflow on the **customer's own** n8n account (based on [`automation/n8n/`](../../automation/n8n/)).
- **One** enquiry source: a website form **or** one email inbox.
- AI classification: job category, job type, urgency, location, requirements, missing information, a reply draft, and safety flags for gas, electrical, water, flooding, carbon monoxide, break-ins, asbestos and vulnerable occupants.
- Duplicate protection, input validation and fallback to manual review if the AI is unavailable.
- Google Sheets lead register with the standard 30 columns and simple highlighting of urgent rows.
- Gmail reply drafts for staff approval.
- Testing with the business's own sample enquiries (anonymised where possible), plus one tuning round.
- One 45-minute online training session and a one-page "how we use it" guide.
- 14 days of hypercare: fixes and adjustments after go-live.

**Excludes**
- Changes to the customer's website, beyond adding a form endpoint or embed code they or their web provider can install.
- Integration with job management or CRM software.
- SMS, phone or voicemail handling.
- Automatic sending of any message.
- Third-party subscriptions and AI usage, which the customer pays directly (see [cost structure](07-cost-structure.md)).
- Ongoing support after hypercare, unless a support plan is added.

## Standard: "Lead Assistant Pro"

Everything in Basic, plus:
- **Up to three** enquiry sources, e.g. website form, shared inbox and a second form or mailbox.
- Categories, urgency rules and **service-area rules** tailored to the business (e.g. flag jobs outside the service area).
- Lead register in **Google Sheets or an existing job management/CRM system** that has a supported API. Integration is confirmed during scoping, and the system must allow API access on the customer's plan.
- Gmail **or** Microsoft 365/Outlook drafts.
- **Urgent-job alert** by email or SMS to an on-call contact. SMS provider costs are paid by the customer.
- Reply templates written with the business, with two rounds of changes.
- Two tuning rounds, two training sessions and a short written guide.
- A simple weekly summary: counts by category and urgency, and leads still awaiting reply.
- 30 days of hypercare.

**Excludes**
- More than three sources.
- Two-way synchronisation with job management systems: Standard *creates* leads and doesn't update existing jobs.
- Quoting or invoicing automation.
- Phone, voicemail or social media messaging channels.
- Automatic sending.
- Third-party costs (paid by the customer).

## Custom

For needs beyond Standard, quoted after a scoping session. If the customer wants help deciding what to automate first, an AI opportunity assessment can come first, but it's optional. Examples:
- After-hours triage with on-call rosters and escalation.
- Multiple sites or brands.
- Voicemail transcription.
- Two-way job management integration.
- Quote preparation workflows.
- Integration with less common trade software.
- Additional languages.

Delivery is phased, and each phase is priced and accepted separately.

## Optional ongoing support (monthly)

| | **Essential** | **Growth** |
| --- | --- | --- |
| Monitoring of workflow runs and errors | ✓ | ✓ |
| Fixes when something stops working (e.g. a changed password, an expired connection, a provider change) | ✓ | ✓ |
| Small changes (categories, templates, rules) | Small allowance each month | Larger allowance each month |
| Review of AI accuracy using a sample of leads | Quarterly | Monthly |
| Advisory check-in on new AI opportunities | — | Monthly 30-minute call |
| Response times | Agreed in the support terms (business hours) | Agreed in the support terms (business hours, faster urgent response) |

Changes beyond the allowance are quoted or billed hourly. Support plans don't include third-party costs. The monthly allowance hours are set in `internal/pricing-guide.md`.

## Delivery requirements (all packages)

Before work starts, the customer provides everything in the [onboarding checklist](05-onboarding-checklist.md). In particular:
1. **Accounts in the customer's name:** an automation platform (n8n), an Anthropic API account with a spending limit, and Google Workspace or Microsoft 365. Also the job management system for Standard and Custom.
2. **Access through invitations or OAuth sign-in by the customer.** Passwords are never shared by email or text.
3. **A decision-maker** who approves reply templates, safety escalation rules and go-live.
4. **10–20 example enquiries,** with personal details removed where possible, to test and tune against.
5. **Privacy:** the customer's privacy policy must cover the AI and software providers that will process enquiries. VERLONIQ can explain what changes, but the customer should get legal advice on wording.

## What we never promise

- Specific time savings, conversion rates, response times or revenue, unless measured with the customer's own data after go-live.
- 100% accurate classification. AI can be wrong, which is why a person approves every reply and safety rules always escalate.
- That an integration is possible before checking the other system's API and the customer's plan during scoping.
