#!/usr/bin/env node
// Builds the importable n8n workflows from the sources in this folder:
//   verloniq-lead-assistant.workflow.json       LIVE template (inactive; needs credentials, see README)
//   verloniq-lead-assistant.demo.workflow.json  DEMO (no credentials; mock AI + stand-ins; sends nothing)
//   verloniq-lead-assistant-error-alert.workflow.json  optional error workflow (emails staff if a run crashes)
//
// Sources: code/*.js (Code nodes), prompts/classify-enquiry.system.md, schema/ai-classification.schema.json,
// demo/scenarios.json, and ../../public/lead-assistant.js (read only: shared safety rules and the demo rules).
// Usage: node automation/n8n/build-workflow.mjs   (re-run after editing any source; never hand-edit the JSON)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const read = (p) => readFileSync(join(here, p), 'utf8');

const LA = require('../../public/lead-assistant.js');
const hazards = LA.HAZARDS.map((h) => ({ code: h.code, label: h.label, action: h.action, source: h.re.source, flags: h.re.flags }));
const schema = JSON.parse(read('schema/ai-classification.schema.json'));
delete schema.title; delete schema.description; // documentation only; not sent to the API
const systemPrompt = read('prompts/classify-enquiry.system.md').trim();
const engine = read('../../public/lead-assistant.js').replace(/\}\)\(typeof window !== 'undefined' \? window : this\);\s*$/, '})({});');
if (!engine.endsWith('})({});')) throw new Error('Could not embed public/lead-assistant.js (its closing line changed)');
export const scenarios = JSON.parse(read('demo/scenarios.json'));

const inject = (src, overrides = {}) => src
  .replace('/*@inject:SHARED*/', read('code/_shared.js').replace(/^\/\/.*\n/gm, '').trim())
  .replace('/*@inject:HAZARDS*/ []', JSON.stringify(hazards, null, 2))
  .replace('/*@inject:VULNERABLE_RE*/ /$^/', String(LA.VULNERABLE_RE))
  .replace("/*@inject:SYSTEM_PROMPT*/ ''", JSON.stringify(systemPrompt))
  .replace('/*@inject:AI_SCHEMA*/ {}', JSON.stringify(schema, null, 2))
  .replace('/*@inject:DEMO_ENGINE*/', engine)
  .replace('/*@inject:OVERRIDES*/ {}', JSON.stringify(overrides, null, 2))
  .replace('/*@inject:SCENARIOS*/ []', JSON.stringify(scenarios, null, 2));

export const code = {
  config: inject(read('code/00-config.js')),
  validate: inject(read('code/01-validate-enquiry.js')),
  buildRequest: inject(read('code/02-build-ai-request.js')),
  parse: inject(read('code/03-parse-and-safety-check.js')),
  fallback: inject(read('code/04-manual-review-fallback.js')),
  duplicate: inject(read('code/05-check-duplicate.js')),
  mockAi: inject(read('code/06-mock-ai.js')),
  prepareNotification: inject(read('code/07-prepare-staff-notification.js')),
  registerAlert: inject(read('code/08-register-failure-alert.js')),
  buildResponse: inject(read('code/09-build-response.js')),
};
for (const [k, v] of Object.entries(code)) if (v.includes('@inject')) throw new Error(`Uninjected placeholder in ${k}`);

// ---------- node helpers (deterministic IDs keep diffs readable) ----------
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SHEET = { documentId: { __rl: true, value: '', mode: 'id' }, sheetName: { __rl: true, value: 'Leads', mode: 'name' } };
const ifNode = (n, name, position, conditions) => ({
  id: id(n), name, type: 'n8n-nodes-base.if', typeVersion: 2, position,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions, combinator: 'and' }, options: {} },
});
const isTrue = (n, leftValue) => ({ id: id(900 + n), leftValue, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } });
const notEmpty = (n, leftValue) => ({ id: id(900 + n), leftValue, rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } });
const respond = (n, name, position, status, body) => ({
  id: id(n), name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position,
  parameters: { respondWith: 'json', responseBody: body, options: { responseCode: status } },
});
const codeNode = (n, name, position, jsCode, extra = {}) => ({ id: id(n), name, type: 'n8n-nodes-base.code', typeVersion: 2, position, parameters: { jsCode }, ...extra });
const sticky = (n, name, position, width, height, content) => ({ id: id(n), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position, parameters: { content, width, height } });
const gmailSend = (n, name, position) => ({
  id: id(n), name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position, onError: 'continueRegularOutput',
  parameters: { resource: 'message', operation: 'send', sendTo: '={{ $json.notification.to }}', subject: '={{ $json.notification.subject }}', emailType: 'text', message: '={{ $json.notification.body }}', options: { appendAttribution: false } },
});
const main = (...targets) => ({ main: targets.map((group) => group.map((node) => ({ node, type: 'main', index: 0 }))) });

