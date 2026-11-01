// Runs every fictional demo scenario (automation/n8n/demo/scenarios.json) through the generated DEMO workflow
// graph, and key paths through the LIVE workflow graph with stand-ins for Google Sheets, Gmail and the AI API.
// Uses a small test interpreter (automation/n8n/test/mini-n8n.mjs); the real n8n run is automation/n8n/test/run-local-e2e.sh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { demoWorkflow, workflow, scenarios, chooseScenarioCode } from '../automation/n8n/build-workflow.mjs';
import { runWorkflow } from '../automation/n8n/test/mini-n8n.mjs';
import { outcome, checkScenario } from '../automation/n8n/test/expectations.mjs';

const LA = createRequire(import.meta.url)('../public/lead-assistant.js');
const categories = ['Routine enquiry', 'Installation quotation', 'Urgent service request', 'Missing contact information', 'Ambiguous enquiry', 'Duplicate submission', 'Invalid input', 'AI service failure', 'Integration failure', 'Potentially unsafe or sensitive request'];

test('demo scenarios: at least 10, covering every required category, all fictional', () => {
  assert.ok(scenarios.length >= 10);
  for (const c of categories) assert.ok(scenarios.some((s) => s.category === c), c);
  assert.equal(new Set(scenarios.map((s) => s.id)).size, scenarios.length);
  for (const s of scenarios) {
    const emails = JSON.stringify(s.request).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    for (const e of emails) assert.match(e, /(?:@example\.com|\.example)$/i, `${s.id}: only reserved example domains (RFC 2606)`);
  }
});

const runDemo = (id) => {
  const wf = structuredClone(demoWorkflow);
  wf.nodes.find((n) => n.name === 'Choose Demo Scenario').parameters.jsCode = chooseScenarioCode(id);
  const r = runWorkflow(wf, { start: 'Run Demo' });
  return { r, o: outcome(r.json, (n) => Boolean(r.runs[n])) };
};

for (const s of scenarios) {
  test(`demo scenario "${s.id}" (${s.category}): ${s.title}`, () => {
    const { o } = runDemo(s.id);
    assert.deepEqual(checkScenario(s, o), []);
  });
}

test('demo: nothing customer-facing is ever sent; drafts and notifications are DEMO stand-ins', () => {
  for (const s of scenarios) {
    const { r } = runDemo(s.id);
    for (const name of ['Gmail: Create Draft for Approval', 'Gmail: Notify Staff', 'Gmail: Alert Staff - Lead Not Saved']) {
      const j = r.json(name);
      if (j && !j.error) assert.match(j.demo_note, /^DEMO:/, `${s.id}/${name}`);
    }
  }
});

// ---------- Live workflow graph, with the external services stood in ----------
const anthropicFromRules = (ctx) => {
  const e = ctx.enquiry;
  const r = LA.simulate(e.enquiry_text, e.business_id);
  const out = { customer: { name: r.customer.name, email: r.customer.email, phone: r.customer.phone, organisation: r.customer.organisation || '' },
    job: { category: r.job.category, type: r.job.type, summary: r.job.summary || '', requirements: r.job.requirements, property_type: r.job.property_type, preferred_timing: r.job.preferred_timing || '' },
    location: { suburb: r.location.suburb || '', address: r.location.address || '', postcode: '', state: '' }, urgency: { level: r.urgency.level, reasons: r.urgency.reasons || [] },
    safety: { flagged: r.safety.flagged, hazards: r.safety.hazards.map((h) => ({ code: h.code, label: h.label, action: h.action })) },
    missing_information: r.missing_information, draft_reply: r.draft_reply, confidence: 'high', notes_for_staff: '' };
  return { model: ctx.ai_request.body.model, stop_reason: 'end_turn', usage: { input_tokens: 2000, output_tokens: 1200 }, content: [{ type: 'text', text: JSON.stringify(out) }] };
};
const liveRun = (body, { aiFails = false, registerFails = false, existing = null } = {}) => {
  const wf = structuredClone(workflow);
  wf.nodes.find((n) => n.name === 'Workflow Configuration').parameters.jsCode =
    wf.nodes.find((n) => n.name === 'Workflow Configuration').parameters.jsCode.replace('const OVERRIDES = {};', 'const OVERRIDES = {"staff_notification":{"to":"office@example.com"}};');
  const sent = [];
  const standins = {
    'Find Existing Lead': (items) => (existing ? [{ json: { lead_id: existing, dedupe_key: items[0].json.dedupe_key } }] : []),
    'AI: Classify Enquiry': (items) => { if (aiFails) throw new Error('529 overloaded'); return [{ json: anthropicFromRules(items[0].json) }]; },
    'Append to Lead Register': (items) => { if (registerFails) throw new Error('Sheets 503'); return items; },
    'Gmail: Create Draft for Approval': (items) => [{ json: { id: 'd', labelIds: ['DRAFT'], to: items[0].json.customer_email } }],
    'Gmail: Notify Staff': (items) => { sent.push(items[0].json.notification); return [{ json: { id: 'm' } }]; },
    'Gmail: Alert Staff - Lead Not Saved': (items) => { sent.push(items[0].json.notification); return [{ json: { id: 'a' } }]; },
  };
  const r = runWorkflow(wf, { start: 'Enquiry Webhook', items: [{ json: { headers: {}, body } }], standins });
  return { r, out: r.lastOutput, sent };
};

test('live graph: success path returns 200 with draft + staff notification (Respond expressions evaluated)', () => {
  const { out, sent, r } = liveRun({ business_id: 'electrical', enquiry_text: LA.BUSINESSES.electrical.samples.quote.text });
  assert.equal(out.http_status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.draft_created, true);
  assert.equal(out.body.staff_notified, true);
  assert.deepEqual(sent.map((m) => m.to), ['office@example.com']);
  assert.equal(r.json('Append to Lead Register').ai_tokens, '2000 in / 1200 out');
});

test('live graph: invalid → 400, duplicate → 200 duplicate, AI outage → saved for manual review, register outage → 503 + alert', () => {
  assert.equal(liveRun({ business_id: 'nope', enquiry_text: 'x' }).out.http_status, 400);
  const dup = liveRun({ business_id: 'plumbing', enquiry_text: LA.BUSINESSES.plumbing.samples.quote.text }, { existing: 'VQ-OLD' }).out;
  assert.deepEqual(dup, { http_status: 200, body: { ok: true, status: 'duplicate', lead_id: 'VQ-OLD' } });
  const ai = liveRun({ business_id: 'electrical', enquiry_text: 'There are sparks coming out of the switchboard at our shop in Milton. Call 0412 555 000.' }, { aiFails: true });
  assert.equal(ai.out.http_status, 200);
  assert.equal(ai.out.body.status, 'URGENT - call customer (AI unavailable)');
  assert.equal(ai.sent.length, 1);
  const reg = liveRun({ business_id: 'aircon', enquiry_text: LA.BUSINESSES.aircon.samples.maintenance.text }, { registerFails: true });
  assert.equal(reg.out.http_status, 503);
  assert.equal(reg.out.body.status, 'register_failed');
  assert.equal(reg.out.body.staff_alerted, true);
  assert.match(reg.sent[0].subject, /could NOT be saved/);
});
