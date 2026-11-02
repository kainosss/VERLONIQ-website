# AI Lead Assistant: customer-facing explanation

Use this in a sales conversation or demonstration. It describes what the automation does, what stays with the customer's team, and what it depends on. It contains **no prices, savings figures, testimonials or guarantees**; quote those only through a written proposal.

> **Before showing it:** the version you demonstrate is either the website's **simulated** demo (browser rules, no AI) or the **n8n demo workflow** (mock AI, nothing is sent). Say so. Don't describe either as a live AI service, and don't claim it's running for any customer yet.

---

## The short version (30 seconds)

> "When a new enquiry comes in, the Lead Assistant reads it, works out what the job is and how urgent it looks, picks out the customer's details, and notes anything you'd still need to ask. It writes a draft reply in your business's voice and logs the enquiry in a simple spreadsheet. Then it lets your team know. **It never replies to the customer by itself.** Someone on your team checks the draft, edits it if needed and sends it."

## What it does, step by step

1. **Receives the enquiry** from a supported channel, such as your website form.
2. **Checks the submission:** incomplete or invalid submissions are rejected, and repeats aren't processed twice.
3. **Reads and sorts it with AI:** job type, a one-line summary, the customer's details as written, the location, and what's still missing (address, photos, timing and so on).
4. **Assesses urgency.** This is an *assessment* for your team to confirm, not a promise. Possible safety issues, such as gas smells, burning smells, sparks, water near power or break-ins, are always flagged by fixed rules, even if the AI misses them.
5. **Prepares a draft reply** that thanks the customer and asks for anything missing. For safety situations it starts with basic safety advice for your team to check.
6. **Logs the enquiry** as a row in your Google Sheet, so nothing sits forgotten in an inbox.
7. **Tells your team:** an email to your office address with the summary, the urgency assessment and what to check. Urgent leads are marked clearly.
8. **Your team decides.** They review the draft in Gmail, edit it and send it themselves, or phone the customer.

## What stays with your team

- **Every reply to a customer.** Drafts are never sent automatically.
- **Pricing, booking times and promises.** The draft is told not to quote prices, promise arrival times or guarantee outcomes.
- **Safety calls.** Flagged enquiries say "call the customer first".
- **Anything unusual:** vague requests, complaints, or messages that try to manipulate the system. These are flagged for a closer look.

## Built-in safeguards

- **It doesn't make details up.** If the AI reports a phone number, email or address that isn't in the enquiry, it's removed and noted. Missing details are listed rather than guessed.
- **Its answers are checked.** Anything malformed or refused is set aside for a person to handle manually.
- **Nothing gets lost.** If the AI service is down, the enquiry is still logged for manual review. If the spreadsheet is unavailable, the full enquiry is emailed to your team instead.
- **It catches risky drafts.** Drafts containing links, other email addresses or payment details are flagged before anyone sends them.
- **Your accounts, your data.** It runs on your own n8n, Google and AI provider accounts, and your access keys stay in your accounts.

## What it depends on (be upfront)

- **Software:** an n8n account (cloud or self-hosted), a Google account for Gmail and Sheets, and an AI provider account (Anthropic by default). The customer pays these providers directly; see `07-cost-structure.md`.
- **Enquiry channels:** each channel (website form, shared inbox, other tools) is connected and tested during setup. Not every tool offers a suitable connection; we confirm this in scoping.
- **AI accuracy:** AI can misread an enquiry. That's why urgency is labelled an assessment and a person approves every reply.
- **Privacy:** enquiry details are processed by the AI provider, Google and the n8n host. Your privacy policy should say so, and we'll point out where.

## Answers to common questions

- **"Will it reply to my customers on its own?"** No. In this version it only prepares drafts. Sending is always a person's decision.
- **"What if it gets the urgency wrong?"** Urgency is an assessment for your team to confirm. Safety keywords are caught by fixed rules regardless of the AI, and urgent leads are highlighted.
- **"Does it only work for electricians and plumbers?"** No. The demo uses fictional trade businesses, but the setup is tailored to each business's services, wording and sign-off.
- **"What does it cost to run?"** The software and AI usage are billed by those providers, and we estimate them for your enquiry volume in the proposal. VERLONIQ's setup and optional support are quoted separately.
- **"Is the demo real AI?"** The website demo is a simulation using simple rules, and the demonstration workflow uses test rules. A real setup uses an AI model connected to your own accounts, after testing.
