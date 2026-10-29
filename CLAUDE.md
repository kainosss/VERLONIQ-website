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
- Positioning: AI automation, business process automation, integrations, and ongoing support for small and mid-sized Australian businesses.
- Be honest about what exists. The current demo is local JavaScript rules, **not a real AI integration**.
- Do not invent customer testimonials, partner endorsements, completed case studies, demonstrated ROI, or promised automations.
- Pricing is illustrative until the founder confirms offerings and rates.
- All contact forms are currently **demo only** and do not transmit leads. Do not make them appear functional without actually wiring, testing and securing a backend/service. The enquiry form (Formspree) and booking (Cal.com) switch on only via `public/config.js` — see `INTEGRATIONS.md`; never invent endpoints or URLs.

## Development approach
- Start with current `index.html` (no build step required). The website lives in `public/` (Cloudflare Pages output directory); keep internal docs like this file outside `public/`.
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
