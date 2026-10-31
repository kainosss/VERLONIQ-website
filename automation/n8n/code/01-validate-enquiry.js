// n8n Code node: "Validate & Normalise Enquiry" (mode: Run Once for All Items)
// Input: the Webhook node's item ({ headers, params, query, body }).
// Output: { valid, errors, lead_id, received_at, dedupe_key, enquiry } — invalid requests are answered with HTTP 400.
const ALLOWED_BUSINESSES = ['electrical', 'plumbing', 'aircon', 'security'];
const MAX_TEXT = 4000;

const clean = (value, max) =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max)
    : '';

// Small, dependency-free hash (FNV-1a 32-bit, twice with different seeds) for the duplicate key.
// n8n Code nodes can't use Node's crypto module unless the instance allows built-ins.
const fnv = (str, seed) => {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
};
const hash = (str) => fnv(str, 2166136261) + fnv(str, 2166136261 ^ 0x9e3779b9);

const results = [];
for (const item of $input.all()) {
  const raw = item.json.body && typeof item.json.body === 'object' ? item.json.body : item.json;
  const errors = [];

  const business_id = clean(raw.business_id, 40);
  const enquiry_text = typeof raw.enquiry_text === 'string' ? raw.enquiry_text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : '';
  const customer_name = clean(raw.customer_name, 100);
  const customer_email = clean(raw.customer_email, 254).toLowerCase();
  const customer_phone = clean(raw.customer_phone, 20);
  const source = clean(raw.source, 40) || 'unknown';

  if (!ALLOWED_BUSINESSES.includes(business_id)) errors.push(`business_id must be one of: ${ALLOWED_BUSINESSES.join(', ')}`);
  if (enquiry_text.length < 15) errors.push('enquiry_text must be at least 15 characters');
  if (enquiry_text.length > MAX_TEXT) errors.push(`enquiry_text must be at most ${MAX_TEXT} characters`);
  if (customer_email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(customer_email)) errors.push('customer_email is not a valid email address');
  if (customer_phone && !/^[0-9+()\s-]{8,20}$/.test(customer_phone)) errors.push('customer_phone is not a valid phone number');
  const unknown = Object.keys(raw || {}).filter((k) => !['business_id', 'enquiry_text', 'customer_name', 'customer_email', 'customer_phone', 'source', 'submitted_at'].includes(k));
  if (unknown.length) errors.push(`unexpected fields: ${unknown.slice(0, 5).join(', ')}`);

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const normalised = enquiry_text.toLowerCase().replace(/\s+/g, ' ');
  // Same business + same contact (or none) + same message on the same day = duplicate.
  const dedupe_key = `${business_id}-${day}-${hash([business_id, customer_email, customer_phone.replace(/\D/g, ''), normalised].join('|'))}`;
  const lead_id = `VQ-${day.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  results.push({
    json: {
      valid: errors.length === 0,
      errors,
      lead_id,
      received_at: now.toISOString(),
      dedupe_key,
      enquiry: { business_id, enquiry_text, customer_name, customer_email, customer_phone, source },
    },
  });
}
return results;
