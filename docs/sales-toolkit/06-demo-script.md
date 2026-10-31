# Demonstration script — AI Lead Assistant (5 minutes)

Use the **Interactive demo** section of the VERLONIQ website (nav: *Interactive demo*). Share your screen, or turn a laptop towards the customer.

> ### Two different things — never blur them
> | | **Website demonstration (what you're showing)** | **Live AI workflow (what VERLONIQ builds)** |
> | --- | --- | --- |
> | How it works | Simple keyword rules running in the web browser | An AI model (Claude) in an n8n workflow, plus safety rules |
> | Data | Fictional businesses and enquiries | The customer's real enquiries |
> | Connected to email or a spreadsheet? | No. Nothing is sent or saved | Yes. Google Sheets or the job system, and Gmail or Outlook **drafts** |
> | Accuracy | Scripted; not a measure of real performance | Tested and tuned on the customer's own examples |
> | Status | Ready to show | Template built and tested locally. **Must be set up and tested in each customer's accounts before it's operational** |
>
> Say this out loud at the start **and** the end. The page itself labels everything "Simulated".

## Before the call (2 minutes)
- Open the website, scroll to the demo, and hard-refresh so the register is empty and the reference numbers start at VQ-DEMO-001.
- Pick the trade closest to the customer. The script uses **electrical**. For a plumber, swap step 2 to *Pipewell Plumbing → Urgent fault* (burst pipe near power points). For air-con, use *Coolbreak → Urgent fault* (not cooling, elderly mum). For security, use *Guardline → Urgent fault* (break-in).
- Close other tabs and silence notifications.

---

## Script

### 0:00–0:30 — Set expectations
> "I'll show you a five-minute simulation of what we call the AI Lead Assistant. It's important to say up front: **this website version is a scripted demonstration.** It runs simple rules in the browser on made-up businesses and enquiries. No AI is involved, and nothing is sent anywhere. The real version uses AI on your actual enquiries, and I'll explain the difference at the end."

### 0:30–1:00 — The problem, in their words
> "You mentioned {{their pain point from discovery, e.g. 'urgent jobs getting buried in the inbox while you're on site'}}. Let's see how an assistant would handle a new enquiry like that."

Point to **1. Choose a fictional business** → **Voltara Electrical** (already selected) and **2. Choose a sample enquiry** → **Urgent fault** (already selected). Read the enquiry aloud:

> *"Hi, it's Mia Thompson. Our power keeps tripping and there's a burning smell coming from the switchboard at our house in Chermside. We have a newborn at home so we need someone today please. Call me on 0412 555 018."*

### 1:00–2:15 — Urgent and unsafe job (the key moment)
Click **Process enquiry (simulated)**. Point out the five steps ticking through, then the result:
- The red banner: **"⚠ Flagged for urgent human review — Possible electrical fire risk: Call the customer now…"**
- **Urgency:** *Emergency — safety risk*. **Job category:** *Electrical safety hazard*.
- **Customer requirements:** includes *Vulnerable occupant: newborn* and *Preferred timing: Today*.
- **Missing information:** *Street address for the visit*.

> "The important part is the red banner. Anything that sounds dangerous — a burning smell, sparks, gas, water near power — gets flagged so a person calls the customer straight away. In the real system, those safety rules sit on top of the AI, so even if the AI misreads something, the flag still goes up."

Scroll to the **draft reply**:
> "It's also drafted a reply. It includes basic safety advice and says you'll call — but notice it says *awaiting your approval*. Nothing goes to the customer unless your team sends it."

### 2:15–3:15 — Missing information and the approval step
Choose **Coolbreak Air** → **Installation quote** → **Process enquiry (simulated)**. The enquiry is from "Olivia" asking for 2 split systems, with no contact details or suburb.
- **Urgency:** *Quote — no fixed deadline*.
- **Missing information:** *Phone number or email address · Job address or suburb · Approximate room sizes · Preferred timing*.

> "This one's the opposite — not urgent, but you can't quote it yet. Instead of someone writing back to ask, the draft already asks for exactly what's missing."

Click into the draft, change a word (e.g. add the business's usual sign-off), then click **Approve draft (demo)**.
> "Your team can edit before approving. In this demo, approving just marks it as approved — it says *Nothing was sent*. In the real system, your staff send it from your own inbox."

### 3:15–3:45 — The lead register
Scroll to **Demo lead register**:
> "Every enquiry lands here with a reference number, urgency and status. In the real system this is a Google Sheet or your job management software, so nothing slips through and you can see at a glance what still needs a reply."

Point out the two rows, the red *Emergency* pill on Mia's job, and the *Approved · not sent (demo)* status.

### 3:45–4:30 — From simulation to the real thing
> "So that was the simulation. Here's what we'd actually set up for you:
> 1. Your website form or inbox sends each new enquiry to an automation running in **your own** n8n account.
> 2. An AI model reads it and fills in the same details you just saw — category, urgency, location, what's missing — and drafts a reply in your tone.
> 3. Our safety rules check it again and can only ever *raise* the urgency.
> 4. It's saved to your lead register, and a draft appears in your Gmail or Outlook for your team to check and send.
>
> We set it up in your accounts, test it on 10 to 20 of your real enquiries, tune it, and train your team before it goes live. And we're upfront about the limits: AI can get things wrong, which is why a person approves every reply."

*If asked whether it's running for other businesses yet:* answer honestly. "We've built and tested the workflow, and each business's setup is configured and tested in its own accounts before it goes live."

### 4:30–5:00 — Next step
> "Does that look like it would help with {{their pain point}}? The next step would be a technical scoping session — about 45 minutes — where I check your email, website and systems, so I can give you a fixed quote with no surprises."

---

## Questions you'll get

| Question | Honest answer |
| --- | --- |
| "Is this real AI?" | "Not this website version. It's a scripted simulation so anyone can try it safely. The real system uses an AI model on your own enquiries." |
| "How accurate is it?" | "We don't quote a percentage. We test it on your own example enquiries before go-live, a person approves every reply, and safety flags always go to a person." |
| "Will it reply to my customers by itself?" | "No. It only creates drafts. Your team sends every reply." |
| "What will it cost to run?" | "You pay the software and AI usage directly. For most trade businesses that's a modest monthly amount, which I'll estimate in the proposal. Our fee is separate." (See [cost structure](07-cost-structure.md).) |
| "Can it put jobs straight into ServiceM8 / simPRO / Tradify…?" | "Often, if your system and plan allow API access. I'll confirm in scoping before we promise it." |
| "What about our customers' privacy?" | "Everything runs in accounts you own. We'll show you which providers process the enquiries so your privacy policy can cover them." |

## Don'ts
- Don't type the prospect's real customer details into the demo. It's fine technically, since nothing leaves the browser, but it sets a poor example. Use the samples.
- Don't call the demo results "AI results", or imply accuracy figures.
- Don't promise integrations, timelines or prices on the spot.