// Webhook response bodies (also reused by the demo's stand-ins so both report identically).
const RESPONSES = {
  invalid: { status: 400, expr: '={{ JSON.stringify({ ok: false, errors: $json.errors }) }}' },
  duplicate: { status: 200, expr: "={{ JSON.stringify({ ok: true, status: 'duplicate', lead_id: $json.existing_lead_id }) }}" },
  saved: { status: 200, expr: '={{ JSON.stringify($json) }}' },
  registerFailed: {
    status: 503,
    expr: "={{ JSON.stringify({ ok: false, status: 'register_failed', lead_id: $('Prepare Register Failure Alert').first().json.lead_id, staff_alerted: $('Gmail: Alert Staff - Lead Not Saved').isExecuted && !$('Gmail: Alert Staff - Lead Not Saved').first().json.error, message: 'The lead could not be saved to the lead register. Staff were emailed the full lead if staff_alerted is true; retry later or check n8n.' }) }}",
  },
};

// ---------- LIVE workflow ----------
const nodes = [
  sticky(1, 'Note: Overview', [-60, -560], 760, 400,
    '## VERLONIQ AI Lead Assistant v2 (template - INACTIVE)\nEnquiry → webhook (secret header) → **Workflow Configuration** → validation → duplicate check → AI classification (Anthropic / OpenAI / mock) → strict output validation + safety rules → **Google Sheets lead register** → Gmail **draft** reply → **internal staff notification**.\n\n**Customers are never emailed automatically.** Replies are only saved as Gmail drafts that a person checks, edits and sends.\n\nSetup: automation/n8n/README.md in the VERLONIQ repository. Credentials: Header Auth (webhook secret), Header Auth (AI API key), Google Sheets OAuth2, Gmail OAuth2. Customise everything in **Workflow Configuration**.'),
  sticky(2, 'Note: Safety', [1500, -560], 600, 330,
    '## Safety & review\n- Deterministic safety rules run after the AI and **cannot be overridden by it** (gas, burning smell, sparks, shocks, water near electrics, flooding, CO, break-ins, asbestos) → **URGENT - call customer**. Urgency is an *assessment* staff must confirm.\n- AI output is validated against the schema; contact or address details not present in the enquiry are removed.\n- Links, other email addresses, payment wording, prompt-injection attempts and sensitive data are flagged for review.\n- AI failure → lead still saved for manual review. Lead register failure → full lead emailed to staff, webhook answers 503.'),
  sticky(3, 'Note: Failure handling', [2380, 360], 560, 200,
    '## If the lead register fails\nThe lead is emailed to the staff address so it is not lost, and the caller receives HTTP 503 so it can retry. Also set **Settings → Error workflow** to "VERLONIQ - Lead Assistant Error Alert" so any crash emails staff.'),
  {
    id: id(10), name: 'Enquiry Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: id(10),
    parameters: { httpMethod: 'POST', path: 'verloniq-lead-assistant', authentication: 'headerAuth', responseMode: 'responseNode', options: {} },
  },
  codeNode(15, 'Workflow Configuration', [220, 0], code.config),
  codeNode(20, 'Validate & Normalise Enquiry', [440, 0], code.validate),
  ifNode(30, 'Valid?', [660, 0], [isTrue(1, '={{ $json.valid }}')]),
  respond(40, 'Respond: Invalid Request', [880, 220], RESPONSES.invalid.status, RESPONSES.invalid.expr),
  { id: id(50), name: 'Find Existing Lead', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: [880, -100], alwaysOutputData: true, onError: 'continueRegularOutput',
    parameters: { operation: 'read', ...SHEET, filtersUI: { values: [{ lookupColumn: 'dedupe_key', lookupValue: '={{ $json.dedupe_key }}' }] }, options: {} } },
  codeNode(60, 'Check Duplicate', [1100, -100], code.duplicate),
  ifNode(70, 'Duplicate?', [1320, -100], [isTrue(2, '={{ $json.duplicate }}')]),
  respond(80, 'Respond: Duplicate', [1540, -300], RESPONSES.duplicate.status, RESPONSES.duplicate.expr),
  codeNode(90, 'Build AI Request', [1540, -60], code.buildRequest),
  ifNode(95, 'Use Mock AI?', [1760, -60], [isTrue(3, '={{ $json.use_mock_ai }}')]),
  {
    id: id(100), name: 'AI: Classify Enquiry', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1980, -160],
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueErrorOutput',
    parameters: {
      method: 'POST', url: '={{ $json.ai_request.url }}',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, specifyHeaders: 'json', jsonHeaders: '={{ JSON.stringify($json.ai_request.headers) }}',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.ai_request.body) }}',
      options: { timeout: 120000 },
    },
  },
  codeNode(105, 'Mock AI (demo only)', [1980, 60], code.mockAi, { onError: 'continueErrorOutput', notes: 'Runs only when ai.provider is "mock". Not AI: deterministic test rules.', notesInFlow: true }),
  codeNode(110, 'Parse & Safety Check', [2200, -160], code.parse),
  codeNode(120, 'Manual Review Fallback', [2200, 60], code.fallback),
  { id: id(130), name: 'Append to Lead Register', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: [2420, -60], onError: 'continueErrorOutput',
    parameters: { operation: 'append', ...SHEET, columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] }, options: {} } },
  ifNode(140, 'Create Gmail Draft?', [2640, -60], [notEmpty(4, '={{ $json.customer_email }}'), notEmpty(5, '={{ $json.draft_body }}'), isTrue(6, "={{ $('Workflow Configuration').first().json.config.customer_drafts.enabled }}")]),
  {
    id: id(150), name: 'Gmail: Create Draft for Approval', type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [2860, -160], onError: 'continueRegularOutput',
    parameters: { resource: 'draft', operation: 'create', subject: '={{ $json.draft_subject }}', emailType: 'text', message: '={{ $json.draft_body }}', options: { sendTo: '={{ $json.customer_email }}' } },
  },
  codeNode(160, 'Prepare Staff Notification', [3080, -60], code.prepareNotification),
  ifNode(165, 'Notify Staff?', [3300, -60], [isTrue(7, '={{ $json.notify }}')]),
  gmailSend(170, 'Gmail: Notify Staff', [3520, -160]),
  codeNode(175, 'Build Response', [3740, -60], code.buildResponse),
  respond(180, 'Respond: Lead Saved', [3960, -60], RESPONSES.saved.status, RESPONSES.saved.expr),
  codeNode(190, 'Prepare Register Failure Alert', [2640, 200], code.registerAlert),
  ifNode(195, 'Alert Staff?', [2860, 200], [isTrue(8, '={{ $json.notify }}')]),
  gmailSend(200, 'Gmail: Alert Staff - Lead Not Saved', [3080, 120]),
  respond(210, 'Respond: Register Failed', [3300, 220], RESPONSES.registerFailed.status, RESPONSES.registerFailed.expr),
];

