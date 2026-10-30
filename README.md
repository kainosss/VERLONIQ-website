# VERLONIQ — AI Automation Agency Website Concept

This is a self-contained, responsive static website concept built as a distinct, original design. It is not a copy of another agency website.

## Preview it locally

The website lives in [`public/`](public/). That is the only directory published to Cloudflare Pages. Internal notes (`CLAUDE.md`, this README, `DEPLOYMENT.md`) stay at the repository root and are not published.

Open `public/index.html` in Chrome, Firefox, Safari or Edge. No installation is needed. Google Fonts require internet; system-font fallbacks are provided.

To preview it the way it will be served (root-relative favicon, 404 page), run `python3 -m http.server 8000 -d public` and open http://localhost:8000. To also apply the Cloudflare security headers, run `npx wrangler dev` from the repository root.

## What works

- Responsive navigation (mobile, tablet, desktop), mobile menu, and highlighting of the section in view
- Positioning: "Find out what your business could automate." Five services (AI and process automation, system integrations, AI opportunity assessments and workflow consulting, custom internal tools, ongoing support and AI advisory)
- Customer journey: a free discovery call, then either an optional paid assessment or a direct implementation quote, then implementation and optional support
- **AI Lead Assistant demo** (simulated) for trade businesses: choose a fictional electrician, plumber, air-conditioning or security business, pick or type an enquiry, and see the job category, urgency, safety flags, location, requirements, missing information and an editable reply draft for approval, plus a demo lead register. Rules run in the browser (`public/lead-assistant.js`); no AI, nothing sent or stored. Ctrl/⌘ + Enter runs it.
- "Working with VERLONIQ" engagement options (no published prices) and FAQ
- Enquiry form ready for **Formspree** (name, business, email, optional phone, industry, team size, service, process description, consent), with validation, spam protection (honeypot, timing, optional Cloudflare Turnstile), a duplicate guard and success/error messages. It stays in **demo mode** (nothing is sent) until an endpoint is set in `public/config.js`.
- "Book a Free Discovery Call" panel for the **Free 30-Minute Workflow Discovery Call** on **Cal.com**. It shows a placeholder until a booking URL is set in `public/config.js`.
- Draft Privacy Policy (`public/privacy.html`) and Terms of Use (`public/terms.html`), both marked as drafts for review

See [`INTEGRATIONS.md`](INTEGRATIONS.md) for how to activate the form and booking.

## AI Lead Assistant automation (n8n)

[`automation/n8n/`](automation/n8n/) contains an importable n8n workflow template. It covers the full flow from enquiry webhook, AI classification and Google Sheets lead register to Gmail draft and human approval, along with schemas, the AI prompt, sample enquiries and setup and testing docs. **It isn't operational until it's imported and tested with real credentials**: see [`automation/n8n/README.md`](automation/n8n/README.md).

## Tests

```bash
node --test tests/*.test.mjs
```

This runs the demo engine and n8n Code node unit tests, with no dependencies. Browser tests for the demo live in `tests/browser/` and need Playwright plus `npx wrangler dev`; see the header of each file. An optional local n8n end-to-end test is at `automation/n8n/test/run-local-e2e.sh`.
- Subtle reveal-on-scroll, hover and transition effects; all motion is disabled for visitors who prefer reduced motion
- Keyboard accessibility: skip link, visible focus states, a focus-trapped modal, and Escape to close the menu or modal

## Not yet connected

- There is **no real AI model**, email inbox, CRM, Make/n8n scenario, lead database or booking platform connected.
- The enquiry example uses transparent deterministic JavaScript rules; it is a concept demonstration, not a proven automation.
- The enquiry form does not transmit leads until a Formspree endpoint is configured and tested. Booking stays a placeholder until a Cal.com link is configured.
- `VERLONIQ` is the current preferred brand concept. Final business, trade mark and domain registrations should still be completed before launch.
- Remove the concept banner and revise statements only once actual operations, pricing and delivery capabilities are established.

## Deployment

The site is deployed by **Cloudflare Workers Builds** (static assets). [`wrangler.jsonc`](wrangler.jsonc) serves the `public` directory, and there's no build command. That directory holds `_headers`, `404.html`, `robots.txt`, `sitemap.xml`, the favicon and the social-share image. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for preview-deployment steps and the launch checklist. Do not attach `verloniq.com` or use the site for real customer acquisition until the real contact/booking workflow, privacy policy, business details and service terms are in place.

## Suggested next build

1. Finalise the VERLONIQ business registrations and domain setup.
2. Build the genuine enquiry → review automation in a test Make or n8n environment.
3. Connect a legitimate booking service or contact form and verify data delivery and consent.
4. Set actual package inclusions, support policies and client-facing terms.
5. Add your own demonstration recording and real, permissioned case studies when available.
