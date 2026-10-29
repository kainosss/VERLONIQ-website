# Enquiry form (Formspree) and consultation booking (Cal.com)

Both integrations are **built but switched off**. They're controlled by one file, [`public/config.js`](public/config.js):

| Setting | Empty (current) | Set to a valid URL |
| --- | --- | --- |
| `formspreeEndpoint` | **Demo mode.** The form validates but sends nothing, shows a "DEMO MODE — NOT CONNECTED" badge, and the pre-launch banner says "Enquiry form in demo mode". | **Live.** Submissions are sent to Formspree and emailed to you. The demo labels disappear. The pre-launch banner stays. |
| `calBookingUrl` | **Placeholder.** "Book a free consultation" opens a branded panel saying booking isn't connected yet and offers the enquiry form instead. | **Live.** The panel's "Choose a time" button opens your Cal.com event page in a new tab. |
| `contactEmail` | Not shown. | Shown as a fallback ("…or email sales@verloniq.com") if a form submission fails. |

The site only accepts well-formed values (`https://formspree.io/f/…` and `https://cal.com/…` or `https://cal.eu/…`). Anything else is ignored, and the site stays in demo or placeholder mode with a console warning. None of these values are secrets.

## How the enquiry form works

- **Fields:** name, business name, email, phone (optional), service of interest, process description, and a required consent checkbox. It also sends a hidden consent timestamp and an email subject line (`New VERLONIQ enquiry: <business>`).
- **Validation:** inline error messages that screen readers announce. Focus moves to the first problem.
- **Spam protection:**
  - A hidden honeypot field (`_gotcha`). Formspree discards submissions that fill it in, and the site doesn't even send them.
  - A minimum 3-second fill time.
  - The submit button is disabled while sending.
  - Formspree's own server-side spam filtering.
- **Messages:** a success panel (with an offer to book a consultation), Formspree's own validation errors, and a network-failure message.
- **Security:** `public/_headers` only allows the page to send data to `formspree.io`.

## How booking works

- "Book a free consultation" opens an on-site panel in the VERLONIQ style: 30 minutes, free, no obligation, and a note that Cal.com handles the booking.
- "Choose a time" opens your Cal.com event page in a new tab. **No Cal.com code runs on verloniq.com**, and no calendar data passes through the site.
- Visitors only ever see the open times for that one event type. They never see your calendar, other events or event titles.

---

## What I need from you to activate it

### 1. Formspree (enquiry form)

1. Create a Formspree account at formspree.io, ideally signed up with a VERLONIQ business email address.
2. Create a new form, e.g. "VERLONIQ website enquiries".
3. In the form's settings, set the **notification email** to `sales@verloniq.com`. Formspree sends a verification email to that address, so do this **once forwarding for sales@ is confirmed working**.
4. Review the form's spam settings and keep spam filtering on. reCAPTCHA isn't used, because the site submits in the background. The honeypot and timing checks cover the basics.
5. If your plan offers it, restrict the form to your domains: your `*.pages.dev` address now, and `verloniq.com` later.
6. Check Formspree's current plan limits (monthly submissions) and decide whether the free plan is enough. **Don't upgrade until you've decided. Paid plans need your approval.**

**Send me:** the form endpoint, which looks like `https://formspree.io/f/xxxxxxxx`, and confirm that the sales@ forwarding works.

### 2. Cal.com (consultation booking)

1. Create a Cal.com account. Use a business username such as `verloniq`, not your personal name, because the username appears in the booking URL.
2. **Connect your calendar** (Google or Microsoft) only so Cal.com can check when you're busy. Visitors can't see your calendar.
3. Create an event type:
   - **Title:** Free consultation. **Duration:** 30 minutes.
   - **Location:** your choice of Google Meet, Zoom, Microsoft Teams or phone.
   - **Booking questions:** name and email are the defaults. Optionally add "Business name" and "What would you like to automate?".
   - **Limits:** a minimum notice period, buffer time between meetings and a daily booking limit, to suit you.
4. Hide or delete any other event types you don't want people to book, so your public profile only shows this one.
5. To match the website, go to **Settings → Appearance**:
   - Choose the **dark** theme.
   - Set the brand colour to `#d6f795` for dark and `#1e3828` for light.
   - Upload the VERLONIQ mark as your avatar or logo.
6. Make a test booking yourself and cancel it.

**Send me:** the event's public link, e.g. `https://cal.com/verloniq/consultation`. If your account uses Cal.com's EU region (`cal.eu`), tell me, because the privacy policy mentions where data is stored.

### 3. Privacy policy details

The draft is at `public/privacy.html` (published at `/privacy`, marked `noindex` and shown as a draft). Please confirm or provide:

- [ ] **Legal entity name and ABN.** Sole trader, company or trust?
- [ ] **Privacy contact email**, e.g. `privacy@verloniq.com` or `sales@verloniq.com`.
- [ ] **Business email provider** (Google Workspace, Microsoft 365, etc.) and which calendar you'll connect to Cal.com.
- [ ] **Cal.com data region** (US or EU).
- [ ] **Retention period** for enquiries that don't become clients. The draft says 24 months.
- [ ] **MFA is turned on** for the Formspree, Cal.com, email and Cloudflare accounts.
- [ ] The **publication date** to show as "Last updated".

**Notes for your review:**

- Many businesses with annual turnover under A$3 million are exempt from the Privacy Act. The draft follows the Australian Privacy Principles anyway, because clients expect it and you may grow past the threshold. Have a lawyer or privacy professional review it before launch.
- The site loads fonts from **Google Fonts**, which sends visitors' IP addresses to Google. The policy discloses this. If you'd rather not involve Google, the fonts can be self-hosted in `public/`. That's a small change, and the design stays the same.
- Check the four provider privacy-policy links in the table are still current when you finalise it.

---

## Once you send the details, I'll:

1. Put the endpoint and booking URL into `public/config.js`. Add `contactEmail` only once sales@ is confirmed.
2. Fill in the privacy policy placeholders, remove its draft notice, and add `/privacy` to `sitemap.xml`. This happens only when you approve the final text.
3. Re-run the tests, then send one real test enquiry through the Cloudflare preview and confirm it reaches the inbox.
4. Leave the pre-launch banner and domain untouched until you say otherwise.