const connections = {
  'Enquiry Webhook': main(['Workflow Configuration']),
  'Workflow Configuration': main(['Validate & Normalise Enquiry']),
  'Validate & Normalise Enquiry': main(['Valid?']),
  'Valid?': main(['Find Existing Lead'], ['Respond: Invalid Request']),
  'Find Existing Lead': main(['Check Duplicate']),
  'Check Duplicate': main(['Duplicate?']),
  'Duplicate?': main(['Respond: Duplicate'], ['Build AI Request']),
  'Build AI Request': main(['Use Mock AI?']),
  'Use Mock AI?': main(['Mock AI (demo only)'], ['AI: Classify Enquiry']),
  'AI: Classify Enquiry': main(['Parse & Safety Check'], ['Manual Review Fallback']),
  'Mock AI (demo only)': main(['Parse & Safety Check'], ['Manual Review Fallback']),
  'Parse & Safety Check': main(['Append to Lead Register']),
  'Manual Review Fallback': main(['Append to Lead Register']),
  'Append to Lead Register': main(['Create Gmail Draft?'], ['Prepare Register Failure Alert']),
  'Create Gmail Draft?': main(['Gmail: Create Draft for Approval'], ['Prepare Staff Notification']),
  'Gmail: Create Draft for Approval': main(['Prepare Staff Notification']),
  'Prepare Staff Notification': main(['Notify Staff?']),
  'Notify Staff?': main(['Gmail: Notify Staff'], ['Build Response']),
  'Gmail: Notify Staff': main(['Build Response']),
  'Build Response': main(['Respond: Lead Saved']),
  'Prepare Register Failure Alert': main(['Alert Staff?']),
  'Alert Staff?': main(['Gmail: Alert Staff - Lead Not Saved'], ['Respond: Register Failed']),
  'Gmail: Alert Staff - Lead Not Saved': main(['Respond: Register Failed']),
};

