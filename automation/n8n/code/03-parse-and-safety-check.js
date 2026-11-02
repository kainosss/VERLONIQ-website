// n8n Code node: "Parse & Safety Check" (mode: Run Once for All Items)
// Input: the AI provider's response (Anthropic Messages API, OpenAI Chat Completions, or the demo Mock AI).
// 1. Extracts the JSON answer and validates it strictly against the output schema; anything malformed,
//    refused or cut off is treated as an AI failure (lead still saved for manual review, no draft).
// 2. Removes details the AI "found" that are not actually in the enquiry (no invented contact details).
// 3. Applies deterministic safety rules on top: the AI can raise urgency but never lower or un-flag a hazard.
// 4. Prepares the lead register row and the Gmail draft fields. Nothing here contacts the customer.
/*@inject:SHARED*/
const OUTPUT_SCHEMA = /*@inject:AI_SCHEMA*/ {};

const ctx = $('Build AI Request').first().json;
const res = $input.first().json || {};
const reviewReasons = ['Every reply is approved by a person before sending'];

// Minimal JSON-schema check for the subset used by the output schema (object/array/string/boolean, enum, required, additionalProperties:false).
const schemaErrors = (value, schema, path = 'output') => {
  const t = schema.type;
  if (t === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path} must be an object`];
    const errs = [];
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${path}.${k} is missing`);
    if (schema.additionalProperties === false) for (const k of Object.keys(value)) if (!(schema.properties || {})[k]) errs.push(`${path}.${k} is not allowed`);
    for (const [k, s] of Object.entries(schema.properties || {})) if (k in value) errs.push(...schemaErrors(value[k], s, `${path}.${k}`));
    return errs;
  }
  if (t === 'array') return Array.isArray(value) ? value.flatMap((v, i) => schemaErrors(v, schema.items, `${path}[${i}]`)) : [`${path} must be an array`];
  if (t === 'string') return typeof value !== 'string' ? [`${path} must be text`] : schema.enum && !schema.enum.includes(value) ? [`${path} has an unexpected value`] : [];
  if (t === 'boolean') return typeof value === 'boolean' ? [] : [`${path} must be true/false`];
  return [];
};

// --- 1. Extract the answer for whichever provider answered ---
let ai = null;
let failure = '';
let tokens = '';
let modelUsed = ctx.ai_model;
let rawText = null;
if (ctx.ai_provider === 'mock' || res.mock === true) {
  ai = res.output || null;
} else if (Array.isArray(res.choices)) { // OpenAI Chat Completions
  const choice = res.choices[0] || {};
  const msg = choice.message || {};
  if (msg.refusal) failure = 'AI declined to process this enquiry';
  else if (choice.finish_reason === 'length') failure = 'AI response was cut off';
  else rawText = typeof msg.content === 'string' ? msg.content : null;
  if (res.usage) tokens = `${res.usage.prompt_tokens || 0} in / ${res.usage.completion_tokens || 0} out`;
  modelUsed = str(res.model, 60) || modelUsed;
} else { // Anthropic Messages API
  if (res.stop_reason === 'refusal') failure = 'AI declined to process this enquiry';
  else if (res.stop_reason === 'max_tokens') failure = 'AI response was cut off';
  else {
    const block = Array.isArray(res.content) ? res.content.find((b) => b && b.type === 'text') : null;
    rawText = block ? block.text : null;
  }
  if (res.usage) tokens = `${res.usage.input_tokens || 0} in / ${res.usage.output_tokens || 0} out`;
  modelUsed = str(res.model, 60) || modelUsed;
}
if (!failure && !ai) { try { ai = rawText ? JSON.parse(rawText) : null; } catch (e) { ai = null; } }
if (!failure) {
  const errs = ai ? schemaErrors(ai, OUTPUT_SCHEMA) : ['no JSON answer'];
  if (errs.length) { failure = `AI response failed validation (${errs.slice(0, 3).join('; ')})`; ai = null; }
}

