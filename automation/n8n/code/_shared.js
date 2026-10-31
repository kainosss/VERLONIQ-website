// Shared helpers injected by build-workflow.mjs into the "Parse & Safety Check" and
// "Manual Review Fallback" Code nodes. HAZARDS is generated from public/lead-assistant.js
// so the website demo and the real workflow use the same safety rules.
const HAZARDS = /*@inject:HAZARDS*/ [];
const VULNERABLE_RE = /*@inject:VULNERABLE_RE*/ /$^/;

const detectHazards = (text) =>
  HAZARDS.filter((h) => new RegExp(h.source, h.flags).test(text)).map(({ code, label, action }) => ({ code, label, action }));

const STATUS = {
  awaiting: 'New - draft awaiting approval',
  urgent: 'URGENT - call customer, draft awaiting approval',
  noEmail: 'New - no email, call customer',
  manual: 'AI unavailable - manual review needed',
};

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v, max = 20) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => x.trim().slice(0, 300)) : []);

// One row per lead in the Google Sheets "Leads" tab. Keys must match the sheet's header row exactly.
const toSheetRow = (lead) => ({
  lead_id: lead.lead_id,
  received_at: lead.received_at,
  status: lead.status,
  business: lead.business.name,
  urgency: lead.urgency.level,
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
  ai_model: lead.ai_model,
  processing_mode: lead.mode,
  dedupe_key: lead.dedupe_key,
});