const check = (wf) => {
  const names = new Set(wf.nodes.map((n) => n.name));
  if (names.size !== wf.nodes.length) throw new Error(`${wf.name}: duplicate node names`);
  if (new Set(wf.nodes.map((n) => n.id)).size !== wf.nodes.length) throw new Error(`${wf.name}: duplicate node ids`);
  for (const [from, c] of Object.entries(wf.connections)) {
    if (!names.has(from)) throw new Error(`${wf.name}: unknown source node ${from}`);
    for (const group of c.main) for (const t of group) if (!names.has(t.node)) throw new Error(`${wf.name}: unknown target node ${t.node}`);
  }
  // Every Code node's $('Node') reference must name a node that exists.
  for (const n of wf.nodes) for (const m of JSON.stringify(n.parameters).matchAll(/\$\(\\?['"]([^'"\\]+)\\?['"]\)/g)) if (!names.has(m[1])) throw new Error(`${wf.name}: ${n.name} references missing node ${m[1]}`);
  return wf;
};

export const workflow = check({
  name: 'VERLONIQ - AI Lead Assistant (template)',
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1', saveManualExecutions: true, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all', callerPolicy: 'workflowsFromSameOwner' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
});

// ---------- DEMO workflow: same graph, no credentials, nothing leaves n8n ----------
// Integration nodes become Code-node stand-ins with the SAME names, so every connection and $('Node')
// reference is exercised. They are labelled DEMO in the editor and in their output.
const DEMO_OVERRIDES = { ai: { provider: 'mock' }, staff_notification: { to: 'staff-demo@example.com', lead_register_url: '' } };
const demoCtl = "($('Workflow Configuration').first().json.demo || {})";
const standin = (name, jsCode, keep = []) => (n) => {
  const out = { id: n.id, name: n.name, type: 'n8n-nodes-base.code', typeVersion: 2, position: n.position, parameters: { jsCode }, notes: `DEMO stand-in for "${n.name}" - no external service is contacted.`, notesInFlow: true };
  for (const k of keep) if (k in n) out[k] = n[k];
  return out;
};
const respondStandin = (bodyJs, status) => `// DEMO stand-in for a "Respond to Webhook" node: shows the HTTP response the caller would receive.\nreturn [{ json: { http_status: ${status}, body: ${bodyJs} } }];`;
const DEMO_STANDINS = {
  'Find Existing Lead': standin('Find Existing Lead', `const d = ${demoCtl};\nif (d.lookup_failure) throw new Error('DEMO: simulated Google Sheets outage during the duplicate check');\nconst key = $input.first().json.dedupe_key;\n// Demo register: the "duplicate" scenario pretends this enquiry is already in the sheet.\nreturn d.existing_lead ? [{ json: { lead_id: d.existing_lead, dedupe_key: key, status: 'New - draft awaiting approval' } }] : [{ json: {} }];`, ['alwaysOutputData', 'onError']),
  'AI: Classify Enquiry': standin('AI: Classify Enquiry', "throw new Error('The demo workflow uses the Mock AI only. Import the live template to call a real AI provider.');", ['onError']),
  'Append to Lead Register': standin('Append to Lead Register', `if (${demoCtl}.register_failure) throw new Error('DEMO: simulated Google Sheets error (503 The service is currently unavailable)');\n// The real node appends the row and passes it on; so does this stand-in (nothing is stored).\nreturn $input.all();`, ['onError']),
  'Gmail: Create Draft for Approval': standin('Gmail: Create Draft for Approval', `if (${demoCtl}.draft_failure) throw new Error('DEMO: simulated Gmail error while creating the draft');\nconst j = $input.first().json;\nreturn [{ json: { id: 'demo-draft', labelIds: ['DRAFT'], demo_note: 'DEMO: a Gmail DRAFT would be created here. It is never sent automatically.', to: j.customer_email, subject: j.draft_subject } }];`, ['onError']),
  'Gmail: Notify Staff': standin('Gmail: Notify Staff', "const n = $input.first().json.notification;\nreturn [{ json: { id: 'demo-message', demo_note: 'DEMO: this INTERNAL notification would be emailed to the staff address. Nothing was sent.', to: n.to, subject: n.subject, body: n.body } }];", ['onError']),
  'Gmail: Alert Staff - Lead Not Saved': standin('Gmail: Alert Staff - Lead Not Saved', "const n = $input.first().json.notification;\nreturn [{ json: { id: 'demo-alert', demo_note: 'DEMO: this INTERNAL alert would be emailed to the staff address. Nothing was sent.', to: n.to, subject: n.subject, body: n.body } }];", ['onError']),
  'Respond: Invalid Request': standin('Respond: Invalid Request', respondStandin('{ ok: false, errors: $json.errors }', 400)),
  'Respond: Duplicate': standin('Respond: Duplicate', respondStandin("{ ok: true, status: 'duplicate', lead_id: $json.existing_lead_id }", 200)),
  'Respond: Lead Saved': standin('Respond: Lead Saved', respondStandin('$json', 200)),
  'Respond: Register Failed': standin('Respond: Register Failed', respondStandin("{ ok: false, status: 'register_failed', lead_id: $('Prepare Register Failure Alert').first().json.lead_id, staff_alerted: $('Gmail: Alert Staff - Lead Not Saved').isExecuted && !$('Gmail: Alert Staff - Lead Not Saved').first().json.error, message: 'The lead could not be saved to the lead register.' }", 503)),
};
const chooseScenario = `// DEMO: choose which fictional enquiry to run, then click "Execute workflow".
// Change SCENARIO to any id below. All names, emails and phone numbers are fictional.
const SCENARIO = 'emergency-safety';
const SCENARIOS = /*@inject:SCENARIOS*/ [];
const s = SCENARIOS.find((x) => x.id === SCENARIO);
if (!s) throw new Error('Unknown SCENARIO "' + SCENARIO + '". Choose one of: ' + SCENARIOS.map((x) => x.id).join(', '));
return [{ json: { request: { body: s.request }, demo: { ...(s.demo || {}), scenario: s.id, title: s.title } } }];`;
export const chooseScenarioCode = (scenarioId) => inject(chooseScenario).replace("const SCENARIO = 'emergency-safety';", `const SCENARIO = ${JSON.stringify(scenarioId)};`);

