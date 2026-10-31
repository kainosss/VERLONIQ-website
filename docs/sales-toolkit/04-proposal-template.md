# VERLONIQ proposal template — AI enquiry automation

> **How to use (delete this box before sending)**
> - Replace every `{{placeholder}}`. Delete sections in *[italic brackets]* that don't apply.
> - Price check first: enter the hours and direct costs in `internal/profitability-worksheet.xlsx`, and make sure the price meets the target margin.
> - Use the customer's own words in the "business problem" section. **Don't promise savings, response times or ROI.**
> - Third-party costs are an **estimate**, paid by the customer directly. Verify current vendor pricing before sending.
> - Attach VERLONIQ's terms of engagement. **These are still to be drafted and legally reviewed. Don't send a proposal for signature until they exist.**
> - Export to PDF with the VERLONIQ logo (dark charcoal and lime) for a professional finish.

---

# Proposal: AI enquiry automation for {{Customer business name}}

**Prepared for:** {{Contact name}}, {{Role}}, {{Customer business name}}
**Prepared by:** {{Your name}}, VERLONIQ, Brisbane, Queensland, {{ABN}}
**Date:** {{date}} **Proposal reference:** {{VQ-P-YYYY-NNN}} **Valid until:** {{date + 30 days}}

---

## 1. Summary

{{Customer business name}} receives about {{volume}} new enquiries a week through {{sources}}. VERLONIQ will set up an **AI Lead Assistant** that reads each new enquiry and records it in a lead register. It flags urgent and unsafe jobs for an immediate call, and prepares a reply **draft** for your team to check and send.

**Recommended package:** {{Basic / Standard / Custom}}
**Implementation:** {{AUD amount}} + GST (fixed price)
**Optional monthly support:** {{plan}} at {{AUD amount}} + GST per month
**Estimated go-live:** {{N}} weeks after onboarding is complete

## 2. The business problem

*[Use their words from the discovery call. Two to four short points.]*

- {{e.g. "Enquiries arrive through the website form and the office inbox, and urgent jobs can sit unread while the team is on site."}}
- {{e.g. "Staff re-type customer details into {{job system}} and chase missing addresses before they can book."}}
- {{e.g. "After-hours enquiries aren't seen until the next morning."}}

## 3. Recommended solution

```
New enquiry ({{sources}})
  → AI Lead Assistant (your n8n account)
      • sorts the job type and urgency
      • picks out contact details, location and requirements
      • lists what information is missing
      • flags safety risks (e.g. {{gas smell / burning smell / flooding / break-in}}) for an immediate call
  → Lead register ({{Google Sheet / job system}})
  → Reply draft in {{Gmail / Outlook}} → your team checks, edits and sends it
  {{→ Urgent alert to {{on-call contact}} by {{email / SMS}} }}
```

**What stays with your team:** every reply is approved and sent by a person. The assistant never emails your customers on its own. Safety situations are always escalated for a phone call, even if the AI misreads them.

## 4. Scope

### Included
*[Copy from [service packages](01-service-packages.md) and tailor it.]*
- {{e.g. Setup of the AI Lead Assistant on your own n8n account}}
- {{e.g. Connecting {{source 1}}{{, source 2, source 3}}}}
- {{e.g. Lead register in {{Google Sheets / job system}} with urgent-job highlighting}}
- {{e.g. Reply drafts in {{Gmail / Outlook}}, using templates written with you}}
- {{e.g. Safety and urgency rules for {{trade}}, including escalation to {{contact}}}}
- Testing with your example enquiries and {{1 / 2}} tuning round(s)
- {{1 / 2}} training session(s) and a short written guide
- {{14 / 30}} days of post-launch support ("hypercare")

### Not included (exclusions)
- Automatic sending of messages to your customers
- Changes to your website beyond {{adding a form endpoint / embed code}}
- {{e.g. Integration with {{system}} / SMS / phone or voicemail / social media messages}}
- Software subscriptions and AI usage fees, which you pay directly to the providers (section 7)
- Ongoing support after hypercare, unless you choose a support plan
- Anything not listed under "Included". Extra work is quoted separately through a change request.

### Assumptions
- {{N}} enquiry sources and roughly {{volume}} enquiries per week.
- {{System}} allows API access on your current plan (confirmed {{date}} / to be confirmed in week 1).
- You provide the items in section 6 within {{5}} business days of acceptance.

## 5. Delivery milestones

