// Local stand-in for the AI APIs used by the workflow's REAL HTTP Request node:
//   POST /v1/messages          (Anthropic Messages API: x-api-key auth, structured output in a text block)
//   POST /v1/chat/completions  (OpenAI Chat Completions: Bearer auth, JSON in message.content)
// Answers are built from the website demo's rules (public/lead-assistant.js). Every request is recorded (GET /_requests).
// Markers in the enquiry text: SIMULATE_AI_FAILURE (overloaded, retried), SIMULATE_REFUSAL, SIMULATE_BAD_SCHEMA,
// SIMULATE_AI_IGNORES_HAZARD, SIMULATE_UNSAFE_REPLY, SIMULATE_INVENTED_CONTACT.
import http from 'node:http';
import { createRequire } from 'node:module';
const LA = createRequire(import.meta.url)(new URL('../../../public/lead-assistant.js', import.meta.url).pathname);
const seen = [];
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

const answer = (prompt) => {
  const text = (prompt.match(/<enquiry>\n([\s\S]*?)\n<\/enquiry>/) || [])[1] || '';
  const bid = /Voltara/.test(prompt) ? 'electrical' : /Pipewell/.test(prompt) ? 'plumbing' : /Coolbreak/.test(prompt) ? 'aircon' : /Guardline/.test(prompt) ? 'security' : null;
  const has = (m) => text.includes(m);
  let out;
  if (bid) {
    const r = LA.simulate(text.replace(/SIMULATE_\w+/g, ''), bid);
    out = { customer: { name: r.customer.name, email: r.customer.email, phone: r.customer.phone, organisation: r.customer.organisation || '' },
      job: { category: r.job.category, type: r.job.type, summary: r.job.summary || r.job.category, requirements: r.job.requirements, property_type: r.job.property_type, preferred_timing: r.job.preferred_timing || '' },
      location: { suburb: r.location.suburb || '', address: r.location.address || '', postcode: '', state: '' },
      urgency: { level: r.urgency.level, reasons: r.urgency.reasons || [] },
      safety: { flagged: r.safety.flagged, hazards: r.safety.hazards.map((h) => ({ code: h.code, label: h.label, action: h.action })) },
      missing_information: r.missing_information, draft_reply: { subject: r.draft_reply.subject, body: r.draft_reply.body }, confidence: 'high', notes_for_staff: '' };
  } else {
    out = { customer: { name: '', email: '', phone: '', organisation: '' }, job: { category: 'Service enquiry', type: 'general', summary: 'Service enquiry', requirements: [], property_type: 'Unknown', preferred_timing: '' },
      location: { suburb: '', address: '', postcode: '', state: '' }, urgency: { level: 'soon', reasons: [] }, safety: { flagged: false, hazards: [] },
      missing_information: ['Site address'], draft_reply: { subject: 'Your enquiry', body: 'Hi,\n\nThanks for your enquiry.\n\nKind regards' }, confidence: 'medium', notes_for_staff: '' };
  }
  if (has('SIMULATE_AI_IGNORES_HAZARD') || has('SIMULATE_UNSAFE_REPLY')) { out.urgency.level = 'routine'; out.safety = { flagged: false, hazards: [] }; }
  if (has('SIMULATE_UNSAFE_REPLY')) out.draft_reply.body += '\nPay the deposit at http://pay-now.example/xyz';
  if (has('SIMULATE_INVENTED_CONTACT')) { out.customer.email = 'invented.person@invented.example'; out.customer.phone = '0499 999 999'; out.location.address = '99 Invented Street'; }
  if (has('SIMULATE_BAD_SCHEMA')) out.urgency.level = 'super-urgent';
  return { text, out };
};

http.createServer((req, res) => {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    if (req.method === 'GET' && req.url === '/_requests') return json(res, 200, seen);
    let body = {}; try { body = JSON.parse(data); } catch {}
    seen.push({ path: req.url, headers: req.headers, body });
    if (req.url === '/v1/messages') {
      if (req.headers['x-api-key'] !== 'test-anthropic-key') return json(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      const { text, out } = answer(String(body?.messages?.[0]?.content || ''));
      if (/SIMULATE_AI_FAILURE/.test(text)) return json(res, 529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } });
      if (/SIMULATE_REFUSAL/.test(text)) return json(res, 200, { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: 'declined' }, content: [], usage: { input_tokens: 10, output_tokens: 0 } });
      return json(res, 200, { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
        content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 2100, output_tokens: 900 } });
    }
    if (req.url === '/v1/chat/completions') {
      if (req.headers.authorization !== 'Bearer test-openai-key') return json(res, 401, { error: { message: 'Incorrect API key provided', type: 'invalid_request_error' } });
      const { text, out } = answer(String(body?.messages?.[1]?.content || ''));
      if (/SIMULATE_AI_FAILURE/.test(text)) return json(res, 503, { error: { message: 'The server is overloaded', type: 'server_error' } });
      return json(res, 200, { id: 'chatcmpl_mock', object: 'chat.completion', model: body.model, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(out), refusal: null } }], usage: { prompt_tokens: 1700, completion_tokens: 650 } });
    }
    return json(res, 404, { error: 'not found' });
  });
}).listen(5680, '127.0.0.1', () => console.log('mock AI APIs on :5680'));