const demoNodes = nodes.map((n) => {
  if (n.name === 'Enquiry Webhook') return { id: id(5), name: 'Run Demo', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [-220, 0], parameters: {} };
  if (n.name === 'Workflow Configuration') return { ...n, parameters: { jsCode: inject(read('code/00-config.js'), DEMO_OVERRIDES) }, notes: 'DEMO: ai.provider is forced to "mock" and the staff address is a placeholder.', notesInFlow: true };
  if (n.name === 'Note: Overview') return sticky(1, 'Note: Overview', [-280, -560], 820, 400,
    '## DEMO - VERLONIQ AI Lead Assistant (no credentials, nothing is sent)\n1. Open **Choose Demo Scenario** and set `SCENARIO` (14 fictional enquiries are listed there).\n2. Click **Execute workflow**.\n3. Click each node to see what it produced. The last green node shows the webhook response.\n\nThe **Mock AI** is NOT artificial intelligence - it is the website demo\'s keyword rules. Google Sheets and Gmail are replaced by **DEMO stand-ins** that store and send nothing. Use the live template (`verloniq-lead-assistant.workflow.json`) for real processing.');
  return DEMO_STANDINS[n.name] ? DEMO_STANDINS[n.name](n) : n;
});
demoNodes.splice(demoNodes.findIndex((n) => n.name === 'Workflow Configuration'), 0, codeNode(7, 'Choose Demo Scenario', [0, 0], inject(chooseScenario)));
const demoConnections = { 'Run Demo': main(['Choose Demo Scenario']), 'Choose Demo Scenario': main(['Workflow Configuration']), ...connections };
delete demoConnections['Enquiry Webhook'];
export const demoWorkflow = check({
  name: 'VERLONIQ - AI Lead Assistant (DEMO - mock AI, nothing is sent)',
  nodes: demoNodes,
  connections: demoConnections,
  active: false,
  settings: { executionOrder: 'v1', saveManualExecutions: true },
  pinData: {},
  meta: { templateCredsSetupCompleted: true },
  tags: [],
});

