# Enquiry form (Formspree) and discovery-call booking (Cal.com)

Both integrations are **built but switched off**. Everything is controlled by one file, [`public/config.js`](public/config.js). None of these values are secrets.

| Setting | Empty (current) | Set to a valid value |
| --- | --- | --- |
| `formspreeEndpoint` | **Demo mode.** The form validates but sends nothing. It shows "DEMO MODE — NOT CONNECTED", the submit button says "Check my details (demo)", and the pre-launch banner says "Enquiry form in demo mode". It never says an enquiry was sent. | **Live.** Submissions go to Formspree, which emails them to you. The demo labels disappear. The pre-launch banner stays. |
| `calBookingUrl` | **Placeholder.** "Book a Free Discovery Call" opens a panel describing the call, labelled "ONLINE BOOKING NOT YET CONNECTED", and offers the enquiry form instead. No times are shown. | **Live.** The panel's "Choose a time" button opens your Cal.com event page in a new tab. |
| `contactEmail` | Not shown. | Shown as a fallback ("…or email sales@verloniq.com") if a submission fails. |
| `turnstileSiteKey` | Off. | Shows Cloudflare Turnstile (an anti-bot check) on the form. Only works once `formspreeEndpoint` is set. |

Anything that isn't in the expected format is ignored, and the site stays in demo or placeholder mode with a console warning. Expected formats: `https://formspree.io/f/…`, `https://cal.com/…` or `https://cal.eu/…`, and a Turnstile site key starting with `0x`.

## Enquiry form

**Fields sent to Formspree:**
- `name`, `business`, `email`, `phone` (optional), `industry`, `team_size`, `service`, `message` and `consent`
- `consent_given_at`, a timestamp
- `_subject`, set to "New VERLONIQ enquiry: &lt;business&gt;"
- `_gotcha`, the honeypot
- `cf-turnstile-response`, only if Turnstile is on

Nothing else is collected. The automated tests check this exact list.

**Protections built into the site:**
- Inline, screen-reader-friendly validation that moves focus to the first problem.
- **Honeypot:** a hidden `_gotcha` field. If it's filled in, nothing is sent and the site shows a neutral error, never a fake success.
- Submissions within 3 seconds of opening the form are held.
- The submit button is disabled while sending.
- **Duplicate guard:** sending the identical enquiry again in the same tab is blocked with a clear message. Only a short code is stored in session storage, never the enquiry itself.
- A 15-second timeout, plus clear messages for Formspree errors and network failures.
- Optional **Cloudflare Turnstile**, which Formspree supports. Its script loads only when the form is live **and** opened.
- `public/_headers` only lets the page send data to `formspree.io`, and only lets Turnstile load from `challenges.cloudflare.com`.

## Discovery-call booking

- Every "Book a Free Discovery Call" button opens an on-site panel titled **Free 30-Minute Workflow Discovery Call**. It explains what the call covers and the possible next steps.
- When live, **Choose a time** opens your Cal.com event page in a new tab. No Cal.com code runs on the site, no availability is shown on the site, and the site never says a booking is confirmed. Cal.com handles confirmation.
- Visitors only ever see open slots for that one event type. They never see your calendar, other events or event titles.

---

## What to configure in Formspree

1. **Account:** sign up at formspree.io with a VERLONIQ business email address. Turn on two-factor authentication.
2. **Form:** create a form called "VERLONIQ website enquiries". **Send me its endpoint** (`https://formspree.io/f/xxxxxxxx`).
3. **Notifications:** set the notification email to **sales@verloniq.com**. Formspree sends a verification email to that address, so set up forwarding for sales@ first and confirm it works.
4. **Restrict to domain:** in the form settings, allow your `*.pages.dev` preview address now and `verloniq.com` later. Check which plan this needs.
5. **Spam filtering:** keep Formspree's automatic spam filtering on. The `_gotcha` honeypot works with no setup.
6. **Optional Cloudflare Turnstile** (recommended once the form is live):
   - In the Cloudflare dashboard, go to **Turnstile**, add a widget for your preview domain and `verloniq.com`, and choose "Managed" mode.
   - Put the **secret key** into Formspree's Turnstile / CAPTCHA setting. **Never put it in the repo.**
   - **Send me the site key** (it starts with `0x`).
