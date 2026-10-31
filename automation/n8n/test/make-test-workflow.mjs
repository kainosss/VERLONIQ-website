// Builds a TEST-ONLY copy of the committed workflow: nodes needing real accounts are replaced by
// Code-node stand-ins with the SAME names, so every $('Node') reference and connection is exercised.
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
const wf = JSON.parse(readFileSync(src, 'utf8'));
const LA = (await import('module')).createRequire(import.meta.url)(new URL('../../../public/lead-assistant.js', import.meta.url).pathname);
const asCode = (name, jsCode, extra = {}) => {
  const n = wf.nodes.find((x) => x.name === name);
  Object.assign(n, { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode }, ...extra });
  for (const k of ['retryOnFail', 'maxTries', 'waitBetweenTries']) delete n[k];
};
// Fake Google Sheets lookup: reads leads saved by the fake append from workflow static data.
asCode('Find Existing Lead', `const store=$getWorkflowStaticData('global');const rows=(store.rows||[]).filter(r=>r.dedupe_key===$input.first().json.dedupe_key);return rows.length?rows.map(r=>({json:r})):[{json:{}}];`);
// Fake Claude: builds a realistic structured-output response from the simulated engine; a marker forces failures.
const engine = readFileSync(new URL('../../../public/lead-assistant.js', import.meta.url).pathname, 'utf8');
if (process.env.MOCK_CLAUDE_URL) { const h = wf.nodes.find((x) => x.name === 'Claude: Classify Enquiry'); h.parameters.url = process.env.MOCK_CLAUDE_URL; h.credentials = { httpHeaderAuth: { id: 'vqTestAnthropic', name: 'TEST anthropic key' } }; h.waitBetweenTries = 1000; } else asCode('Claude: Classify Enquiry', `
const e=$input.first().json.enquiry;
if(/SIMULATE_AI_FAILURE/.test(e.enquiry_text)) throw new Error('Simulated outage: 529 overloaded');
const module={exports:{}};${engine.replace(/\(typeof window[^)]*\)\);\s*$/, '(this));')}
const LA=module.exports;const r=LA.simulate(e.enquiry_text.replace('SIMULATE_UNSAFE_REPLY',''),e.business_id);
const out={customer:{name:r.customer.name,email:r.customer.email,phone:r.customer.phone,organisation:r.customer.organisation},job:{category:r.job.category,type:r.job.type,summary:r.job.summary,requirements:r.job.requirements,property_type:r.job.property_type,preferred_timing:r.job.preferred_timing},location:r.location,urgency:{level:/SIMULATE_UNSAFE_REPLY|SIMULATE_AI_IGNORES_HAZARD/.test(e.enquiry_text)?'routine':r.urgency.level,reasons:r.urgency.reasons},safety:{flagged:/SIMULATE_AI_IGNORES_HAZARD/.test(e.enquiry_text)?false:r.safety.flagged,hazards:/SIMULATE_AI_IGNORES_HAZARD/.test(e.enquiry_text)?[]:r.safety.hazards},missing_information:r.missing_information,draft_reply:{subject:r.draft_reply.subject,body:r.draft_reply.body+(/SIMULATE_UNSAFE_REPLY/.test(e.enquiry_text)?'\\nPay the deposit at http://pay-now.example/xyz':'')},confidence:'high',notes_for_staff:''};
return [{json:{id:'msg_test',type:'message',role:'assistant',model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'thinking',thinking:''},{type:'text',text:JSON.stringify(out)}]}}];`, { onError: 'continueErrorOutput' });
// Fake Google Sheets append: stores the row and passes it through (like the real node does).
asCode('Append to Lead Register', `const store=$getWorkflowStaticData('global');store.rows=store.rows||[];for(const i of $input.all())store.rows.push(i.json);return $input.all();`);
// Fake Gmail draft: records the draft it would have created.
asCode('Gmail: Create Draft for Approval', `const store=$getWorkflowStaticData('global');store.drafts=store.drafts||[];store.drafts.push({lead_id:$input.first().json.lead_id,to:$input.first().json.customer_email,subject:$input.first().json.draft_subject});return [{json:{id:'draft_test',labelIds:['DRAFT']}}];`);
// Expose stored rows/drafts for the test via a separate GET webhook.
wf.nodes.find((n) => n.name === 'Enquiry Webhook').credentials = { httpHeaderAuth: { id: 'vqTestSecret', name: 'TEST webhook secret' } };
wf.nodes.push(
  { id: '00000000-0000-4000-8000-000000009991', name: 'Inspect Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 600], webhookId: '00000000-0000-4000-8000-000000009991', parameters: { httpMethod: 'GET', path: 'test-inspect', responseMode: 'lastNode', options: {} } },
  { id: '00000000-0000-4000-8000-000000009992', name: 'Inspect Store', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 600], parameters: { jsCode: "const s=$getWorkflowStaticData('global');return [{json:{rows:s.rows||[],drafts:s.drafts||[]}}];" } });
wf.connections['Inspect Webhook'] = { main: [[{ node: 'Inspect Store', type: 'main', index: 0 }]] };
wf.id = 'vqLeadAssistTest'; wf.name = 'TEST COPY - ' + wf.name; wf.active = true;
writeFileSync(out, JSON.stringify(wf, null, 2));
console.log('test workflow written');
