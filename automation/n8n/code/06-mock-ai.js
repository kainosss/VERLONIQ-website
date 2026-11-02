// n8n Code node: "Mock AI (demo only)" (mode: Run Once for All Items)
// Used ONLY when the configuration sets ai.provider = 'mock' (the demo workflow does this).
// It is NOT artificial intelligence: it reuses the website demo's keyword rules (public/lead-assistant.js)
// to produce an answer in the same shape the real AI must return, so the rest of the workflow can be
// demonstrated and tested without an API key or any cost.
// Demo controls (demo workflow only): ai_failure → throws (tests the fallback); unsafe_reply → appends a
// payment link to the draft (tests the review guard); ai_ignores_hazard → under-rates a hazard (tests the safety override).
const ctx = $input.first().json;
const demo = $('Workflow Configuration').first().json.demo || {};
if (demo.ai_failure) throw new Error('DEMO: simulated AI outage (HTTP 529 overloaded)');

const module = { exports: {} };
/*@inject:DEMO_ENGINE*/
const LA = module.exports;

const e = ctx.enquiry;
const known = Object.prototype.hasOwnProperty.call(LA.BUSINESSES, e.business_id);
const biz = ctx.business;
let out;
if (known) {
  const r = LA.simulate(e.enquiry_text, e.business_id);
  const generic = /general enquiry/i.test(r.job.category);
  out = {
    customer: { name: r.customer.name, email: r.customer.email, phone: r.customer.phone, organisation: r.customer.organisation || '' },
    job: { category: r.job.category, type: r.job.type, summary: r.job.summary || r.job.category, requirements: r.job.requirements, property_type: r.job.property_type, preferred_timing: r.job.preferred_timing || '' },
    location: { suburb: r.location.suburb || '', address: r.location.address || '', postcode: '', state: r.location.suburb ? 'QLD' : '' },
    urgency: { level: r.urgency.level, reasons: r.urgency.reasons || [] },
    safety: { flagged: r.safety.flagged, hazards: r.safety.hazards.map((h) => ({ code: h.code, label: h.label, action: h.action })) },
    missing_information: r.missing_information,
    draft_reply: { subject: r.draft_reply.subject, body: r.draft_reply.body },
    confidence: generic ? 'low' : 'high',
    notes_for_staff: generic ? 'The enquiry is vague - the job type could not be identified.' : '',
  };
} else {
  // Generic answer for business types the demo rules don't know (shows the workflow is not trade-specific).
  const first = e.enquiry_text.split(/(?<=[.!?])\s/)[0].slice(0, 200);
  out = {
    customer: { name: e.customer_name, email: e.customer_email, phone: e.customer_phone, organisation: '' },
    job: { category: 'Service enquiry', type: 'general', summary: first, requirements: [], property_type: 'Unknown', preferred_timing: '' },
    location: { suburb: '', address: '', postcode: '', state: '' },
    urgency: { level: 'soon', reasons: ['New service enquiry'] },
    safety: { flagged: false, hazards: [] },
    missing_information: ['Site address or suburb', 'Preferred timing'],
    draft_reply: { subject: `Your enquiry with ${biz.name}`, body: `Hi${e.customer_name ? ' ' + e.customer_name.split(' ')[0] : ''},\n\nThanks for getting in touch with ${biz.name}. To prepare a quote, could you tell us the site address or suburb and when would suit you?\n\nKind regards,\n${biz.signoff}` },
    confidence: 'medium',
    notes_for_staff: '',
  };
}
if (demo.ai_ignores_hazard) { out.urgency.level = 'routine'; out.safety = { flagged: false, hazards: [] }; }
if (demo.unsafe_reply) out.draft_reply.body += '\n\nTo lock in your booking, pay the deposit at http://pay-now.example/xyz or transfer to BSB 123-456.';
return [{ json: { mock: true, model: 'mock (deterministic test rules - not AI)', output: out } }];
