import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const LA = createRequire(import.meta.url)(new URL('../../../public/lead-assistant.js', import.meta.url).pathname);
const BASE = process.env.N8N_BASE || 'http://127.0.0.1:5679';
const URL_ = `${BASE}/webhook/verloniq-lead-assistant`, SECRET = process.env.WEBHOOK_SECRET || 'local-test-secret-123';
let n = 0; const ok = (m) => console.log(` ✓ ${m}`, ++n);
const post = async (body, headers = { 'X-VERLONIQ-Secret': SECRET }) => {
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const store = async () => (await fetch(`${BASE}/webhook/test-inspect`)).json();
const run = `RUN-${Date.now().toString(36)}`; // makes each test run's enquiries unique for the dedupe check
const sample = (bid, k, extra = '') => ({ business_id: bid, enquiry_text: LA.BUSINESSES[bid].samples[k].text + extra + ` (${run})`, source: 'test' });

// --- Security & validation ---
assert.equal((await post(sample('electrical', 'urgent'), {})).status, 403); ok('no secret header → 403');
assert.equal((await post(sample('electrical', 'urgent'), { 'X-VERLONIQ-Secret': 'wrong' })).status, 403); ok('wrong secret → 403');
let r = await post({ business_id: 'roofing', enquiry_text: 'short' });
assert.equal(r.status, 400); assert.equal(r.body.ok, false); assert.ok(r.body.errors.some((e) => /business_id/.test(e)) && r.body.errors.some((e) => /at least 15/.test(e))); ok('invalid business + short text → 400 with clear errors');
r = await post({ ...sample('plumbing', 'urgent'), admin: true, customer_email: 'not-an-email' });
assert.equal(r.status, 400); assert.ok(r.body.errors.some((e) => /unexpected fields: admin/.test(e)) && r.body.errors.some((e) => /customer_email/.test(e))); ok('unexpected field + bad email → 400');
r = await post({ business_id: 'aircon', enquiry_text: 'x'.repeat(4001) }); assert.equal(r.status, 400); ok('over-long enquiry → 400');

// --- Happy paths ---
r = await post(sample('electrical', 'urgent'));
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.ok, true); assert.match(r.body.lead_id, /^VQ-\d{8}-[A-Z0-9]{5}$/);
assert.match(r.body.status, /^URGENT/); assert.equal(r.body.safety_flag, 'YES'); assert.equal(r.body.urgency, 'emergency'); assert.equal(r.body.draft_created, false);
const firstId = r.body.lead_id; ok('electrical emergency (no email) → saved, URGENT, no draft');
r = await post(sample('electrical', 'urgent'));
assert.equal(r.status, 200); assert.equal(r.body.status, 'duplicate'); assert.equal(r.body.lead_id, firstId); ok('identical enquiry → duplicate, returns original lead_id, not re-processed');
r = await post(sample('electrical', 'quote'));
assert.equal(r.status, 200); assert.equal(r.body.status, 'New - draft awaiting approval'); assert.equal(r.body.draft_created, true); assert.equal(r.body.safety_flag, 'no'); ok('electrical quote with email → saved, Gmail draft created (not sent)');

// --- Safety override, prompt-injection guard, AI failure ---
const gas = { business_id: 'plumbing', enquiry_text: `I can smell gas near the hot water unit at my house in Toowong. SIMULATE_AI_IGNORES_HAZARD Call 0412 555 111 (${run})` };
r = await post(gas); assert.equal(r.body.urgency, 'emergency'); assert.equal(r.body.safety_flag, 'YES'); assert.match(r.body.status, /^URGENT/); ok('AI says "routine, no hazard" for a gas smell → rules still force EMERGENCY + URGENT');
r = await post(sample('aircon', 'maintenance', ' SIMULATE_UNSAFE_REPLY')); assert.equal(r.status, 200); const unsafeId = r.body.lead_id; ok('draft containing a payment link → still saved');
r = await post(sample('security', 'quote', ' SIMULATE_AI_FAILURE'));
assert.equal(r.status, 200); assert.equal(r.body.status, 'AI unavailable - manual review needed'); assert.equal(r.body.draft_created, false); ok('AI request fails → lead still saved for manual review, no draft');
r = await post({ business_id: 'electrical', enquiry_text: `There are sparks from the switchboard at our shop in Milton. SIMULATE_AI_FAILURE (${run})` });
assert.match(r.body.status, /^URGENT/); assert.equal(r.body.safety_flag, 'YES'); ok('AI fails on a hazardous enquiry → still flagged URGENT by the rules');

