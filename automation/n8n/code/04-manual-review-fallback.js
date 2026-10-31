// n8n Code node: "Manual Review Fallback" (mode: Run Once for All Items)
// Runs when the Claude request fails (network error, invalid key, rate limit, outage).
// The enquiry is still saved to the lead register so nothing is lost; no draft is created.
/*@inject:SHARED*/

const ctx = $('Build AI Request').first().json;
const err = ($input.first().json && $input.first().json.error) || {};
const text = ctx.enquiry.enquiry_text;
const hazards = detectHazards(text);
const reason = `AI request failed (${str(err.message || err.description || 'unknown error', 160)}) - review manually`;

const lead = {
  schema_version: '1.0',
  mode: 'fallback',
  lead_id: ctx.lead_id,
  received_at: ctx.received_at,
  dedupe_key: ctx.dedupe_key,
  source: ctx.enquiry.source,
  enquiry_text: text,
  ai_model: ctx.ai_model,
  business: { id: ctx.business.id, name: ctx.business.name, trade: ctx.business.trade },
  customer: { name: ctx.enquiry.customer_name, email: ctx.enquiry.customer_email, phone: ctx.enquiry.customer_phone, organisation: '' },
  job: { category: 'Unclassified - review manually', type: 'general', summary: '', requirements: [], property_type: 'Unknown', preferred_timing: '' },
  location: { suburb: '', address: '', postcode: '', state: '' },
  urgency: { level: hazards.length ? 'emergency' : 'soon', reasons: [] },
  safety: { flagged: hazards.length > 0, hazards },
  missing_information: [],
  requires_human_review: true,
  review_reasons: [hazards.length ? 'Safety hazard - call the customer now' : '', reason].filter(Boolean),
  draft_reply: { subject: '', body: '' },
  confidence: 'low',
  notes_for_staff: '',
  status: hazards.length ? STATUS.urgent.replace(', draft awaiting approval', '') + ' (AI unavailable)' : STATUS.manual,
};

return [{ json: toSheetRow(lead) }];
