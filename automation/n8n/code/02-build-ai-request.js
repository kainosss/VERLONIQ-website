// n8n Code node: "Build AI Request" (mode: Run Once for All Items)
// Builds the Claude Messages API request body. The API key is NOT here — the
// HTTP Request node adds it from an n8n credential (header x-api-key).
// For a real client, replace BUSINESSES with that client's name, trade and sign-off.
const BUSINESSES = {
  electrical: { name: 'Voltara Electrical', trade: 'Electrician', service_area: 'Brisbane, QLD', signoff: 'The Voltara Electrical team' },
  plumbing: { name: 'Pipewell Plumbing', trade: 'Plumber and gasfitter', service_area: 'Brisbane, QLD', signoff: 'The Pipewell Plumbing team' },
  aircon: { name: 'Coolbreak Air Conditioning', trade: 'Air-conditioning contractor', service_area: 'Brisbane, QLD', signoff: 'The Coolbreak Air Conditioning team' },
  security: { name: 'Guardline Security', trade: 'Electronic security installer (alarms, CCTV, access control)', service_area: 'Brisbane, QLD', signoff: 'The Guardline Security team' },
};

const MODEL = 'claude-opus-5-5';
const SYSTEM_PROMPT = /*@inject:SYSTEM_PROMPT*/ '';
const OUTPUT_SCHEMA = /*@inject:AI_SCHEMA*/ {};

// Keep the customer's text clearly separated from instructions.
const escapeTags = (s) => String(s).replace(/<\/?(enquiry|business)>/gi, '');

return $input.all().map((item) => {
  const e = item.json.enquiry;
  const biz = BUSINESSES[e.business_id];
  const provided = [
    e.customer_name && `Name given in the form: ${e.customer_name}`,
    e.customer_email && `Email given in the form: ${e.customer_email}`,
    e.customer_phone && `Phone given in the form: ${e.customer_phone}`,
  ].filter(Boolean).join('\n');

  const userContent =
    `<business>\nName: ${biz.name}\nTrade: ${biz.trade}\nService area: ${biz.service_area}\nSign-off: ${biz.signoff}\n</business>\n\n` +
    (provided ? `<form_fields>\n${escapeTags(provided)}\n</form_fields>\n\n` : '') +
    `<enquiry>\n${escapeTags(e.enquiry_text)}\n</enquiry>`;

  return {
    json: {
      ...item.json,
      business: { id: e.business_id, ...biz },
      ai_model: MODEL,
      request_body: {
        model: MODEL,
        max_tokens: 8000,
        // Server-side fallback if the model declines on safety grounds (beta header set on the HTTP node).
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      },
    },
  };
});