// --- 2. Grounding: keep only details that really appear in what the customer sent ---
const e = ctx.enquiry;
const text = e.enquiry_text;
const source = [text, e.customer_name, e.customer_email, e.customer_phone].join('\n');
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const digits = (s) => String(s).replace(/\D/g, '');
const inSource = (v) => !v || norm(source).includes(norm(v));
const nameInSource = (v) => !v || v.split(/\s+/).filter((w) => w.length > 1).every((w) => norm(source).includes(w.toLowerCase().replace(/[^a-z'-]/g, '')));
const phoneInSource = (v) => !v || (digits(v).length >= 8 && digits(source).includes(digits(v)));
const grounded = (field, value, ok) => {
  if (!value) return '';
  if (ok(value)) return value;
  reviewReasons.push(`AI suggested a ${field} that is not in the enquiry - removed`);
  return '';
};
const aiCust = (ai && ai.customer) || {};
const aiLoc = (ai && ai.location) || {};
const customer = {
  name: e.customer_name || grounded('customer name', str(aiCust.name, 100), nameInSource),
  email: (e.customer_email || grounded('email address', str(aiCust.email, 254), inSource)).toLowerCase(),
  phone: e.customer_phone || grounded('phone number', str(aiCust.phone, 20), phoneInSource),
  organisation: grounded('organisation', str(aiCust.organisation, 120), inSource),
};
if (customer.email && !EMAIL_RE.test(customer.email)) { customer.email = ''; reviewReasons.push('Email address looked invalid and was removed'); }
const location = {
  suburb: grounded('suburb', str(aiLoc.suburb, 80), inSource),
  address: grounded('street address', str(aiLoc.address, 160), inSource),
  postcode: grounded('postcode', str(aiLoc.postcode, 10), inSource),
  state: str(aiLoc.state, 10),
};

// --- 3. Deterministic safety rules (cannot be overridden by the AI) ---
const LEVELS = ['emergency', 'urgent', 'soon', 'routine', 'quote'];
const TYPES = ['fault', 'maintenance', 'installation', 'general'];
const ruleHazards = detectHazards(text);
const aiHazards = ai && ai.safety && Array.isArray(ai.safety.hazards)
  ? ai.safety.hazards.filter((h) => h && typeof h.label === 'string').slice(0, 10).map((h) => ({ code: str(h.code, 40) || 'other', label: str(h.label, 120), action: str(h.action, 300) }))
  : [];
const hazards = [...ruleHazards, ...aiHazards.filter((h) => !ruleHazards.some((r) => r.code === h.code))];
const vulnerable = VULNERABLE_RE.test(text);
let level = ai && LEVELS.includes(ai.urgency.level) ? ai.urgency.level : 'soon';
if (hazards.length) level = 'emergency';
else if (vulnerable && ['soon', 'routine', 'quote'].includes(level) && ai && ai.job.type === 'fault') level = 'urgent';

const draft = ai ? { subject: str(ai.draft_reply.subject, 200), body: str(ai.draft_reply.body, 4000) } : { subject: '', body: '' };
// Prompt-injection guard: a draft containing links, other contact details or payment wording must be checked by a person.
if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|ru|top|info|biz)\b/i.test(draft.body)) reviewReasons.push('Draft contains a link - check it before sending');
const otherEmails = (draft.body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).filter((m) => m.toLowerCase() !== customer.email);
if (otherEmails.length) reviewReasons.push('Draft mentions another email address - check it before sending');
if (/\$\s?\d|\b(?:bank|bsb|account (?:number|details)|deposit|invoice|pay(?:ment|ing)?|transfer|card (?:number|details)|crypto|bitcoin)\b/i.test(draft.body)) reviewReasons.push('Draft mentions prices or payment - check it before sending');

const hasContact = Boolean(customer.email || customer.phone);
const missing = list(ai && ai.missing_information);
if (!hasContact && !missing.some((m) => /phone|email|contact/i.test(m))) missing.unshift('Phone number or email address');

if (failure) reviewReasons.unshift(failure + ' - review manually');
if (hazards.length) reviewReasons.unshift('Possible safety hazard - call the customer before replying');
reviewReasons.push(...ruleReviewReasons(text, hasContact));
if (vulnerable) reviewReasons.push('Vulnerable person mentioned');
if (ai && ai.confidence === 'low') reviewReasons.push('AI confidence is low - check the classification');
if (ctx.dedupe_check === 'failed') reviewReasons.push('Duplicate check could not run (lead register unavailable) - check for an earlier copy');
if (ctx.ai_provider === 'mock') reviewReasons.push('DEMO MODE - classified by test rules, not AI');

const lead = {
  mode: ctx.ai_provider === 'mock' ? 'mock' : 'ai',
  workflow_version: $('Workflow Configuration').first().json.config.workflow_version,
  lead_id: ctx.lead_id,
  received_at: ctx.received_at,
  dedupe_key: ctx.dedupe_key,
  source: e.source,
  enquiry_text: text,
  ai_provider: ctx.ai_provider,
  ai_model: modelUsed,
  ai_tokens: tokens,
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
  location,
  urgency: { level, reasons: [...(hazards.length ? ['Possible safety hazard (automatic rule)'] : []), ...list(ai && ai.urgency.reasons, 10)] },
  safety: { flagged: hazards.length > 0, hazards },
  missing_information: missing,
  review_reasons: [...new Set(reviewReasons)],
  draft_reply: draft,
  confidence: ai && ['high', 'medium', 'low'].includes(ai.confidence) ? ai.confidence : 'low',
  notes_for_staff: str(ai && ai.notes_for_staff, 1000),
  status: statusFor({ failure, emergency: level === 'emergency', email: customer.email, phone: customer.phone }),
};

return [{ json: toSheetRow(lead) }];