7. **Plan and limits:** check the free plan's monthly submission limit and which of the features above it includes. **Don't upgrade without deciding first.** I won't turn on anything paid.

> Note: these Formspree feature names come from Formspree's documentation index. This session couldn't open the full help pages (`help.formspree.io` isn't in its allowed network list), so please confirm the exact setting names and plan requirements in your dashboard.

## What to configure in Cal.com

1. **Account:** sign up with your business email and choose a **business username** such as `verloniq`, because it appears in the booking link. Turn on two-factor authentication.
2. **Calendar:** connect your Google or Microsoft calendar **only so Cal.com can check when you're busy**. Visitors can't see your events.
3. **Event type:**
   - **Title:** Free 30-Minute Workflow Discovery Call. **Duration:** 30 minutes. **URL slug:** e.g. `discovery-call`.
   - **Location:** Google Meet, Zoom, Microsoft Teams or phone.
   - **Description:** you can reuse the "What we'll cover" points from the website panel.
   - **Booking questions:** name and email are the defaults. Add **Business name** (required) and **What would you like to automate?** (optional).
   - **Limits:** a minimum notice period (e.g. 24 hours), buffer time between calls, a daily limit, and how far ahead people can book.
4. **Hide other event types**, so your public profile only offers this call.
5. **Appearance** (Settings → Appearance), to match the website:
   - Choose the **dark** theme.
   - Set the brand colour to `#d6f795` for dark and `#1e3828` for light.
   - Use the VERLONIQ mark as your avatar or logo.
6. **Confirmation emails:** make sure Cal.com sends booking confirmations and reminders. Confirmations come from Cal.com, not the website.
7. **Test it:** make a booking yourself and cancel it.

**Send me:** the event's public link (e.g. `https://cal.com/verloniq/discovery-call`), and tell me whether your account is on Cal.com's US (`cal.com`) or EU (`cal.eu`) region.

## Privacy Policy and Terms of Use (drafts)

`public/privacy.html` and `public/terms.html` are published at `/privacy` and `/terms`. Both are labelled as drafts, marked `noindex` and kept out of the sitemap. Please confirm or provide:

- [ ] Legal entity name and ABN.
- [ ] Privacy and contact email addresses.
- [ ] Business email provider, and which calendar you'll connect to Cal.com.
- [ ] Each provider's data region (Formspree, Cal.com US or EU, email provider).
- [ ] Retention period for enquiries that don't become clients. The draft says 24 months.
- [ ] That two-factor authentication is on for Formspree, Cal.com, email and Cloudflare.
- [ ] Whether you'll turn on Turnstile. The privacy policy already describes it as optional.
- [ ] Publication date. Then have a lawyer or privacy professional review both documents.

**Notes:**
- Many businesses with turnover under A$3 million are exempt from the Privacy Act. The draft follows the Australian Privacy Principles anyway.
- The site loads **Google Fonts**, which sends visitors' IP addresses to Google, and the policy says so. Self-hosting the fonts would remove that without any visible change.

## Once you send the details, I'll:

1. Put the endpoint, booking URL and (optionally) the Turnstile site key into `public/config.js`. Add `contactEmail` only once sales@ forwarding is confirmed.
2. Re-run the automated tests, then send **one real test enquiry** through the Cloudflare preview and confirm it reaches sales@.
3. After you approve the final text, fill in the legal placeholders, remove the draft labels and `noindex`, and add `/privacy` and `/terms` to `sitemap.xml`.
4. Leave the pre-launch banner and domain untouched until you say otherwise.
