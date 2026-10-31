# Sales process — from first contact to ongoing support

One page per stage: what happens, who does it, what has to be true before moving on, and which document to use. Timeframes are targets, not promises to customers.

```
0 Lead → 1 Discovery call (free, 20 min) → 2 Technical scoping → 3 Proposal → 4 Acceptance
  → 5 Onboarding → 6 Build & test → 7 Go-live & hypercare → 8 Optional support → 9 Review & referral
```

A paid AI opportunity assessment is **optional**. Offer it only when a business wants help working out *what* to automate. Trade businesses that already know their enquiry handling is the problem go straight from discovery to scoping and a direct quote. This matches the journey on the website.

---

### 0. Lead
- **Sources:** the website enquiry form (Formspree), booking a discovery call (Cal.com, once connected), referrals and direct outreach.
- **Do:**
  - Reply within one business day.
  - Log the lead in a simple pipeline: a Google Sheet or CRM with columns for stage, next action and date.
  - Book the discovery call.
- **Exit when:** a discovery call is booked, or the lead is marked "not now" with a follow-up date.

### 1. Discovery call — free, 20 minutes
- **Goal:** understand how the business handles enquiries today, decide whether the Lead Assistant is a good fit, and agree on the next step. **It's not a sales pitch.**
- **Use:** [discovery call guide](03-discovery-call-guide.md), plus the [demonstration script](06-demo-script.md) if they want to see it (the demo takes 5 of the 20 minutes).
- **Within 24 hours, send** a short recap email: what you heard, the suggested package, the next step, and what you need from them.
- **Exit when one of these is true:**
  - **Qualified:** a book scoping session is booked.
  - **Not a fit:** close politely, and refer elsewhere if you can.
  - **Not now:** schedule follow-up.

### 2. Technical scoping — 30–60 minutes, usually free for Basic and Standard
- **Goal:** confirm what can actually be built before quoting a fixed price.
- **Check:**
  - Enquiry sources and volumes.
  - Email platform (Google or Microsoft).
  - Whether a job management or CRM system exists, and whether its API is available on their plan.
  - Who approves replies, and the after-hours and safety escalation contacts.
  - The privacy policy situation.
  - That 10–20 example enquiries are available.
- **Use:** the [onboarding checklist](05-onboarding-checklist.md) as a pre-check, so nothing surprises you after acceptance.
- **Custom work:** for complex Custom work, offer a **paid scoping session or AI opportunity assessment**, credited against the build if they proceed (an internal decision; see the pricing guide).
- **Exit when:** you can estimate hours confidently, or you decide it's out of scope.

### 3. Proposal — sent within 3 business days of scoping
- **Use:**
  - the [proposal template](04-proposal-template.md)
  - [service packages](01-service-packages.md) for inclusions and exclusions
  - [cost structure](07-cost-structure.md) for third-party costs
- **Before sending:**
  1. Enter the estimated hours and direct costs in `internal/profitability-worksheet.xlsx`. Check that the price is at or above the target-margin floor and the effective hourly rate is acceptable.
  2. Make sure the exclusions and customer responsibilities are specific to this customer.
  3. Estimate the customer's monthly third-party costs, clearly separate from VERLONIQ's fees.
  4. Re-read for anything that promises outcomes. Remove it.
- **Walk them through it:** offer a 15-minute call to go through the proposal rather than just emailing it.
- **Follow-up cadence:** day 3 (questions?), day 7 (anything to adjust?), day 14 (close the loop). The proposal is valid for 30 days.
- **Exit when:** the proposal is accepted, revised or declined. Record the reason for a decline.

### 4. Acceptance
- **Needed before any work starts:**
  1. The signed proposal, with acceptance of VERLONIQ's terms of engagement. **These terms are still to be drafted and legally reviewed.**
  2. The deposit invoice paid. Suggested: 50% on acceptance.
  3. A named decision-maker and day-to-day contact.
- **Then:** send the onboarding pack (the [onboarding checklist](05-onboarding-checklist.md)) and book the kickoff.

### 5. Onboarding — target: within 5 business days of acceptance
- **Do:** collect everything on the [onboarding checklist](05-onboarding-checklist.md). Accounts must be in the **customer's** name, and access comes through invitations or OAuth, never shared passwords.
- **Exit when:** the checklist is complete and signed off. **The delivery clock starts here.**

### 6. Build & test
- **Runbook:** [`automation/n8n/README.md`](../../automation/n8n/README.md). Import the template, connect credentials, adapt the business profile, categories and reply templates, then rebuild.
- **Test:**
  - Run the customer's example enquiries and the test checklist in the runbook.
  - Fix anything wrong, then do the tuning rounds included in the package.
- **Acceptance test with the customer:** 10 test enquiries end to end. Confirm the sheet rows, drafts, urgent alerts, and that **nothing is sent automatically**.
- **Exit when:** the customer signs off the acceptance test in writing (email is fine).

### 7. Go-live & hypercare
- **Go-live:**
  - Switch the enquiry source to the live workflow.
  - Activate the workflow and watch the first live enquiries.
  - Invoice the balance. Suggested: 50% at go-live, due in 14 days.
- **Training:** run the session(s) in the package.
- **Hypercare:** 14 days for Basic, 30 days for Standard. Fix issues, adjust templates, and review a sample of real classifications with the customer.
- **Exit when:** hypercare ends. Hold a handover call and offer a support plan.

### 8. Optional ongoing support
- **Offer:** Essential or Growth (see [service packages](01-service-packages.md)), billed monthly, with a notice period set in the terms.
- **Monthly:**
  - Check workflow errors and expired connections.
  - Review a sample of leads for accuracy and safety flags.
  - Make small changes within the allowance.
- **Quarterly:** track actual support hours against the plan in `internal/profitability-worksheet.xlsx` (Support Plans tab). Adjust the plan if it's consistently over.

### 9. Review & referral
- **About 6 weeks after go-live:** a short review of how many enquiries were handled and how staff find it, using the customer's own numbers.
- **Testimonials and case studies:** only with the customer's **written permission**, using their real words. Never invent or embellish.
- **Referral:** ask whether they know another trade business with the same problem.

---

## Roles (one-person business)

| Activity | Owner |
| --- | --- |
| Sales calls, proposals, acceptance | Founder |
| Build, testing, training | Founder or a contractor (costs go into the profitability worksheet) |
| Approving reply templates and go-live | Customer's decision-maker |
| Sending replies to their customers | Customer's staff, always |

## Pipeline stages (for whatever tracker you use)

`New lead → Discovery booked → Discovery done → Scoping booked → Proposal sent → Won (awaiting onboarding) → In delivery → Hypercare → On support → Closed lost / Not now`
