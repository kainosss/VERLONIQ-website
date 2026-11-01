// n8n Code node: "Build AI Request" (mode: Run Once for All Items)
// Builds the request for the configured AI provider. API keys are NOT here: the "AI: Classify Enquiry"
// HTTP Request node adds them from an n8n Header Auth credential.
//   anthropic: POST https://api.anthropic.com/v1/messages  (credential header: x-api-key)
//   openai:    POST https://api.openai.com/v1/chat/completions (credential header: Authorization = "Bearer <key>")
//   mock:      no request; the "Mock AI (demo only)" node answers with deterministic test rules.
const { config } = $('Workflow Configuration').first().json;
const SYSTEM_PROMPT = /*@inject:SYSTEM_PROMPT*/ '';
const OUTPUT_SCHEMA = /*@inject:AI_SCHEMA*/ {};
// Server-side refusal fallback is only available on these Anthropic models (not Haiku).
const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'];

// Keep the customer's text clearly separated from instructions.
const escapeTags = (s) => String(s).replace(/<\/?(enquiry|business|form_fields)>/gi, '');

const ctx = $input.first().json;
const e = ctx.enquiry;
const biz = config.businesses[e.business_id];
const provided = [
  e.customer_name && `Name given in the form: ${e.customer_name}`,
  e.customer_email && `Email given in the form: ${e.customer_email}`,
  e.customer_phone && `Phone given in the form: ${e.customer_phone}`,
].filter(Boolean).join('\n');
const userContent =
  `<business>\nName: ${biz.name}\nTrade: ${biz.trade}\nService area: ${biz.service_area}\nSign-off: ${biz.signoff}\n</business>\n\n` +
  (provided ? `<form_fields>\n${escapeTags(provided)}\n</form_fields>\n\n` : '') +
  `<enquiry>\n${escapeTags(e.enquiry_text)}\n</enquiry>`;

const provider = config.ai.provider;
let ai_request = null;
let model = 'mock (deterministic test rules - not AI)';
if (provider === 'anthropic') {
  model = config.ai.model;
  const useFallback = FALLBACK_MODELS.includes(model);
  const headers = { 'anthropic-version': '2026-10-21', 'content-type': 'application/json' };
  if (useFallback) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  const body = {
    model,
    max_tokens: config.ai.max_tokens,
    output_config: { effort: config.ai.effort, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  };
  if (useFallback) body.fallbacks = 'default'; // re-runs on a fallback model if this one declines on safety grounds
  ai_request = { url: 'https://api.anthropic.com/v1/messages', headers, body };
} else if (provider === 'openai') {
  model = config.ai.openai_model;
  ai_request = {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { 'content-type': 'application/json' },
    body: {
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userContent }],
      response_format: { type: 'json_schema', json_schema: { name: 'lead_classification', strict: true, schema: OUTPUT_SCHEMA } },
    },
  };
}

return [{
  json: {
    ...ctx,
    business: { id: e.business_id, ...biz },
    ai_provider: provider,
    ai_model: model,
    use_mock_ai: provider === 'mock',
    ai_request,
  },
}];