// ---------- ERROR ALERT workflow ----------
export const errorAlertCode = `// Formats an alert when the AI Lead Assistant workflow fails unexpectedly, so a lead is never lost silently.
// Set STAFF_EMAIL to the same internal address as staff_notification.to in the main workflow.
const STAFF_EMAIL = '';
const e = $input.first().json || {};
const ex = e.execution || {};
const err = ex.error || {};
if (!STAFF_EMAIL) throw new Error('Set STAFF_EMAIL in "Prepare Error Alert" so failures can be emailed to staff.');
return [{ json: { notification: {
  to: STAFF_EMAIL,
  subject: '[ACTION NEEDED] VERLONIQ Lead Assistant failed - an enquiry may need manual handling',
  body: 'The workflow "' + ((e.workflow || {}).name || 'unknown') + '" stopped with an error.\\n\\n' +
    'Failed node: ' + (ex.lastNodeExecuted || 'unknown') + '\\nError: ' + String(err.message || 'unknown').slice(0, 500) + '\\n' +
    'Execution: ' + (ex.url || ex.id || 'unknown') + '\\n\\n' +
    'Open the execution in n8n to see the enquiry that was being processed, then handle it manually. Nothing was sent to the customer.',
} } }];`;
export const errorWorkflow = check({
  name: 'VERLONIQ - Lead Assistant Error Alert',
  nodes: [
    sticky(1, 'Note', [-40, -260], 520, 200, '## Error alert\nSelect this workflow in the main workflow\'s **Settings → Error workflow**. Set STAFF_EMAIL in "Prepare Error Alert" and choose the Gmail credential. It does not need to be activated.'),
    { id: id(10), name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
    codeNode(20, 'Prepare Error Alert', [220, 0], errorAlertCode),
    gmailSend(30, 'Gmail: Alert Staff', [440, 0]),
  ],
  connections: { 'Error Trigger': main(['Prepare Error Alert']), 'Prepare Error Alert': main(['Gmail: Alert Staff']) },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = [
    ['verloniq-lead-assistant.workflow.json', workflow],
    ['verloniq-lead-assistant.demo.workflow.json', demoWorkflow],
    ['verloniq-lead-assistant-error-alert.workflow.json', errorWorkflow],
  ];
  for (const [file, wf] of out) {
    writeFileSync(join(here, file), JSON.stringify(wf, null, 2) + '\n');
    console.log(`Wrote ${file} (${wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').length} nodes)`);
  }
}
