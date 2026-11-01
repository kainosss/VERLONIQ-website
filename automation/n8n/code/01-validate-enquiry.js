// n8n Code node: "Validate & Normalise Enquiry" (mode: Run Once for All Items)
// Input: "Workflow Configuration" output ({ config, request }). request is the Webhook item ({ headers, params, query, body }).
// Output: { valid, errors, warnings, lead_id, received_at, dedupe_key, enquiry } — invalid requests are answered with HTTP 400.
// Request headers (which include the webhook secret) are deliberately NOT passed on.
const { config, request } = $input.first().json;
const raw = request && request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
const ALLOWED_FIELDS = ['business_id', 'enquiry_text', 'customer_name', 'customer_email', 'customer_phone', 'source', 'submitted_at', 'submission_id'];
const { min_enquiry_chars: MIN, max_enquiry_chars: MAX } = config.limits;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (value, max) => (typeof value === 'string' ? value.replace(CONTROL, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '');

// Small, dependency-free hash (FNV-1a 32-bit, twice with different seeds) for the duplicate key.
// n8n Code nodes can't use Node's crypto module unless the instance allows built-ins.
const fnv = (str, seed) => {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
};
const hash = (str) => fnv(str, 2166136261) + fnv(str, 2166136261 ^ 0x9e3779b9);

const errors = [];
const warnings = [];
const business_id = clean(raw.business_id, 40);
const enquiry_text = typeof raw.enquiry_text === 'string' ? raw.enquiry_text.replace(CONTROL, '').trim() : '';
const customer_name = clean(raw.customer_name, 100);
const customer_email = clean(raw.customer_email, 254).toLowerCase();
const customer_phone = clean(raw.customer_phone, 20);
const source = clean(raw.source, 40) || 'unknown';
const submission_id = clean(raw.submission_id, 100);

if (!request || !request.body || typeof request.body !== 'object' || Array.isArray(request.body)) errors.push('request body must be a JSON object');
if (!Object.prototype.hasOwnProperty.call(config.businesses, business_id)) errors.push(`business_id must be one of: ${Object.keys(config.businesses).join(', ')}`);
if (typeof raw.enquiry_text !== 'string') errors.push('enquiry_text is required and must be text');
else if (enquiry_text.length < MIN) errors.push(`enquiry_text must be at least ${MIN} characters`);
else if (enquiry_text.length > MAX) errors.push(`enquiry_text must be at most ${MAX} characters`);
if (customer_email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(customer_email)) errors.push('customer_email is not a valid email address');
if (customer_phone && (!/^[0-9+()\s-]{8,20}$/.test(customer_phone) || customer_phone.replace(/\D/g, '').length < 8)) errors.push('customer_phone is not a valid phone number');
if (submission_id && !/^[A-Za-z0-9._:-]{6,100}$/.test(submission_id)) errors.push('submission_id may only contain letters, numbers and . _ : - (6-100 characters)');
const unknown = Object.keys(raw).filter((k) => !ALLOWED_FIELDS.includes(k));
if (unknown.length) errors.push(`unexpected fields: ${unknown.slice(0, 5).join(', ')}`);

// Contact details may also be written inside the enquiry text; the AI extracts those later.
const textHasContact = /[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/i.test(enquiry_text) || (enquiry_text.match(/(?:\+?61|0)[2-478](?:[ -]?\d){8}/) || []).length > 0;
const has_contact = Boolean(customer_email || customer_phone || textHasContact);
if (!has_contact) warnings.push('no contact details provided');

const now = new Date();
const day = now.toISOString().slice(0, 10);
const normalised = enquiry_text.toLowerCase().replace(/\s+/g, ' ');
// A submission_id from the calling system (e.g. the website backend) makes retries of the same submission safe.
// Otherwise: same business + same contact (or none) + same message on the same day = duplicate.
const dedupe_key = submission_id
  ? `${business_id}-sub-${hash(submission_id)}`
  : `${business_id}-${day}-${hash([business_id, customer_email, customer_phone.replace(/\D/g, ''), normalised].join('|'))}`;
const lead_id = `VQ-${day.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0')}`;

return [{
  json: {
    valid: errors.length === 0,
    errors,
    warnings,
    lead_id,
    received_at: now.toISOString(),
    dedupe_key,
    has_contact,
    enquiry: { business_id, enquiry_text, customer_name, customer_email, customer_phone, source, submission_id },
  },
}];
