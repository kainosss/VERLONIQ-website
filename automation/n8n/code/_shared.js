// Shared helpers injected by build-workflow.mjs into several Code nodes (see each node's /*@inject:SHARED*/).
// HAZARDS and VULNERABLE_RE are generated from public/lead-assistant.js so the website demo and
// the real workflow use the same deterministic safety rules.
const HAZARDS = /*@inject:HAZARDS*/ [];
const VULNERABLE_RE = /*@inject:VULNERABLE_RE*/ /$^/;

const detectHazards = (text) =>
  HAZARDS.filter((h) => new RegExp(h.source, h.flags).test(text)).map(({ code, label, action }) => ({ code, label, action }));

// Phrases typical of prompt-injection attempts. Detection only adds a review reason; the AI is also told to treat the enquiry as data.
const INJECTION_RE = /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:instructions?|rules|prompt|above|previous)\b|\bsystem prompt\b|\byou are now\b|\bact as (?:an?|the)\b|\bjailbreak\b|\breveal (?:your|the) (?:instructions|prompt)\b/i;
// Sensitive data customers sometimes paste into forms. Flagged so staff handle it carefully (it is never needed to reply).
const SENSITIVE_RE = /\b(?:\d[ -]?){13,19}\b|\b(?:password|passcode|pin number|bsb|account number|card number|cvv|tax file number|tfn|medicare number|driver'?s licen[cs]e number)\b/i;

const STATUS = {
  awaiting: 'New - draft awaiting approval',
  urgent: 'URGENT - call customer, draft awaiting approval',
  urgentNoEmail: 'URGENT - call customer',
  urgentNoAi: 'URGENT - call customer (AI unavailable)',
  noEmail: 'New - no email, call customer',
  noContact: 'New - no contact details, review enquiry',
  manual: 'AI unavailable - manual review needed',
};

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v, max = 20) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => x.trim().slice(0, 300)) : []);
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;

// Status from the final assessment. "Contact" means something staff can reply to.
const statusFor = ({ failure, emergency, email, phone }) =>
  failure ? (emergency ? STATUS.urgentNoAi : STATUS.manual)
    : emergency ? (email ? STATUS.urgent : STATUS.urgentNoEmail)
      : !email && !phone ? STATUS.noContact
        : !email ? STATUS.noEmail
          : STATUS.awaiting;

// Deterministic review reasons that apply whatever the AI says.
const ruleReviewReasons = (text, hasContact) => {
  const r = [];
  if (INJECTION_RE.test(text)) r.push('Possible prompt-injection attempt in the enquiry - check the draft carefully');
  if (SENSITIVE_RE.test(text)) r.push('Enquiry may contain sensitive data (card, bank or ID numbers, passwords) - handle securely and do not forward');
  if (!hasContact) r.push('No phone number or email address - the customer cannot be contacted until they get in touch again');
  return r;
};

// One row per lead in the Google Sheets "Leads" tab. Keys must match the sheet's header row exactly
// (google-sheets/lead-register-columns.csv). Urgency is an automated ASSESSMENT that staff must confirm.
const toSheetRow = (lead) => ({
  lead_id: lead.lead_id,
  received_at: lead.received_at,
  status: lead.status,
  business: lead.business.name,
  assessed_urgency: lead.urgency.level,
  urgency_reasons: lead.urgency.reasons.join('; '),
  safety_flag: lead.safety.flagged ? 'YES' : 'no',
  hazards: lead.safety.hazards.map((h) => h.label).join('; '),
  customer_name: lead.customer.name,
  organisation: lead.customer.organisation,
  customer_email: lead.customer.email,
  customer_phone: lead.customer.phone,
  suburb: lead.location.suburb,
  address: lead.location.address,
  job_category: lead.job.category,
  job_type: lead.job.type,
  job_summary: lead.job.summary,
  property_type: lead.job.property_type,
  preferred_timing: lead.job.preferred_timing,
  requirements: lead.job.requirements.join('; '),
  missing_information: lead.missing_information.join('; '),
  review_reasons: lead.review_reasons.join('; '),
  draft_subject: lead.draft_reply.subject,
  draft_body: lead.draft_reply.body,
  confidence: lead.confidence,
  notes_for_staff: lead.notes_for_staff,
  enquiry_text: lead.enquiry_text,
  source: lead.source,
  ai_provider: lead.ai_provider,
  ai_model: lead.ai_model,
  ai_tokens: lead.ai_tokens,
  processing_mode: lead.mode,
  workflow_version: lead.workflow_version,
  dedupe_key: lead.dedupe_key,
});