| # | Milestone | What you get | Target timing* |
| --- | --- | --- | --- |
| 1 | Kickoff and onboarding complete | Access confirmed, templates and rules agreed | Week 1 |
| 2 | Build complete | Working assistant in test mode | Week {{1 / 2}} |
| 3 | Testing and tuning | Tested on your example enquiries; adjustments made | Week {{2 / 3}} |
| 4 | Acceptance test | 10 test enquiries checked together; your written sign-off | Week {{2 / 3}} |
| 5 | Go-live and training | Live on {{sources}}; team trained | Week {{2 / 4}} |
| 6 | Hypercare ends | Handover call; support plan option | Go-live + {{14 / 30}} days |

\*Timing starts once onboarding (milestone 1) is complete. Delays in access or approvals move later milestones.

## 6. Your responsibilities

To deliver on time, we need you to:
1. Provide the information, accounts and approvals in VERLONIQ's onboarding checklist. **Accounts stay in your business's name**, and access is given by invitation or by you signing in, never by sharing passwords.
2. Nominate a decision-maker ({{name}}) to approve reply templates, safety escalation rules, the acceptance test and go-live.
3. Provide {{10–20}} example enquiries, with personal details removed where possible.
4. Make sure your privacy policy covers the software and AI providers that will process enquiries. We'll explain what changes; get legal advice on the wording.
5. Have staff review and send every reply draft, and call customers whenever a safety flag is raised.
6. Keep your software subscriptions and AI account active and paid.
7. Tell us about changes to your systems (new email provider, website changes, password resets) that could affect the automation.

## 7. Investment

### VERLONIQ fees (paid to VERLONIQ)

| Item | Amount (AUD, ex-GST) |
| --- | --- |
| {{Package}} implementation (fixed price) | {{amount}} |
| *[Optional]* {{Support plan}}, monthly, starting after hypercare | {{amount}} / month |
| Additional work outside scope | {{hourly rate}} per hour, or quoted in advance |

*[If registered for GST: "GST of 10% will be added to all invoices." If not: "VERLONIQ is not registered for GST; no GST is charged." Confirm with your accountant.]*

**Payment terms:** {{50%}} on acceptance (work starts once paid), {{50%}} at go-live. Invoices are due within {{14}} days. Support plans are billed monthly in advance, with {{30}} days' notice to cancel.

### Third-party costs (paid by you directly to each provider — estimate only)

| Provider | What it's for | Estimated cost |
| --- | --- | --- |
| {{n8n Cloud plan / self-hosting}} | Runs the automation | {{amount}} / month — check current pricing |
| Anthropic (Claude API) | AI processing of each enquiry | About {{amount}} / month at ~{{volume}} enquiries (usage-based, billed in USD) |
| {{Google Workspace / Microsoft 365}} | Email and lead register | Usually already in place |
| *[Optional]* {{SMS provider / job system}} | {{Urgent alerts / lead records}} | {{amount}} |

These estimates are based on providers' published pricing on {{date}} and your expected volumes. Actual charges depend on usage and the providers' pricing, and VERLONIQ doesn't add a margin. See [cost structure](07-cost-structure.md) for why you hold these accounts yourself.

## 8. Acceptance criteria

The project is complete when, in the acceptance test:
- 10 test enquiries (including at least one urgent or safety case and one with missing details) each produce a lead register entry and, where an email address is present, a reply draft.
- Safety cases are flagged for an immediate call.
- No message is sent to customers automatically.
- {{Any customer-specific criterion}}.

## 9. Changes, support and limitations

- **Changes:** requests outside the scope are confirmed in writing with a price and timing impact before work starts.
- **Hypercare:** during the hypercare period, VERLONIQ fixes defects in what was delivered and makes small adjustments at no extra cost.
- **AI limitations:** AI classification can be wrong or incomplete. The system is designed so a person reviews every reply and safety situations are escalated, and it isn't a substitute for your own judgement or safety procedures.
- **Third-party services:** VERLONIQ isn't responsible for outages or pricing changes by third-party providers, but will help restore the automation after a change if you're on a support plan or within hypercare.

## 10. Data and privacy

- Enquiries are processed by the providers listed in section 7, using **your** accounts. VERLONIQ accesses them only to build and support the automation, using access you grant and can revoke.
- VERLONIQ keeps no copies of your customers' enquiries beyond what's needed for testing during delivery, and deletes test data at handover.
- Data handling details are set out in VERLONIQ's terms of engagement {{and data processing terms}}.

## 11. Acceptance

To accept, sign below (or reply "Accepted" from {{decision-maker email}}) and pay the deposit invoice. This proposal and VERLONIQ's terms of engagement {{link / attached}} together form the agreement.

| | {{Customer business name}} | VERLONIQ |
| --- | --- | --- |
| Name | | {{Your name}} |
| Position | | {{Founder}} |
| Signature | | |
| Date | | |

---

*VERLONIQ, AI automation and business systems, Brisbane, Queensland. {{ABN}} · {{email}}*
