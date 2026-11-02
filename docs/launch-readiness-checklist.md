# VERLONIQ: launch-readiness checklist (before public marketing)

Prepared on 2 November 2026 from the repository on `main`, with the brand-positioning changes applied.

**Scope:**
- Every item needs **your action or approval**. Nothing here has been changed automatically.
- No legal disclaimers were removed, no access protection was weakened and no tracking was turned on.
- This session couldn't reach verloniq.com or the `*.workers.dev` previews (its network blocks them), so anything about the live site is marked **unverified**.

## 1. Site access for ordinary visitors
- [ ] **Confirm https://verloniq.com and https://verloniq.com/automation load for anonymous visitors.** Use a private window, then a phone on mobile data. There should be no Cloudflare Access login or challenge page. *(Unverified from here.)*
- [ ] If Cloudflare Access (Zero Trust) or a WAF rule protects the production hostname, decide whether to remove it **for verloniq.com only**. Keep protecting the preview `*.workers.dev` addresses if you prefer; they're already `noindex`.
- [ ] Check that `www.verloniq.com` redirects or resolves as intended, and that HTTPS works on both.

## 2. Pre-launch banners and draft messages (both pages)
- [ ] **Top banner:** "PRE-LAUNCH PREVIEW · SAMPLE WORKFLOWS" (homepage) and "PRE-LAUNCH PREVIEW · ILLUSTRATIVE WORKFLOWS" (`/automation`). Decide when to remove them, and remove both together.
- [ ] **Footer:** "Pre-launch preview — business registration to be finalised; privacy policy and terms of use in draft." This should only change once the registration and legal pages below are final.
- [ ] Keep the **"simulated"** labels on the AI Lead Assistant demo. They must stay until the demo is connected to a real backend (`CLAUDE.md`).

## 3. Privacy policy and terms (`/privacy`, `/terms`)
Both pages are marked **DRAFT · FOR REVIEW · NOT YET IN EFFECT**, are `noindex`, and are left out of the sitemap. Still open:
- [ ] Legal entity name and **ABN** (currently "[… ABN to be confirmed]").
- [ ] Calendar provider connected to Cal.com (placeholder in the privacy policy).
- [ ] Privacy contact email, provider data regions, retention period and publication date (see `INTEGRATIONS.md`).
- [ ] Professional review (lawyer or privacy professional). Then remove the draft labels and `noindex`, and add both pages to the sitemap. That's a separate change, done only on your instruction.

## 4. Enquiry form (Formspree) and Cloudflare Turnstile
- [ ] **Formspree endpoint** is live (`formspree.io/f/xwllqgvn`). Send one enquiry marked TEST from **each** page (homepage and `/automation`) and confirm both arrive. Automation-page enquiries carry `enquiry_source: automation-page`.
- [ ] **Turnstile:** the Site Key is in `config.js`. Confirm in the Formspree dashboard whether the **Secret Key** has been added under Cloudflare Turnstile (with reCAPTCHA off), and that a test enquiry passes. *(The status in Formspree is unknown from here.)*
- [ ] **Fallback email:** `contactEmail` is still empty in `config.js`, so a failed submission shows no "or email us" fallback. Add it once sales@ forwarding is confirmed.

## 5. Booking and confirmations
- [ ] Book a test slot on the Cal.com free 20-minute call. Confirm the **confirmation and reminder emails** arrive and the event name reads "Free 20-Minute Business Clarity Call", then cancel it.
- [ ] Decide whether enquirers should get an **auto-reply** (Formspree's autoresponse may need a paid plan; check before enabling). Today they see an on-page confirmation only.

## 6. Lead attribution and tracking (none is active)
- [ ] **No analytics run on either page.** `/automation` records click events only inside the visitor's browser (`window.vqAnalytics`), which sends nothing.
- [ ] Choose a measurement option (`INTEGRATIONS.md` → "Measuring conversions"): Cloudflare Web Analytics (needs a CSP change in `_headers`), Cloudflare Zaraz, or ad pixels. Each needs your approval and a privacy-policy update.
- [ ] **Attribution available today:**
  - Formspree's `enquiry_source` separates automation-page enquiries from homepage ones.
  - Cal.com bookings aren't attributed to a page. Consider separate booking links or UTM parameters later.
- [ ] Before paid ads, decide how leads and bookings will be counted (e.g. Formspree and Cal.com exports reviewed weekly).

## 7. Other items noticed
- [ ] The homepage social image (`og-image.png`) predates the current positioning. A refreshed image is optional.
- [ ] The AI Lead Assistant n8n workflow (PR #8) is separate and still inactive. It isn't needed for launch.
