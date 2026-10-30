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
- Positioning: hybrid consulting + implementation for small and mid-sized Australian businesses — AI and business process automation, system integrations, AI opportunity assessments and workflow consulting, custom internal tools, ongoing support and AI advisory.
- Customer journey: free 30-minute workflow discovery call → optional paid AI opportunity assessment **or** a direct implementation quote → implementation → optional monthly support/advisory. A paid assessment is never mandatory.
- Main message: "Find out what your business could automate." Primary CTA: "Book a Free Discovery Call". Don't publish prices or promise savings without evidence.
- Be honest about what exists. The AI Lead Assistant demo (`public/lead-assistant.js`) is local JavaScript rules, **not a real AI integration**, and must stay clearly labelled "simulated" until it's connected to a real backend. Never put n8n webhook URLs, secrets or API keys in `public/`.
- The n8n workflow template lives in `automation/n8n/`. Edit `code/`, `prompts/` or `schema/`, then run `node automation/n8n/build-workflow.mjs`; never hand-edit the generated workflow JSON. Don't describe it as operational until it has been imported and tested with real accounts.
- Tests: `node --test tests/*.test.mjs`, plus the browser tests in `tests/browser/`.
- Do not invent customer testimonials, partner endorsements, completed case studies, demonstrated ROI, or promised automations.
- Pricing is illustrative until the founder confirms offerings and rates.
- The enquiry form is wired to the founder's Formspree endpoint in `public/config.js`, so it sends real enquiries wherever that config is deployed. Booking (Cal.com) is still a placeholder until the founder supplies its URL. See `INTEGRATIONS.md`; never invent endpoints or URLs, and never let automated tests send real submissions.

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
