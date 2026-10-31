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
const page = async (respond) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.errs = []; p.warns = []; p.posts = [];
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

  console.log(`\nALL ${n} ENQUIRY FORM CHECKS PASSED (Formspree mocked; nothing was sent)`);
} catch (e) {
  console.error('FAIL', e.message); process.exitCode = 1;
} finally {
  await browser.close();
}
