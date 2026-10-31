# VERLONIQ website — Claude Code project instructions

## Project
VERLONIQ is an Australian AI automation and business systems agency preparing to launch. This repository contains its static, single-page website concept.

## Design direction — IMPORTANT
- **Preserve the existing design and layout.** The founder already likes it.
- Premium, clean, modern, restrained aesthetic: dark charcoal background, lime-green accents, generous space, clear typography.
- Do **not** rebuild with another framework or dramatically change the branding without asking.
- Add only tasteful, subtle animations (e.g. short reveal-on-scroll, unobtrusive hover effects); support `prefers-reduced-motion`.
- Keep the website responsive, readable and fast on mobile.

## Content and business positioning
- Brand: **VERLONIQ** (not FWDWORK).
- Positioning: a Brisbane-based **business improvement and AI automation consultancy** with two equally legitimate, standalone service areas:
  1. **Business Consulting & Improvement:** performance and profitability analysis, operational efficiency reviews, process improvement, strategy and practical recommendations, and paid Business Improvement Assessments (a standalone deliverable with findings, recommendations and an action plan).
  2. **AI Automation & Business Systems:** AI workflow automation, enquiry and lead management, system integrations, admin automation and ongoing support.
  Consulting must not be presented as existing only to sell automation.
- Customer journey: free 20-minute **Business Clarity Call** → optional paid **Business Improvement Assessment** **or** a direct automation proposal → optional implementation → ongoing support. A paid assessment is never mandatory for automation customers.
- Main message: "Smarter business decisions. Better systems. Less busywork." Primary CTA: "Book a Free Clarity Call". Public prices are only "Free", "Quoted" and "Monthly". Don't publish prices or promise savings or financial results.
- **No regulated advice:** VERLONIQ gives business and operational recommendations only. Never advertise financial product, tax, accounting or legal advice, guaranteed financial results, or credentials that haven't been established.
- Be honest about what exists. The AI Lead Assistant demo (`public/lead-assistant.js`) is local JavaScript rules, **not a real AI integration**, and must stay clearly labelled "simulated" until it's connected to a real backend. Never put n8n webhook URLs, secrets or API keys in `public/`.
- The n8n workflow template lives in `automation/n8n/`. Edit `code/`, `prompts/` or `schema/`, then run `node automation/n8n/build-workflow.mjs`; never hand-edit the generated workflow JSON. Don't describe it as operational until it has been imported and tested with real accounts.
- Tests: `node --test tests/*.test.mjs`, plus the browser tests in `tests/browser/`.
- Sales and delivery docs live in `docs/sales-toolkit/`. **This repository is public:** never commit prices, margins or customer details. Internal pricing stays in `docs/sales-toolkit/internal/` (git-ignored). Keep VERLONIQ positioned as a business improvement and AI automation consultancy that doesn't give regulated financial, tax, accounting or legal advice.
- Do not invent customer testimonials, partner endorsements, completed case studies, demonstrated ROI, or promised automations.
- Pricing is illustrative until the founder confirms offerings and rates.
- The enquiry form is wired to the founder's Formspree endpoint in `public/config.js`, so it sends real enquiries wherever that config is deployed. Booking uses the founder's Cal.com free 20-minute call (presented on the site as the Business Clarity Call) (`calBookingUrl` in `public/config.js`), opened from the existing booking panel. Never put paid assessment booking links on the public site; those are shared privately after a proposal is accepted. See `INTEGRATIONS.md`; never invent endpoints or URLs, and never let automated tests send real submissions.

## Development approach
- Start with current `index.html` (no build step required). The website lives in `public/`, served as static assets by a Cloudflare **Workers** project via Workers Builds. `wrangler.jsonc` must stay at the repo root, because preview builds fail without it. Keep internal docs like this file outside `public/`.
- Prefer minimal, reviewable changes over major refactors.
- Use semantic HTML, accessibility-friendly focus states, appropriate labels, responsive CSS, and browser-tested JavaScript.
- Don't commit secrets, API keys, credentials, `.env` files, or customer data; the GitHub repository is public.
- Confirm any new external service, cost or integration with the founder before adopting it.

## Immediate next tasks (ask founder which to start)
1. Audit existing mobile layout, typography, and minor bugs.
2. Add small, accessible scroll and hover animations while retaining the design.
3. Refine website copy and services based on final VERLONIQ offerings.
4. Connect a real enquiry/booking workflow, add privacy/legal pages before public launch.
5. Deploy to Cloudflare Pages, attach `verloniq.com`, test HTTPS and forms.

Do not publish to the main domain or activate paid services without explicit approval.
