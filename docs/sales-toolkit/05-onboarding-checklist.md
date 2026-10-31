# Customer onboarding checklist — before implementation starts

Complete this after the proposal is accepted and the deposit is paid. **The delivery timeline starts once every required item is ticked.** Use it as a pre-check during technical scoping, so nothing surprises you later.

Copy this list per customer, e.g. into a private folder or the customer's project tracker. Don't store customer credentials anywhere in this repository.

**Customer:** {{name}} **Package:** {{Basic / Standard / Custom}} **Proposal ref:** {{VQ-P-…}} **Kickoff date:** {{date}}

## 1. Agreement and contacts
- [ ] Proposal signed (or accepted in writing) and terms of engagement accepted
- [ ] Deposit invoice paid
- [ ] **Decision-maker** named, who approves templates, safety rules, acceptance test and go-live: {{name, phone, email}}
- [ ] **Day-to-day contact** named, if different: {{name}}
- [ ] **Urgent / on-call contact** for safety flags: {{name, phone}}, plus after-hours arrangement: {{details or "none"}}
- [ ] Preferred communication channel and weekly check-in time agreed

## 2. Business information (for AI instructions and reply templates)
- [ ] Legal business name, trading name, ABN, licence numbers to mention in replies (if any)
- [ ] Trade(s) and services offered, **and services not offered**, so they're politely declined
- [ ] Service area: suburbs or postcodes or radius, and how to handle out-of-area enquiries
- [ ] Business hours, after-hours or emergency service details
- [ ] Reply sign-off and tone: formal or friendly; use first names?
- [ ] **Approved safety wording** for hazards, e.g. gas smell, burning smell, flooding, break-in. **Customer to approve** before go-live.
- [ ] Information they always need before booking or quoting, e.g. address, photos, room sizes, number of cameras
- [ ] Job categories they use internally, if any (to match the lead register to their system)
- [ ] 10–20 **example enquiries**, with personal details removed where possible, covering urgent, routine and quote enquiries

## 3. Accounts — owned by the customer
Each account is in the **customer's business name**, paid by the customer, with VERLONIQ added as a user or given access by OAuth sign-in. **Never accept passwords by email or text.** If a password must be shared, use a password manager's secure sharing, and the customer rotates it at handover.

- [ ] **Automation platform:** an n8n account (n8n Cloud plan or self-hosted), owned by the customer, with VERLONIQ invited as a member
- [ ] **AI provider:** an Anthropic API account owned by the customer, with:
  - [ ] a payment method added by the customer
  - [ ] a **monthly spend limit** set, amount: {{AUD/USD}}
  - [ ] an API key created **for this automation only**, entered directly into n8n by the customer or by VERLONIQ during a screen-share. It's never pasted into email.
- [ ] **Email:** Google Workspace or Microsoft 365 mailbox that will hold the reply drafts: {{address}}
- [ ] **Lead register:** a Google Sheet created in the customer's Drive, *or* (Standard) job management system access with API permissions confirmed for their plan
- [ ] **Enquiry sources:**
  - [ ] Website form: who can edit the website (or the web developer's contact) to point the form at the workflow
  - [ ] Shared inbox: forwarding rules or access, confirmed with the mailbox owner
- [ ] *[Standard / Custom]* SMS or alert provider account, if urgent alerts are by SMS

## 4. Permissions (least privilege)
- [ ] OAuth connections are made by the **customer signing in**, so VERLONIQ never sees their password
- [ ] Google or Microsoft access limited to **one mailbox** and **one spreadsheet or folder**
- [ ] Email permission allows **creating drafts**. No automation is configured to send.
- [ ] Job system API key limited to creating and reading leads (where the system allows scoped keys)
- [ ] Multi-factor authentication on for every account involved (n8n, Anthropic, Google or Microsoft, job system)
- [ ] VERLONIQ's access recorded in the access register below, for removal at the end of the engagement

| System | Access given to VERLONIQ | Granted by | Date | Remove at |
| --- | --- | --- | --- | --- |
| {{n8n}} | {{member}} | {{name}} | {{date}} | {{end of hypercare / support}} |

## 5. Privacy, data and approvals
- [ ] The customer has reviewed which providers will process enquiries (n8n host, Anthropic, Google or Microsoft, job system, SMS provider)
- [ ] The customer's **privacy policy updated** to cover these providers and any overseas processing. Customer to get legal advice on wording; VERLONIQ explains the data flow.
- [ ] Agreed what customers should **not** send in enquiries, e.g. alarm codes and passwords, especially for security businesses
- [ ] Retention settings agreed: how long leads stay in the register, and n8n execution-data retention
- [ ] Staff who will approve drafts identified and told about the new process
- [ ] **Reply templates approved** by the decision-maker
- [ ] **Safety escalation rules approved** by the decision-maker

## 6. Testing and go-live approvals
- [ ] Test plan agreed: 10 enquiries including at least one safety case, one missing-details case and one quote
- [ ] Acceptance test passed and **signed off in writing**
- [ ] Go-live date and time agreed (avoid Friday afternoons)
- [ ] Rollback plan understood: if anything goes wrong, deactivate the workflow and enquiries continue to arrive as before
- [ ] Training session(s) booked

## 7. Handover (end of hypercare)
- [ ] Customer has admin ownership of every account. VERLONIQ is a removable member only.
- [ ] Written guide delivered (how to approve drafts, what the statuses mean, what to do if something breaks)
- [ ] Test data deleted. VERLONIQ keeps no customer enquiries.
- [ ] VERLONIQ access removed, **or** retained under a signed support plan (record which)
- [ ] Support plan offered: {{accepted / declined}}
