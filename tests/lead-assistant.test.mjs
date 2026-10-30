// Unit tests for the simulated AI Lead Assistant engine (public/lead-assistant.js).
// Run with:  node --test tests/*.test.mjs
// No dependencies; uses Node's built-in test runner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LA = require('../public/lead-assistant.js');
const B = LA.BUSINESSES;
const run = (bid, key) => LA.simulate(B[bid].samples[key].text, bid, { leadId: 'TEST', now: new Date('2026-10-30T00:00:00Z') });

// Expected results for every built-in sample: [business, sample, category, type, urgency, suburb, hazards]
const EXPECTED = [
  ['electrical', 'urgent', 'Electrical safety hazard', 'fault', 'emergency', 'Chermside', ['electrical_fire']],
  ['electrical', 'maintenance', 'Smoke alarm compliance', 'maintenance', 'routine', 'Kedron', []],
  ['electrical', 'quote', 'EV charger installation', 'installation', 'quote', 'North Lakes', []],
  ['plumbing', 'urgent', 'Burst pipe / active leak', 'fault', 'emergency', 'Wynnum', ['water_near_electrics', 'active_flooding']],
  ['plumbing', 'maintenance', 'Backflow testing', 'maintenance', 'routine', 'Capalaba', []],
  ['plumbing', 'quote', 'Hot water system replacement', 'installation', 'quote', 'Springfield Lakes', []],
  ['aircon', 'urgent', 'Air conditioner not cooling', 'fault', 'urgent', 'Indooroopilly', []],
  ['aircon', 'maintenance', 'Service & filter clean', 'maintenance', 'routine', 'Milton', []],
  ['aircon', 'quote', 'Split system installation', 'installation', 'quote', '', []],
  ['security', 'urgent', 'Break-in / urgent security repair', 'fault', 'emergency', 'Sunnybank', ['security_breach']],
  ['security', 'maintenance', 'Alarm fault', 'fault', 'soon', 'Ashgrove', []],
  ['security', 'quote', 'CCTV installation', 'installation', 'quote', 'Rocklea', []],
];

for (const [bid, key, cat, type, level, suburb, hazards] of EXPECTED) {
  test(`${B[bid].name} — ${key}: ${cat}, ${level}`, () => {
    const r = run(bid, key);
    assert.equal(r.job.category, cat);
    assert.equal(r.job.type, type);
    assert.equal(r.urgency.level, level);
    assert.equal(r.location.suburb, suburb);
    assert.deepEqual(r.safety.hazards.map((h) => h.code), hazards);
    assert.equal(r.safety.flagged, hazards.length > 0);
  });
}

test('every sample produces a complete result in the shared schema shape', () => {
  for (const bid of Object.keys(B)) for (const key of Object.keys(B[bid].samples)) {
    const r = run(bid, key);
    assert.equal(r.mode, 'simulated');
    assert.equal(r.schema_version, '1.0');
    assert.equal(r.requires_human_review, true, 'every reply needs human approval');
    assert.equal(r.status, 'awaiting_approval');
    assert.ok(r.draft_reply.subject.length > 5 && r.draft_reply.body.includes(B[bid].signoff));
    assert.ok(Array.isArray(r.job.requirements) && r.job.requirements.length >= 1);
    assert.ok(Array.isArray(r.missing_information));
    assert.ok(['emergency', 'urgent', 'soon', 'routine', 'quote'].includes(r.urgency.level));
  }
});

test('contact details are extracted from the samples', () => {
  assert.deepEqual(run('electrical', 'urgent').customer, { name: 'Mia Thompson', email: '', phone: '0412 555 018', organisation: '' });
  const hannah = run('aircon', 'maintenance').customer;
  assert.equal(hannah.organisation, 'Boyd & Co Accountants');
  assert.equal(hannah.phone, '07 3555 0192');
  assert.equal(run('electrical', 'maintenance').location.address, '14 Banksia Street');
  assert.equal(run('aircon', 'quote').customer.name, 'Olivia');
});

test('missing information is identified', () => {
  const olivia = run('aircon', 'quote').missing_information;
  for (const m of ['Phone number or email address', 'Job address or suburb', 'Approximate room sizes', 'Preferred timing']) assert.ok(olivia.includes(m), m);
  assert.deepEqual(run('security', 'urgent').missing_information, [], 'complete enquiry has nothing missing');
});

test('safety hazards are flagged and put first for human review', () => {
  const cases = {
    gas_leak: 'I can smell gas near the hot water unit at my house in Toowong. Call 0412 555 111',
    electrical_fire: 'There are sparks coming from a power point in the kitchen at home.',
    shock_risk: 'I got a shock from the light switch in the bathroom at our unit.',
    water_near_electrics: 'Water is leaking from the ceiling onto the switchboard at our house.',
    carbon_monoxide: 'Our CO alarm is going off in the lounge room, house in Bulimba.',
    security_breach: 'Someone broke in last night - the shop was broken into and the alarm failed.',
  };
  for (const [code, text] of Object.entries(cases)) {
    const r = LA.simulate(text, 'electrical');
    assert.ok(r.safety.hazards.some((h) => h.code === code), code);
    assert.equal(r.urgency.level, 'emergency', code);
    assert.match(r.review_reasons[0], /Safety hazard/);
  }
});

test('smoke alarms and detectors are not mistaken for smoke/fire', () => {
  const r = LA.simulate('Our smoke detector keeps chirping in the hallway of our house in Toowong, can you check it?', 'electrical');
  assert.equal(r.safety.flagged, false);
});

test('vulnerable occupants raise priority to at least urgent', () => {
  const r = LA.simulate('Our hot water system is not working and my elderly father lives with us in Kedron. Next week is fine.', 'plumbing');
  assert.equal(r.urgency.level, 'urgent');
  assert.ok(r.review_reasons.includes('Vulnerable occupant mentioned'));
});

test('emergency drafts include safety guidance, and drafts never promise prices or arrival times', () => {
  const r = run('plumbing', 'urgent');
  assert.match(r.draft_reply.body, /keep clear of any power points/);
  for (const bid of Object.keys(B)) for (const key of Object.keys(B[bid].samples)) {
    const body = run(bid, key).draft_reply.body;
    assert.doesNotMatch(body, /\$\d|\bwithin \d+ (?:minutes|hours)\b|\bwill arrive\b|\bguarantee/i);
  }
});

test('input validation', () => {
  assert.throws(() => LA.simulate('', 'electrical'), /more detail/);
  assert.throws(() => LA.simulate('too short', 'plumbing'), /more detail/);
  assert.throws(() => LA.simulate('x'.repeat(4001), 'plumbing'), /4,000/);
  assert.throws(() => LA.simulate('A perfectly reasonable enquiry about a job.', 'roofing'), /Unknown business/);
});

test('markup in an enquiry is treated as plain text data', () => {
  const r = LA.simulate('<img src=x onerror=alert(1)> please quote 2 split systems for my house in Toowong', 'aircon');
  assert.equal(r.job.category, 'Split system installation');
  assert.equal(typeof r.draft_reply.body, 'string');
});

test('processEnquiry: simulated by default; live mode only accepts a same-origin /api/ path', async () => {
  const r = await LA.processEnquiry(B.aircon.samples.urgent.text, 'aircon');
  assert.equal(r.mode, 'simulated');
  await assert.rejects(LA.processEnquiry('Some enquiry text here please', 'aircon', { endpoint: 'https://my-n8n.example.com/webhook/abc' }), /same-origin/);
  await assert.rejects(LA.processEnquiry('Some enquiry text here please', 'aircon', { endpoint: '//evil.example/api/x' }), /same-origin/);
});
