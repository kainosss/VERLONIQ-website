// n8n Code node: "Parse & Safety Check" (mode: Run Once for All Items)
// Input: the Claude Messages API response from the HTTP Request node.
// Validates the AI output, applies deterministic safety rules on top (the AI can't
// un-flag a hazard), and prepares the lead register row and Gmail draft fields.
/*@inject:SHARED*/

const ctx = $('Build AI Request').first().json;
const res = $input.first().json || {};
const reviewReasons = ['Every reply is approved by a person before sending'];
let ai = null;
let failure = '';

if (res.stop_reason === 'refusal') failure = 'AI declined to process this enquiry';
else if (res.stop_reason === 'max_tokens') failure = 'AI response was cut off';
else {
  const textBlock = Array.isArray(res.content) ? res.content.find((b) => b && b.type === 'text') : null;
  try { ai = textBlock ? JSON.parse(textBlock.text) : null; } catch (e) { ai = null; }
  if (!ai || typeof ai !== 'object' || !ai.job || !ai.urgency || !ai.draft_reply) { failure = 'AI response was missing or not valid JSON'; ai = null; }
}

const LEVELS = ['emergency', 'urgent', 'soon', 'routine', 'quote'];
const TYPES = ['fault', 'maintenance', 'installation', 'general'];
const text = ctx.enquiry.enquiry_text;
const ruleHazards = detectHazards(text);
const aiHazards = ai && ai.safety && Array.isArray(ai.safety.hazards)
  ? ai.safety.hazards.filter((h) => h && typeof h.label === 'string').slice(0, 10).map((h) => ({ code: str(h.code, 40) || 'other', label: str(h.label, 120), action: str(h.action, 300) }))
  : [];
const hazards = [...ruleHazards, ...aiHazards.filter((h) => !ruleHazards.some((r) => r.code === h.code))];
const vulnerable = VULNERABLE_RE.test(text);

const customer = {
  name: str(ai && ai.customer && ai.customer.name, 100) || ctx.enquiry.customer_name,
  email: (ctx.enquiry.customer_email || str(ai && ai.customer && ai.customer.email, 254)).toLowerCase(),
  phone: ctx.enquiry.customer_phone || str(ai && ai.customer && ai.customer.phone, 20),
  organisation: str(ai && ai.customer && ai.customer.organisation, 120),
};
if (customer.email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(customer.email)) { customer.email = ''; reviewReasons.push('Email address looked invalid and was removed'); }

let level = ai && LEVELS.includes(ai.urgency.level) ? ai.urgency.level : 'soon';
if (hazards.length) level = 'emergency';
else if (vulnerable && ['soon', 'routine'].includes(level)) level = 'urgent';

let draft = ai ? { subject: str(ai.draft_reply.subject, 200), body: str(ai.draft_reply.body, 4000) } : { subject: '', body: '' };
// Prompt-injection guard: a draft containing links or other contact details must be checked by a person.
if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|io|xyz|ru|top)\b/i.test(draft.body)) reviewReasons.push('Draft contains a link - check it before sending');
const otherEmails = (draft.body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).filter((m) => m.toLowerCase() !== customer.email);
if (otherEmails.length) reviewReasons.push('Draft mentions another email address - check it before sending');
if (/\$\s?\d|\b(?:bank|bsb|account (?:number|details)|deposit|invoice|pay(?:ment|ing)?|transfer|card (?:number|details)|crypto|bitcoin)\b/i.test(draft.body)) reviewReasons.push('Draft mentions prices or payment - check it before sending');

if (failure) reviewReasons.unshift(failure + ' - review manually');
if (hazards.length) reviewReasons.unshift('Safety hazard - call the customer before replying');
if (vulnerable) reviewReasons.push('Vulnerable person mentioned');
if (ai && ai.confidence === 'low') reviewReasons.push('AI confidence is low');

const status = failure ? STATUS.manual : hazards.length || level === 'emergency' ? STATUS.urgent : !customer.email ? STATUS.noEmail : STATUS.awaiting;

const lead = {
  schema_version: '1.0',
  mode: 'ai',
  lead_id: ctx.lead_id,
  received_at: ctx.received_at,
  dedupe_key: ctx.dedupe_key,
  source: ctx.enquiry.source,
  enquiry_text: text,
  ai_model: str(res.model, 60) || ctx.ai_model,
  business: { id: ctx.business.id, name: ctx.business.name, trade: ctx.business.trade },
  customer,
  job: {
    category: str(ai && ai.job.category, 120) || 'Unclassified - review manually',
    type: ai && TYPES.includes(ai.job.type) ? ai.job.type : 'general',
    summary: str(ai && ai.job.summary, 300),
    requirements: list(ai && ai.job.requirements),
    property_type: ai && ['Residential', 'Commercial'].includes(ai.job.property_type) ? ai.job.property_type : 'Unknown',
    preferred_timing: str(ai && ai.job.preferred_timing, 120),
  },
  location: {
    suburb: str(ai && ai.location && ai.location.suburb, 80),
    address: str(ai && ai.location && ai.location.address, 160),
    postcode: str(ai && ai.location && ai.location.postcode, 10),
    state: str(ai && ai.location && ai.location.state, 10),
  },
  urgency: { level, reasons: list(ai && ai.urgency.reasons, 10) },
  safety: { flagged: hazards.length > 0, hazards },
  missing_information: list(ai && ai.missing_information),
  requires_human_review: true,
  review_reasons: reviewReasons,
  draft_reply: draft,
  confidence: ai && ['high', 'medium', 'low'].includes(ai.confidence) ? ai.confidence : 'low',
  notes_for_staff: str(ai && ai.notes_for_staff, 1000),
  status,
};

return [{ json: toSheetRow(lead) }];
