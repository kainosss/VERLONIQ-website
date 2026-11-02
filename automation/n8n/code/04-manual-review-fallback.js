// n8n Code node: "Manual Review Fallback" (mode: Run Once for All Items)
// Runs when the AI request fails after its retries (network error, invalid key, rate limit, outage),
// or when the demo Mock AI simulates a failure. The enquiry is still saved to the lead register and
// staff are still notified, so nothing is lost. No draft is created. Safety rules still apply.
/*@inject:SHARED*/

const ctx = $('Build AI Request').first().json;
const err = ($input.first().json || {}).error;
const errText = typeof err === 'string' ? err : err && (err.message || err.description) ? String(err.message || err.description) : 'unknown error';
const e = ctx.enquiry;
const text = e.enquiry_text;
const hazards = detectHazards(text);
const hasContact = Boolean(e.customer_email || e.customer_phone);

const reasons = [];
if (hazards.length) reasons.push('Possible safety hazard - call the customer now');
reasons.push(`AI request failed (${str(errText, 160)}) - review manually`);
reasons.push(...ruleReviewReasons(text, ctx.has_contact));
if (ctx.dedupe_check === 'failed') reasons.push('Duplicate check could not run (lead register unavailable) - check for an earlier copy');
if (ctx.ai_provider === 'mock') reasons.push('DEMO MODE - simulated AI failure');

const lead = {
  mode: 'fallback',
  workflow_version: $('Workflow Configuration').first().json.config.workflow_version,
  lead_id: ctx.lead_id,
  received_at: ctx.received_at,
  dedupe_key: ctx.dedupe_key,
  source: e.source,
  enquiry_text: text,
  ai_provider: ctx.ai_provider,
  ai_model: ctx.ai_model,
  ai_tokens: '',
  business: { id: ctx.business.id, name: ctx.business.name, trade: ctx.business.trade },
  customer: { name: e.customer_name, email: e.customer_email, phone: e.customer_phone, organisation: '' },
  job: { category: 'Unclassified - review manually', type: 'general', summary: '', requirements: [], property_type: 'Unknown', preferred_timing: '' },
  location: { suburb: '', address: '', postcode: '', state: '' },
  urgency: { level: hazards.length ? 'emergency' : 'soon', reasons: hazards.length ? ['Possible safety hazard (automatic rule)'] : ['Not assessed - AI unavailable'] },
  safety: { flagged: hazards.length > 0, hazards },
  missing_information: hasContact ? [] : ['Phone number or email address (check the enquiry text)'],
  review_reasons: reasons,
  draft_reply: { subject: '', body: '' },
  confidence: 'low',
  notes_for_staff: '',
  status: statusFor({ failure: true, emergency: hazards.length > 0 }),
};

return [{ json: toSheetRow(lead) }];