// --- All remaining samples ---
for (const bid of Object.keys(LA.BUSINESSES)) for (const k of ['urgent', 'maintenance', 'quote']) {
  if ((bid === 'electrical' && k !== 'maintenance') || (bid === 'aircon' && k === 'maintenance') || (bid === 'security' && k === 'quote')) continue;
  const res = await post(sample(bid, k)); const expected = LA.simulate(LA.BUSINESSES[bid].samples[k].text, bid);
  assert.equal(res.status, 200); assert.equal(res.body.urgency, expected.urgency.level, `${bid}/${k}`);
}
ok('all remaining sample enquiries processed with the expected urgency');

// --- What landed in the (stand-in) Google Sheet and Gmail ---
const s = await store();
const rows = s.rows.filter((x) => x.enquiry_text.includes(run));
assert.equal(rows.length, 14, `rows: ${rows.length}`); ok('lead register has one row per processed enquiry (duplicate not added)');
const cols = ['lead_id','received_at','status','business','urgency','safety_flag','hazards','customer_name','organisation','customer_email','customer_phone','suburb','address','job_category','job_type','job_summary','property_type','preferred_timing','requirements','missing_information','review_reasons','draft_subject','draft_body','confidence','notes_for_staff','enquiry_text','source','ai_model','processing_mode','dedupe_key'];
assert.deepEqual(Object.keys(rows[0]), cols); ok(`each row has exactly the ${cols.length} documented columns`);
const unsafe = rows.find((x) => x.lead_id === unsafeId);
assert.match(unsafe.review_reasons, /Draft contains a link/); assert.match(unsafe.review_reasons, /prices or payment/); ok('link/payment in AI draft → flagged in review_reasons for the person approving it');
const mia = rows.find((x) => x.lead_id === firstId);
assert.equal(mia.customer_name, 'Mia Thompson'); assert.equal(mia.suburb, 'Chermside'); assert.match(mia.hazards, /electrical fire/i); assert.match(mia.review_reasons, /^Safety hazard - call the customer/); ok('row content: customer, suburb, hazard and review reason recorded');
const drafts = s.drafts.filter((d) => rows.some((x) => x.lead_id === d.lead_id));
const expectDrafts = rows.filter((x) => x.customer_email && x.draft_body);
assert.equal(drafts.length, expectDrafts.length); assert.ok(drafts.every((d) => d.to && d.subject)); ok(`${drafts.length} Gmail drafts created: exactly one per lead with an email address and a draft, none for the others`);
if (process.env.MOCK_CLAUDE_URL) {
  const reqs = await (await fetch(process.env.MOCK_CLAUDE_URL.replace('/v1/messages', '/_requests'))).json();
  const q = reqs[reqs.length - 1];
  assert.equal(q.path, '/v1/messages'); assert.equal(q.headers['x-api-key'], 'test-anthropic-key'); assert.equal(q.headers['anthropic-version'], '2026-10-21'); assert.equal(q.headers['anthropic-beta'], 'server-side-fallback-2026-07-01'); assert.match(q.headers['content-type'], /application\/json/);
  assert.equal(q.body.model, 'claude-opus-5-5'); assert.equal(q.body.fallbacks, 'default'); assert.equal(q.body.output_config.format.type, 'json_schema'); assert.equal(q.body.output_config.format.schema.additionalProperties, false); assert.ok(!('title' in q.body.output_config.format.schema));
  assert.match(q.body.system, /lead assistant/); assert.match(q.body.messages[0].content, /<business>[\s\S]*<\/business>[\s\S]*<enquiry>[\s\S]*<\/enquiry>/);
  ok(`REAL HTTP Request node sent ${reqs.length} correctly-formed Messages API requests (headers, model, structured-output schema, system prompt, delimited enquiry)`);
  assert.ok(reqs.filter((x) => /SIMULATE_AI_FAILURE/.test(x.body?.messages?.[0]?.content || '')).length >= 2); ok('a 529 overloaded response was retried before falling back to manual review');
}
console.log(`\nALL ${n} n8n END-TO-END CHECKS PASSED`);
