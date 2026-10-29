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
  formspreeEndpoint: "",

  // Public Cal.com link for the free 30-minute consultation event type,
  // e.g. "https://cal.com/verloniq/consultation".
  // Empty = "Book a free consultation" shows a "booking not yet connected" placeholder.
  calBookingUrl: "",

  // Optional public contact email shown if a submission fails, e.g. "sales@verloniq.com".
  // Leave empty until email forwarding for the address is confirmed working.
  contactEmail: ""
};
