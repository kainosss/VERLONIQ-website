// EXAMPLE ONLY — NOT DEPLOYED. Nothing in wrangler.jsonc references this file.
//
// How the website's AI Lead Assistant demo could later use real AI processing without
// exposing the n8n webhook URL, its secret, or any AI key to browsers:
//
//   Browser ──POST /api/lead-assistant──▶ this Worker (same origin) ──secret header──▶ n8n webhook
//
// The browser only ever talks to the website's own origin. Secrets live in Cloudflare
// Worker secrets (`npx wrangler secret put N8N_WEBHOOK_SECRET`), never in public/ files.
//
// Before using it for real:
//   - decide whether a public demo should write to a real lead register at all (a separate
//     "demo" workflow/sheet is safer), and add Cloudflare Turnstile + a rate-limiting rule;
//   - wire it into wrangler.jsonc ("main" + "assets.run_worker_first": ["/api/*"]) and test
//     on a preview deployment first.

const ALLOWED_BUSINESSES = new Set(['electrical', 'plumbing', 'aircon', 'security']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/lead-assistant') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    // Same-origin only: reject cross-site calls.
    const origin = request.headers.get('Origin');
    if (!origin || new URL(origin).host !== url.host) return json({ error: 'Forbidden' }, 403);

    // Basic size and shape checks before anything leaves the edge.
    if (Number(request.headers.get('Content-Length') || 0) > 8000) return json({ error: 'Request too large' }, 413);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const enquiry = typeof body.enquiry_text === 'string' ? body.enquiry_text.trim() : '';
    if (!ALLOWED_BUSINESSES.has(body.business_id) || enquiry.length < 15 || enquiry.length > 4000) {
      return json({ error: 'Please choose a business and enter 15–4,000 characters.' }, 400);
    }

    // Optional: verify a Cloudflare Turnstile token sent by the page (secret stays server-side).
    if (env.TURNSTILE_SECRET) {
      const form = new FormData();
      form.append('secret', env.TURNSTILE_SECRET);
      form.append('response', String(body.turnstile_token || ''));
      form.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
      const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then((r) => r.json()).catch(() => ({ success: false }));
      if (!check.success) return json({ error: 'Security check failed. Please try again.' }, 403);
    }

    // Forward to n8n with the shared secret. Timeout so a slow workflow can't hang the page.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(env.N8N_WEBHOOK_URL, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'X-VERLONIQ-Secret': env.N8N_WEBHOOK_SECRET },
        body: JSON.stringify({ business_id: body.business_id, enquiry_text: enquiry, source: 'website_demo' }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) return json({ error: 'The Lead Assistant could not process this enquiry right now.' }, 502);
      // n8n returns a summary ({ lead_id, status, urgency, safety_flag, draft_created }).
      // To show the full result in the demo UI, extend the workflow's "Respond: Lead Saved" node
      // to return the fields the page needs, then map them to the shape in
      // automation/n8n/schema/lead-result.schema.json here.
      return json(out, 200);
    } catch {
      return json({ error: 'The Lead Assistant is unavailable right now.' }, 504);
    } finally {
      clearTimeout(timer);
    }
  },
};

const json = (data, status) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
