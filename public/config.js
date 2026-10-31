/*
 * VERLONIQ website configuration.
 *
 * These values are public URLs, not secrets: they are visible to anyone who
 * uses the form or booking link, so they are safe to commit. Never put API
 * keys, passwords or private calendar links in this file.
 *
 * While a value is empty (or not in the expected format) the site stays in
 * demo / placeholder mode and nothing is sent anywhere.
 */
window.VERLONIQ_CONFIG = {
  // Formspree form endpoint, e.g. "https://formspree.io/f/abcdwxyz".
  // Empty = enquiry form stays in DEMO MODE (validates, but sends nothing).
  formspreeEndpoint: "https://formspree.io/f/xwllqgvn",

  // Public Cal.com link for the free 20-minute discovery call event type.
  // Only the FREE discovery call belongs here. Paid assessments use private links shared after acceptance.
  // Empty = "Book a Free Discovery Call" shows a "booking not yet connected" placeholder.
  calBookingUrl: "https://cal.com/verloniq/free-20-minute-discovery-call",

  // Optional public contact email shown if a submission fails, e.g. "sales@verloniq.com".
  // Leave empty until email forwarding for the address is confirmed working.
  contactEmail: "",

  // Optional Cloudflare Turnstile SITE key (public, starts with "0x"), for Formspree's
  // Turnstile spam protection. Only used once formspreeEndpoint is set.
  // The Turnstile SECRET key goes ONLY into the Formspree dashboard — never in this file.
  turnstileSiteKey: "0x4AAAAAAFttPcdbmy99PE4C"
};
