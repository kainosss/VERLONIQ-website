# VERLONIQ — AI Automation Agency Website Concept

This is a self-contained, responsive static website concept built as a distinct, original design. It is not a copy of another agency website.

## Preview it locally

Open `index.html` in Chrome, Firefox, Safari or Edge. No installation is needed. Google Fonts require internet; system-font fallbacks are provided.

To preview it the way it will be served (root-relative favicon and 404 page), run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

## What works

- Responsive navigation (mobile, tablet, desktop), mobile menu, and highlighting of the section in view
- Five VERLONIQ services: workflow automation, software integrations, AI enquiry handling, custom internal tools and ongoing support
- Interactive browser-only example that parses a fictional enquiry into reviewable fields (customer, organisation, contact details, category, priority, next action, draft reply)
- Three sample messages to test different cases; Ctrl/⌘ + Enter runs the demo
- Pricing (illustrative) and FAQ sections
- Assessment modal in **demo mode**: **Copy my brief** copies data to your local clipboard only — nothing is sent or stored
- Subtle reveal-on-scroll, hover and transition effects; all motion is disabled for visitors who prefer reduced motion
- Keyboard accessibility: skip link, visible focus states, a focus-trapped modal, and Escape to close the menu or modal

## Not yet connected

- There is **no real AI model**, email inbox, CRM, Make/n8n scenario, lead database or booking platform connected.
- The enquiry example uses transparent deterministic JavaScript rules; it is a concept demonstration, not a proven automation.
- The assessment form does not transmit leads. Connect a real consent-based form system before publishing a live business website.
- `VERLONIQ` is the current preferred brand concept. Final business, trade mark and domain registrations should still be completed before launch.
- Remove the concept banner and revise statements only once actual operations, pricing and delivery capabilities are established.

## Deployment

The site is prepared for **Cloudflare Pages** (`_headers`, `404.html`, `robots.txt`, `sitemap.xml`, favicon and social-share image). See [`DEPLOYMENT.md`](DEPLOYMENT.md) for preview-deployment steps and the launch checklist. Do not attach `verloniq.com` or use the site for real customer acquisition until the real contact/booking workflow, privacy policy, business details and service terms are in place.

## Suggested next build

1. Finalise the VERLONIQ business registrations and domain setup.
2. Build the genuine enquiry → review automation in a test Make or n8n environment.
3. Connect a legitimate booking service or contact form and verify data delivery and consent.
4. Set actual package inclusions, support policies and client-facing terms.
5. Add your own demonstration recording and real, permissioned case studies when available.
