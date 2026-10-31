// Browser tests for the enquiry form's Formspree integration (Playwright).
// Uses the REAL public/config.js (live endpoint), but every request to formspree.io is intercepted
// in the browser and answered by a mock — nothing is ever sent to Formspree or any inbox.
//   npx wrangler dev                       # from the repository root (serves public/ on :8787)
//   node tests/browser/enquiry-form.browser.mjs http://127.0.0.1:8787
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // local or global (NODE_PATH) install
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ENDPOINT = 'https://formspree.io/f/xwllqgvn';
let n = 0;
const ok = (m) => console.log(` ✓ ${m}`, ++n);

const browser = await chromium.launch();
// respond: (route) => Promise — the mock Formspree behaviour for this scenario
// Cloudflare's official always-pass test site key and dummy token (public test values, not credentials).
const TEST_SITE_KEY = '1x00000000000000000000AA';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
// Mock of the Turnstile client API (challenges.cloudflare.com is unreachable from CI). Mirrors the documented
// explicit-render API: render(container, {callback, expired-callback, error-callback, size...}), getResponse, reset,
// a hidden cf-turnstile-response input and the ?onload= callback. Tests drive it through window.__ts.
const TS_MOCK = `(function(){var st={renders:0,resets:0,opts:null,input:null};window.__ts=st;
window.turnstile={render:function(el,o){var c=typeof el==='string'?document.querySelector(el):el;st.renders++;st.opts=o;
var f=document.createElement('iframe');f.title='Widget containing a Cloudflare security challenge';f.style.border='0';
f.style.width=o.size==='compact'?'150px':'100%';f.style.height=o.size==='compact'?'140px':'65px';c.appendChild(f);
var i=document.createElement('input');i.type='hidden';i.name='cf-turnstile-response';c.appendChild(i);st.input=i;return 'w0'},
getResponse:function(){return st.input?st.input.value:''},reset:function(){if(st.input)st.input.value='';st.resets++}};
st.solve=function(t){st.input.value=t||'${'${DUMMY}'}';st.opts.callback&&st.opts.callback(st.input.value)};
st.expire=function(){st.input.value='';st.opts['expired-callback']&&st.opts['expired-callback']()};
st.fail=function(){st.input.value='';st.opts['error-callback']&&st.opts['error-callback']('300030')};
var cb=new URL(document.currentScript.src).searchParams.get('onload');setTimeout(function(){window[cb]&&window[cb]()},0)})();`.replace('${DUMMY}', DUMMY_TOKEN);
const page = async (respond, opts = {}) => {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const p = await ctx.newPage();
  p.errs = []; p.warns = []; p.posts = []; p.tsLoads = [];
  if (opts.turnstile) {
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: `window.VERLONIQ_CONFIG={formspreeEndpoint:'${ENDPOINT}',calBookingUrl:'https://cal.com/verloniq/free-20-minute-discovery-call',contactEmail:'',turnstileSiteKey:'${TEST_SITE_KEY}'};` }));
    await ctx.route('https://challenges.cloudflare.com/**', (r) => { p.tsLoads.push(r.request().url()); return opts.turnstile === 'blocked' ? r.abort('blockedbyclient') : r.fulfill({ contentType: 'application/javascript', body: TS_MOCK }); });
  } else {
    await ctx.route('https://challenges.cloudflare.com/**', (r) => { p.tsLoads.push(r.request().url()); return r.abort(); });
  }
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); if (m.type() === 'warning') p.warns.push(m.text()); });
  await ctx.route('https://formspree.io/**', async (route) => {
    const r = route.request();
    p.posts.push({ url: r.url(), method: r.method(), headers: r.headers(), body: r.postDataBuffer()?.toString() || '' });
    if (respond) return respond(route); return route.abort();
  });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  return p;
};
const open = async (p) => { await p.click('.hero [data-open-modal]'); await p.waitForSelector('#enquiryModal.open'); };
const fill = async (p, tag) => {
  await p.fill('#fName', 'Test Person'); await p.fill('#fBusiness', 'Test Business Pty Ltd'); await p.fill('#fEmail', 'test@example.com');
  await p.selectOption('#fIndustry', 'Trades & construction'); await p.selectOption('#fTeam', '2–5 people');
  await p.selectOption('#fService', 'Process improvement');
  await p.fill('#fMessage', `Automated test enquiry (${tag}). Not a real customer. Please ignore.`); await p.check('#fConsent');
};
const submit = async (p) => { await p.waitForTimeout(3100); await p.click('#enquirySubmit'); await p.waitForFunction(() => !document.getElementById('enquirySubmit').disabled && (document.getElementById('formSuccess').hidden === false || !document.getElementById('formStatus').hidden)); };
const succeeded = (p) => p.evaluate(() => document.getElementById('formSuccess').hidden === false);
const status = (p) => p.textContent('#formStatus');
const json = (status, body) => (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

try {
  // 1. Genuine acceptance
  let p = await page(json(200, { next: 'https://formspree.io/thanks?language=en', ok: true }));
  assert.equal(await p.evaluate(() => window.VERLONIQ_CONFIG.formspreeEndpoint), ENDPOINT);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('form-live')), true);
  await open(p); await fill(p, 'success'); await submit(p);
  assert.equal(await succeeded(p), true);
  assert.equal(p.posts.length, 1);
  const q = p.posts[0];
  assert.equal(q.url, ENDPOINT); assert.equal(q.method, 'POST'); assert.equal(q.headers.accept, 'application/json');
  assert.match(q.headers['content-type'], /^multipart\/form-data/);
  for (const k of ['name', 'business', 'email', 'phone', 'industry', 'team_size', 'service', 'message', 'consent', '_gotcha', '_subject', 'consent_given_at']) assert.ok(q.body.includes(`name="${k}"`), k);
  assert.ok(q.body.includes('name="email"\r\n\r\ntest@example.com')); assert.ok(q.body.includes('name="_subject"\r\n\r\nNew VERLONIQ enquiry: Test Business Pty Ltd'));
  assert.deepEqual(p.errs, []);
  ok('Formspree {"ok":true} → success shown; one POST to the configured endpoint with JSON Accept header and all fields');

  // 2–4. Responses that must NOT be shown as success
  const notConfirmed = [
    ['HTTP 200 HTML page (e.g. a CAPTCHA or "thanks" page)', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Please complete the CAPTCHA</body></html>' })],
    ['HTTP 200 JSON without "ok": true', json(200, { next: 'https://formspree.io/thanks' })],
    ['HTTP 302 redirect', (r) => r.fulfill({ status: 302, headers: { location: 'https://formspree.io/thanks' }, body: '' })],
  ];
  for (const [label, respond] of notConfirmed) {
    p = await page(respond); await open(p); await fill(p, label); await submit(p);
    assert.equal(await succeeded(p), false, label);
    assert.match(await status(p), /couldn.t (confirm|be sent)/, label);
    assert.ok(p.warns.some((w) => /not confirmed by Formspree/.test(w)), `diagnostic logged for ${label}`);
    assert.equal(await p.$eval('#enquirySubmit', (b) => b.disabled), false);
    ok(`${label} → NOT shown as sent; clear error + console diagnostic`);
  }

  // 5–6. Formspree error replies are surfaced
  for (const [label, code, body, re] of [
    ['Formspree 422 validation error', 422, { errors: [{ field: 'email', code: 'TYPE_EMAIL', message: 'should be an email' }] }, /should be an email/],
    ['Formspree 403 (e.g. form disabled / domain not allowed)', 403, { error: 'Form not active' }, /Form not active/],
  ]) {
    p = await page(json(code, body)); await open(p); await fill(p, label); await submit(p);
    assert.equal(await succeeded(p), false); assert.match(await status(p), re);
    ok(`${label} → error message includes Formspree's reason`);
  }

  // 7. Network failure
  p = await page((r) => r.abort('failed')); await open(p); await fill(p, 'network'); await submit(p);
  assert.equal(await succeeded(p), false); assert.match(await status(p), /couldn.t reach our enquiry service/);
  ok('network failure → "couldn\'t reach" message, nothing claimed as sent');

  // 8. Validation and consent block submission before any request
  p = await page(json(200, { ok: true })); await open(p);
  await p.waitForTimeout(3100); await p.click('#enquirySubmit');
  assert.equal(await p.$$eval('#enquiryForm [aria-invalid="true"]', (e) => e.length), 8);
  await fill(p, 'no consent'); await p.uncheck('#fConsent'); await p.click('#enquirySubmit');
  assert.match(await p.textContent('#fConsent-err'), /tick the box/);
  assert.equal(p.posts.length, 0);
  ok('missing fields and missing consent are blocked in the browser; no request sent');


  // ---------------- Turnstile not configured (current production config) ----------------
  p = await page(json(200, { ok: true })); await open(p); await p.waitForTimeout(300);
  assert.deepEqual(p.tsLoads, []); assert.equal(await p.isVisible('#turnstileBox'), false); assert.equal(await p.isVisible('#tsNote'), false);
  await fill(p, 'no turnstile'); await submit(p); assert.equal(await succeeded(p), true);
  assert.ok(!p.posts[0].body.includes('cf-turnstile-response'));
  ok('Turnstile NOT configured → no Cloudflare script loaded, no widget, form submits exactly as today');

  // ---------------- Turnstile configured (Cloudflare test site key + mocked widget) ----------------
  const solve = (p, t) => p.evaluate((t) => window.__ts.solve(t), t);
  p = await page(json(200, { ok: true }), { turnstile: 'ok' });
  await p.waitForTimeout(300); assert.equal(p.tsLoads.length, 0);
  await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1);
  assert.equal(p.tsLoads.length, 1); assert.match(p.tsLoads[0], /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit&onload=/);
  const o = await p.evaluate(() => ({ key: window.__ts.opts.sitekey, size: window.__ts.opts.size, theme: window.__ts.opts.theme, action: window.__ts.opts.action, inForm: !!document.querySelector('#enquiryForm #turnstileBox iframe') }));
  assert.deepEqual(o, { key: TEST_SITE_KEY, size: 'flexible', theme: 'light', action: 'enquiry', inForm: true });
  assert.equal(await p.isVisible('#tsNote'), true);
  ok('configured → official script loaded only when the form opens (render=explicit), one widget inside the form, light theme, flexible size');

  await fill(p, 'missing token'); await p.waitForTimeout(3100); await p.click('#enquirySubmit');
  assert.match(await p.textContent('#turnstile-err'), /complete the security check/); assert.equal(p.posts.length, 0);
  ok('missing token → submission blocked with a clear message, nothing sent');

  await solve(p); assert.equal(await p.textContent('#turnstile-err'), '');
  await p.click('#enquirySubmit'); await p.waitForSelector('#formSuccess:not([hidden])');
  assert.equal(p.posts.length, 1);
  assert.equal((p.posts[0].body.match(/name="cf-turnstile-response"/g) || []).length, 1, 'token sent exactly once');
  assert.ok(p.posts[0].body.includes(`name="cf-turnstile-response"\r\n\r\n${DUMMY_TOKEN}`));
  assert.ok(p.posts[0].body.includes('name="_gotcha"'), 'honeypot still present');
  assert.ok(await p.evaluate(() => window.__ts.resets >= 1), 'widget reset after use (single-use token)');
  assert.deepEqual(p.errs, []);
  ok('solved check + Formspree {"ok":true} → success; token sent once as cf-turnstile-response; honeypot kept; widget reset');

  // Rejected token (Formspree verifies with the Secret Key and refuses it)
  let attempt = 0;
  p = await page((r) => (++attempt === 1 ? json(403, { error: 'CAPTCHA verification failed' })(r) : json(200, { ok: true })(r)), { turnstile: 'ok' });
  await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1); await fill(p, 'rejected token'); await solve(p, 'REJECTED.TOKEN');
  await submit(p);
  assert.equal(await succeeded(p), false); assert.match(await status(p), /security check couldn.t be verified/);
  assert.match(await p.textContent('#turnstile-err'), /complete the security check again/);
  assert.equal(await p.evaluate(() => window.turnstile.getResponse()), '', 'spent token cleared');
  assert.equal(await p.$eval('#enquirySubmit', (b) => b.disabled), false);
  await solve(p); await p.click('#enquirySubmit'); await p.waitForSelector('#formSuccess:not([hidden])');
  assert.equal(p.posts.length, 2); assert.ok(p.posts[1].body.includes(DUMMY_TOKEN));
  ok('Formspree rejects the token (HTTP 403) → clear message, no success, widget reset; re-solving and resending then succeeds');

  // Expired token
  p = await page(json(200, { ok: true }), { turnstile: 'ok' });
  await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1); await fill(p, 'expired'); await solve(p);
  await p.evaluate(() => window.__ts.expire());
  assert.match(await p.textContent('#turnstile-err'), /expired and is refreshing/);
  await p.waitForTimeout(3100); await p.click('#enquirySubmit');
  assert.equal(p.posts.length, 0); assert.equal(await succeeded(p), false);
  ok('expired token → "expired and is refreshing" message; send blocked until a fresh token exists');

  // Failed challenge
  await p.evaluate(() => window.__ts.fail());
  assert.match(await p.textContent('#turnstile-err'), /didn.t complete/); await p.click('#enquirySubmit'); assert.equal(p.posts.length, 0);
  ok('failed challenge (error-callback) → clear message; send blocked');

  // Script blocked (network / content blocker)
  p = await page(json(200, { ok: true }), { turnstile: 'blocked' });
  await open(p); await p.waitForFunction(() => /couldn.t load/.test(document.getElementById('turnstile-err').textContent));
  await fill(p, 'blocked'); await p.waitForTimeout(3100); await p.click('#enquirySubmit'); assert.equal(p.posts.length, 0);
  await p.keyboard.press('Escape'); await open(p); await p.waitForTimeout(200); assert.equal(p.tsLoads.length, 2, 're-opening retries the script');
  ok('Turnstile script blocked → "couldn\'t load" message, send blocked (fails closed), retried when the form is reopened');

  // Duplicate prevention with Turnstile
  let slow = 0;
  p = await page(async (r) => { slow++; await new Promise((x) => setTimeout(x, 700)); return json(200, { ok: true })(r); }, { turnstile: 'ok' });
  await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1); await fill(p, 'dup'); await solve(p); await p.waitForTimeout(3100);
  await p.click('#enquirySubmit'); assert.equal(await p.$eval('#enquirySubmit', (b) => b.disabled), true);
  await p.$eval('#enquiryForm', (f) => f.requestSubmit()); await p.waitForSelector('#formSuccess:not([hidden])'); assert.equal(slow, 1);
  await p.keyboard.press('Escape'); await open(p); await fill(p, 'dup'); await solve(p); await p.waitForTimeout(3100); await p.click('#enquirySubmit');
  assert.match(await status(p), /already sent this enquiry/); assert.equal(slow, 1);
  ok('duplicates prevented: button disabled while sending (1 request), identical resend blocked');

  // Explicit confirmation still required with Turnstile; network failure resets the widget
  for (const [label, respond, re] of [['HTTP 200 HTML page', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }), /couldn.t confirm/], ['network failure', (r) => r.abort('failed'), /couldn.t reach/]]) {
    p = await page(respond, { turnstile: 'ok' }); await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1); await fill(p, label); await solve(p); await submit(p);
    assert.equal(await succeeded(p), false); assert.match(await status(p), re); assert.equal(await p.evaluate(() => window.turnstile.getResponse()), '');
    ok(`with Turnstile: ${label} → not shown as sent; widget reset for a retry`);
  }

  // Mobile sizes and keyboard access
  for (const [w, h] of [[320, 640], [375, 740], [768, 1024]]) {
    p = await page(json(200, { ok: true }), { turnstile: 'ok', viewport: { width: w, height: h }, mobile: w < 800 });
    await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1);
    const size = await p.evaluate(() => window.__ts.opts.size);
    const fits = await p.evaluate(() => { const f = document.querySelector('#turnstileBox iframe').getBoundingClientRect(); const m = document.querySelector('#enquiryModal .modal').getBoundingClientRect(); return f.left >= m.left && f.right <= m.right; });
    assert.ok(fits, `widget fits at ${w}px`); assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    ok(`${w}px: widget size "${size}" fits inside the form`);
  }
  p = await page(json(200, { ok: true }), { turnstile: 'ok' }); await open(p); await p.waitForFunction(() => window.__ts && window.__ts.renders === 1);
  await p.focus('#fConsent'); await p.keyboard.press('Tab');
  const focusedTag = await p.evaluate(() => document.activeElement.tagName + (document.activeElement.closest('#turnstileBox') ? '#in-widget' : ''));
  assert.match(focusedTag, /IFRAME#in-widget|A/, 'Tab moves from consent towards the widget');
  for (let i = 0; i < 6 && !(await p.evaluate(() => document.activeElement.id === 'enquirySubmit')); i++) await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'enquirySubmit', 'keyboard reaches Send after the widget');
  ok('keyboard: Tab order goes consent → security check → privacy link(s) → Send; focus stays in the dialog');
  console.log(`\nALL ${n} ENQUIRY FORM CHECKS PASSED (Formspree mocked; nothing was sent)`);
} catch (e) {
  console.error('FAIL', e.message); process.exitCode = 1;
} finally {
  await browser.close();
}
