#!/usr/bin/env node
// Builds verloniq-lead-assistant.workflow.json (importable into n8n) from:
//   code/*.js                         Code node sources (tested by tests/n8n-workflow.test.mjs)
//   prompts/classify-enquiry.system.md the AI system prompt
//   schema/ai-classification.schema.json the structured-output schema
//   ../../public/lead-assistant.js      the safety rules shared with the website demo
//
// Usage: node automation/n8n/build-workflow.mjs   (re-run after editing any of the above)
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

const inject = (code) => code
  .replace('/*@inject:SHARED*/', read('code/_shared.js').replace(/^\/\/.*\n/gm, '').trim())
  .replace('/*@inject:HAZARDS*/ []', JSON.stringify(hazards, null, 2))
  .replace('/*@inject:VULNERABLE_RE*/ /$^/', String(LA.VULNERABLE_RE))
  .replace("/*@inject:SYSTEM_PROMPT*/ ''", JSON.stringify(systemPrompt))
  .replace('/*@inject:AI_SCHEMA*/ {}', JSON.stringify(schema, null, 2));

export const code = {
  validate: inject(read('code/01-validate-enquiry.js')),
  buildRequest: inject(read('code/02-build-ai-request.js')),
  parse: inject(read('code/03-parse-and-safety-check.js')),
  fallback: inject(read('code/04-manual-review-fallback.js')),
  duplicate: inject(read('code/05-check-duplicate.js')),
};
for (const [k, v] of Object.entries(code)) if (v.includes('@inject')) throw new Error(`Uninjected placeholder in ${k}`);

// Deterministic IDs keep diffs readable when the workflow is rebuilt.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SHEET = { documentId: { __rl: true, value: '', mode: 'id' }, sheetName: { __rl: true, value: 'Leads', mode: 'name' } };
const ifNode = (n, name, position, conditions) => ({
  id: id(n), name, type: 'n8n-nodes-base.if', typeVersion: 2, position,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions, combinator: 'and' }, options: {} },
});
const cond = (n, leftValue, type, operation) => ({ id: id(900 + n), leftValue, rightValue: '', operator: { type, operation, singleValue: true } });
const respond = (n, name, position, code, body) => ({
  id: id(n), name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position,
  parameters: { respondWith: 'json', responseBody: body, options: { responseCode: code } },
});
const codeNode = (n, name, position, jsCode, extra = {}) => ({ id: id(n), name, type: 'n8n-nodes-base.code', typeVersion: 2, position, parameters: { jsCode }, ...extra });
const sticky = (n, name, position, width, height, content) => ({ id: id(n), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position, parameters: { content, width, height } });

