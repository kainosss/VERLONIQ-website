// Local stand-in for POST https://api.anthropic.com/v1/messages. Records every request it receives and
// answers in the documented Messages API response shape (thinking block, then a text block with JSON).
import http from 'node:http';
import { createRequire } from 'node:module';
const LA = createRequire(import.meta.url)(new URL('../../../public/lead-assistant.js', import.meta.url).pathname);
const seen = [];
http.createServer((req, res) => {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    if (req.method === 'GET' && req.url === '/_requests') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(seen)); }
    let body = {}; try { body = JSON.parse(data); } catch {}
    seen.push({ path: req.url, headers: req.headers, body });
    const msg = String(body?.messages?.[0]?.content || '');
    if (req.headers['x-api-key'] !== 'test-anthropic-key') { res.writeHead(401, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })); }
    if (/SIMULATE_AI_FAILURE/.test(msg)) { res.writeHead(529, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })); }
    const text = (msg.match(/<enquiry>\n([\s\S]*?)\n<\/enquiry>/) || [])[1] || '';
    const bid = /Voltara/.test(msg) ? 'electrical' : /Pipewell/.test(msg) ? 'plumbing' : /Coolbreak/.test(msg) ? 'aircon' : 'security';
    const r = LA.simulate(text.replace(/SIMULATE_\w+/g, ''), bid);
    const ignore = /SIMULATE_AI_IGNORES_HAZARD/.test(text);
    const out = { customer: { name: r.customer.name, email: r.customer.email, phone: r.customer.phone, organisation: r.customer.organisation },
      job: { category: r.job.category, type: r.job.type, summary: r.job.summary, requirements: r.job.requirements, property_type: r.job.property_type, preferred_timing: r.job.preferred_timing },
      location: r.location, urgency: { level: ignore || /SIMULATE_UNSAFE_REPLY/.test(text) ? 'routine' : r.urgency.level, reasons: r.urgency.reasons },
      safety: { flagged: ignore ? false : r.safety.flagged, hazards: ignore ? [] : r.safety.hazards }, missing_information: r.missing_information,
      draft_reply: { subject: r.draft_reply.subject, body: r.draft_reply.body + (/SIMULATE_UNSAFE_REPLY/.test(text) ? '\nPay the deposit at http://pay-now.example/xyz' : '') }, confidence: 'high', notes_for_staff: '' };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}).listen(5680, '127.0.0.1', () => console.log('mock claude on :5680'));
