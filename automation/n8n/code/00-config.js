// n8n Code node: "Workflow Configuration" (mode: Run Once for All Items)
// THE ONE PLACE TO CUSTOMISE THE WORKFLOW FOR A CLIENT. Edit the values below (in n8n, or in
// automation/n8n/code/00-config.js and rebuild). No secrets belong here: API keys and Google sign-ins
// live only in n8n credentials.
//
// Input: the trigger's item (the Webhook request, or the demo scenario in the demo workflow).
// Output: { config, request, demo } — later nodes read the config with $('Workflow Configuration').
const CONFIG = {
  workflow_version: '2.0.0',

  // AI provider. 'anthropic' (default) | 'openai' | 'mock' (no AI: deterministic test rules, for demos only).
  ai: {
    provider: 'anthropic',
    model: 'claude-opus-5-5', // Anthropic examples: claude-opus-5-5 (default), claude-sonnet-5-5, claude-haiku-5-5
    effort: 'medium',         // Anthropic only: low | medium | high
    max_tokens: 16000,
    openai_model: '',         // Required if provider is 'openai': set a current model name from your OpenAI account.
  },

  // Who is told about each new lead (an INTERNAL address). Leave empty to skip notifications.
  // Customers are never emailed automatically: customer replies are only ever saved as Gmail drafts.
  staff_notification: {
    enabled: true,
    to: '',                   // e.g. 'office@your-business.example'
    lead_register_url: '',    // optional link to the Google Sheet, included in the notification
  },

  // Gmail drafts of the customer reply (never sent automatically).
  customer_drafts: { enabled: true },

  // Business profiles. The webhook's business_id must match one of these keys.
  // The four trade profiles and the cleaning profile are FICTIONAL demo businesses.
  // For a real client, replace them with that client's details (one workflow copy per client).
  businesses: {
    electrical: { name: 'Voltara Electrical', trade: 'Electrician', service_area: 'Brisbane, QLD', signoff: 'The Voltara Electrical team' },
    plumbing: { name: 'Pipewell Plumbing', trade: 'Plumber and gasfitter', service_area: 'Brisbane, QLD', signoff: 'The Pipewell Plumbing team' },
    aircon: { name: 'Coolbreak Air Conditioning', trade: 'Air-conditioning contractor', service_area: 'Brisbane, QLD', signoff: 'The Coolbreak Air Conditioning team' },
    security: { name: 'Guardline Security', trade: 'Electronic security installer (alarms, CCTV, access control)', service_area: 'Brisbane, QLD', signoff: 'The Guardline Security team' },
    cleaning: { name: 'Brightway Commercial Cleaning', trade: 'Commercial cleaning service (offices, clinics, end-of-lease)', service_area: 'Brisbane, QLD', signoff: 'The Brightway Cleaning team' },
  },

  limits: { min_enquiry_chars: 15, max_enquiry_chars: 4000 },
};

// Overrides added by build-workflow.mjs for the DEMO workflow only (empty in the live template).
const OVERRIDES = /*@inject:OVERRIDES*/ {};
const merge = (a, b) => { const out = { ...a }; for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return out; };
const config = merge(CONFIG, OVERRIDES);

// Fail fast on configuration mistakes (these are setup errors, not customer errors).
const problems = [];
if (!['anthropic', 'openai', 'mock'].includes(config.ai.provider)) problems.push(`ai.provider must be anthropic, openai or mock (got "${config.ai.provider}")`);
if (config.ai.provider === 'anthropic' && !config.ai.model) problems.push('ai.model is empty');
if (config.ai.provider === 'openai' && !config.ai.openai_model) problems.push('ai.openai_model must be set when ai.provider is openai');
if (!Object.keys(config.businesses).length) problems.push('at least one business profile is required');
for (const [id, b] of Object.entries(config.businesses)) if (!/^[a-z0-9-]{2,40}$/.test(id) || !b.name || !b.signoff) problems.push(`business "${id}" needs a lower-case id, a name and a signoff`);
if (config.staff_notification.to && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(config.staff_notification.to)) problems.push('staff_notification.to is not a valid email address');
if (problems.length) throw new Error('Workflow Configuration: ' + problems.join('; '));

const item = $input.first().json || {};
return [{ json: { config, request: item.request || item, demo: item.demo || null } }];