const savedRow = "$('Append to Lead Register').first().json";
const nodes = [
  sticky(1, 'Note: Overview', [-80, -380], 620, 300,
    '## VERLONIQ AI Lead Assistant (template)\nCustomer enquiry → webhook → validation → duplicate check → Claude classification → Google Sheets lead register → Gmail **draft** → human approval.\n\n**Nothing is ever sent to the customer automatically.** Staff review the draft in Gmail and send it themselves.\n\nSetup: see automation/n8n/README.md in the VERLONIQ repository. Credentials needed: Header Auth (webhook secret), Header Auth (Anthropic API key), Google Sheets OAuth2, Gmail OAuth2.'),
  sticky(2, 'Note: Safety', [1360, -380], 520, 240,
    '## Safety & review\n- Deterministic safety rules run after the AI and **cannot be overridden by it**: gas, burning smell, sparks, shocks, water near electrics, flooding, CO, break-ins, asbestos → status **URGENT - call customer**.\n- Drafts with links, other email addresses or payment details are flagged for review.\n- If the AI call fails, the lead is still saved as **AI unavailable - manual review needed**.'),
  {
    id: id(10), name: 'Enquiry Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: id(10),
    parameters: { httpMethod: 'POST', path: 'verloniq-lead-assistant', authentication: 'headerAuth', responseMode: 'responseNode', options: {} },
  },
  codeNode(20, 'Validate & Normalise Enquiry', [220, 0], code.validate),
  ifNode(30, 'Valid?', [440, 0], [cond(1, '={{ $json.valid }}', 'boolean', 'true')]),
  respond(40, 'Respond: Invalid Request', [660, 200], 400, '={{ JSON.stringify({ ok: false, errors: $json.errors }) }}'),
  { id: id(50), name: 'Find Existing Lead', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: [660, -100], alwaysOutputData: true,
    parameters: { operation: 'read', ...SHEET, filtersUI: { values: [{ lookupColumn: 'dedupe_key', lookupValue: '={{ $json.dedupe_key }}' }] }, options: {} } },
  codeNode(60, 'Check Duplicate', [880, -100], code.duplicate),
  ifNode(70, 'Duplicate?', [1100, -100], [cond(2, '={{ $json.duplicate }}', 'boolean', 'true')]),
  respond(80, 'Respond: Duplicate', [1320, -260], 200, "={{ JSON.stringify({ ok: true, status: 'duplicate', lead_id: $json.existing_lead_id }) }}"),
  codeNode(90, 'Build AI Request', [1320, -40], code.buildRequest),
  {
    id: id(100), name: 'Claude: Classify Enquiry', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1540, -40],
    retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueErrorOutput',
    parameters: {
      method: 'POST', url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2026-10-21' }, { name: 'anthropic-beta', value: 'server-side-fallback-2026-07-01' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.request_body) }}',
      options: { timeout: 120000 },
    },
  },
  codeNode(110, 'Parse & Safety Check', [1780, -120], code.parse),
  codeNode(120, 'Manual Review Fallback', [1780, 80], code.fallback),
  { id: id(130), name: 'Append to Lead Register', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: [2000, -40],
    parameters: { operation: 'append', ...SHEET, columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] }, options: {} } },
  ifNode(140, 'Create Gmail Draft?', [2220, -40], [cond(3, '={{ $json.customer_email }}', 'string', 'notEmpty'), cond(4, '={{ $json.draft_body }}', 'string', 'notEmpty')]),
  {
    id: id(150), name: 'Gmail: Create Draft for Approval', type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [2440, -140],
    parameters: { resource: 'draft', operation: 'create', subject: '={{ $json.draft_subject }}', emailType: 'text', message: '={{ $json.draft_body }}', options: { sendTo: '={{ $json.customer_email }}' } },
  },
  respond(160, 'Respond: Lead Saved', [2660, -40], 200,
    `={{ JSON.stringify({ ok: true, lead_id: ${savedRow}.lead_id, status: ${savedRow}.status, urgency: ${savedRow}.urgency, safety_flag: ${savedRow}.safety_flag, draft_created: Boolean(${savedRow}.customer_email && ${savedRow}.draft_body) }) }}`),
];

const main = (...targets) => ({ main: targets.map((group) => group.map((node) => ({ node, type: 'main', index: 0 }))) });
const connections = {
  'Enquiry Webhook': main(['Validate & Normalise Enquiry']),
  'Validate & Normalise Enquiry': main(['Valid?']),
  'Valid?': main(['Find Existing Lead'], ['Respond: Invalid Request']),
  'Find Existing Lead': main(['Check Duplicate']),
  'Check Duplicate': main(['Duplicate?']),
  'Duplicate?': main(['Respond: Duplicate'], ['Build AI Request']),
  'Build AI Request': main(['Claude: Classify Enquiry']),
  'Claude: Classify Enquiry': main(['Parse & Safety Check'], ['Manual Review Fallback']),
  'Parse & Safety Check': main(['Append to Lead Register']),
  'Manual Review Fallback': main(['Append to Lead Register']),
  'Append to Lead Register': main(['Create Gmail Draft?']),
  'Create Gmail Draft?': main(['Gmail: Create Draft for Approval'], ['Respond: Lead Saved']),
  'Gmail: Create Draft for Approval': main(['Respond: Lead Saved']),
};

const workflow = {
  name: 'VERLONIQ - AI Lead Assistant (template)',
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1', saveManualExecutions: true, callerPolicy: 'workflowsFromSameOwner' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
};

// Sanity checks: every connection points at a real node, names and ids are unique.
const names = new Set(nodes.map((n) => n.name));
if (names.size !== nodes.length) throw new Error('Duplicate node names');
if (new Set(nodes.map((n) => n.id)).size !== nodes.length) throw new Error('Duplicate node ids');
for (const [from, c] of Object.entries(connections)) {
  if (!names.has(from)) throw new Error(`Unknown source node ${from}`);
  for (const group of c.main) for (const t of group) if (!names.has(t.node)) throw new Error(`Unknown target node ${t.node}`);
}

export { workflow };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(here, 'verloniq-lead-assistant.workflow.json'), JSON.stringify(workflow, null, 2) + '\n');
  console.log(`Wrote verloniq-lead-assistant.workflow.json (${nodes.length} nodes)`);
}
