// Builds TEST-ONLY copies of the committed LIVE workflow for a throwaway local n8n:
//  - Google Sheets and Gmail nodes become Code-node stand-ins with the SAME names (so every connection and
//    $('Node') reference is exercised). They store rows/drafts/notifications in workflow static data.
//  - The REAL HTTP Request node is kept, with its URL pointed at a local mock of the Anthropic/OpenAI APIs.
//  - Markers in the enquiry text force failures: SIMULATE_REGISTER_FAILURE, SIMULATE_DRAFT_FAILURE (others are in mock-claude.mjs).
// Writes two workflows: Anthropic (path verloniq-lead-assistant) and OpenAI (path verloniq-lead-assistant-openai).
import { readFileSync, writeFileSync } from 'node:fs';

const [src, outAnthropic, outOpenAI] = process.argv.slice(2);
const MOCK = process.env.MOCK_AI_BASE || 'http://127.0.0.1:5680';

const make = ({ id, path, provider, credential }) => {
  if (!/^[A-Za-z0-9]{16}$/.test(id)) throw new Error('n8n workflow ids must be 16 letters/digits (static data is not saved otherwise)');
  const wf = JSON.parse(readFileSync(src, 'utf8'));
  const node = (name) => wf.nodes.find((x) => x.name === name);
  const asCode = (name, jsCode) => {
    const n = node(name);
    Object.assign(n, { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode } });
    for (const k of ['retryOnFail', 'maxTries', 'waitBetweenTries']) delete n[k];
  };
  const cfg = node('Workflow Configuration');
  const overrides = { staff_notification: { to: 'office@example.com', lead_register_url: 'https://docs.google.com/spreadsheets/d/TEST' }, ...(provider === 'openai' ? { ai: { provider: 'openai', openai_model: 'test-openai-model' } } : {}) };
  cfg.parameters.jsCode = cfg.parameters.jsCode.replace('const OVERRIDES = {};', `const OVERRIDES = ${JSON.stringify(overrides)};`);
  if (!cfg.parameters.jsCode.includes('office@example.com')) throw new Error('could not override the configuration');

  asCode('Find Existing Lead', "const store=$getWorkflowStaticData('global');const k=$input.first().json.dedupe_key;const rows=(store.rows||[]).filter(r=>r.dedupe_key===k);return rows.length?rows.map(r=>({json:r})):[{json:{}}];");
  asCode('Append to Lead Register', "if(/SIMULATE_REGISTER_FAILURE/.test($input.first().json.enquiry_text)) throw new Error('Simulated Google Sheets error: 503 The service is currently unavailable');const store=$getWorkflowStaticData('global');store.rows=store.rows||[];for(const i of $input.all())store.rows.push(i.json);return $input.all();");
  asCode('Gmail: Create Draft for Approval', "const j=$input.first().json;if(/SIMULATE_DRAFT_FAILURE/.test(j.enquiry_text)) throw new Error('Simulated Gmail error');const store=$getWorkflowStaticData('global');store.drafts=store.drafts||[];store.drafts.push({lead_id:j.lead_id,to:j.customer_email,subject:j.draft_subject});return [{json:{id:'draft_test',labelIds:['DRAFT']}}];");
  for (const name of ['Gmail: Notify Staff', 'Gmail: Alert Staff - Lead Not Saved']) {
    asCode(name, `const n=$input.first().json.notification;const store=$getWorkflowStaticData('global');store.sent=store.sent||[];store.sent.push({node:${JSON.stringify(name)},lead_id:$input.first().json.lead_id,to:n.to,subject:n.subject,body:n.body});return [{json:{id:'msg_test',labelIds:['SENT']}}];`);
  }
  const http = node('AI: Classify Enquiry');
  http.parameters.url = `={{ $json.ai_request.url.replace('https://api.anthropic.com', '${MOCK}').replace('https://api.openai.com', '${MOCK}') }}`;
  http.credentials = { httpHeaderAuth: credential };
  http.waitBetweenTries = 1000;

  const hook = node('Enquiry Webhook');
  hook.parameters.path = path;
  hook.webhookId = `${id}-hook`;
  hook.credentials = { httpHeaderAuth: { id: 'vqTestSecret', name: 'TEST webhook secret' } };
  wf.nodes.push(
    { id: `${id}-i1`, name: 'Inspect Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 600], webhookId: `${id}-inspect`, parameters: { httpMethod: 'GET', path: `${path}-inspect`, responseMode: 'lastNode', options: {} } },
    { id: `${id}-i2`, name: 'Inspect Store', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 600], parameters: { jsCode: "const s=$getWorkflowStaticData('global');return [{json:{rows:s.rows||[],drafts:s.drafts||[],sent:s.sent||[]}}];" } });
  wf.connections['Inspect Webhook'] = { main: [[{ node: 'Inspect Store', type: 'main', index: 0 }]] };
  wf.id = id; wf.name = `TEST COPY (${provider}) - ${wf.name}`; wf.active = true;
  return wf;
};

writeFileSync(outAnthropic, JSON.stringify(make({ id: 'vqLeadAssistTest', path: 'verloniq-lead-assistant', provider: 'anthropic', credential: { id: 'vqTestAnthropic', name: 'TEST anthropic key' } }), null, 2));
writeFileSync(outOpenAI, JSON.stringify(make({ id: 'vqLeadAssistOpAI', path: 'verloniq-lead-assistant-openai', provider: 'openai', credential: { id: 'vqTestOpenAI', name: 'TEST openai key' } }), null, 2));
console.log('test workflows written');
