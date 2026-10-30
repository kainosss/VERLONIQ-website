// Browser tests for the AI Lead Assistant demo (Playwright).
// Requires Playwright (not a site dependency) and the site served locally:
//   npx wrangler dev                      # from the repository root (serves public/ on :8787)
//   node tests/browser/lead-assistant.browser.mjs http://127.0.0.1:8787
// Optional: set AXE_PATH to axe-core's axe.min.js to include an accessibility audit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // resolved from local or global (NODE_PATH) installs
const LA = require('../../public/lead-assistant.js');
let n = 0;
const ok = (m) => console.log(` ✓ ${m}`, ++n);

const browser = await chromium.launch();
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const p = await ctx.newPage();
  p.errs = []; p.requests = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  await p.route('https://formspree.io/**', (r) => r.abort()); // never reach the real enquiry form provider
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); });
  p.on('request', (r) => p.requests.push(r.url()));
  return p;
};
const run = async (p) => { await p.click('#runDemo'); await p.waitForSelector('#demoResult.show'); await p.waitForFunction(() => !document.getElementById('runDemo').disabled); };
const text = (p, sel) => p.textContent(sel);

try {
  let p = await open();
  // Clear labelling
  for (const s of ['.demo-card-head .sim-badge', '.sim-note', '.demo-disclaimer']) assert.match(await text(p, s), /simulat/i, s);
  assert.match(await text(p, '#runDemo'), /simulated/i);
  ok('demo is clearly labelled as simulated (badge, intro note, button, disclaimer)');

  // Every business × sample renders the expected classification
  for (const [bid, biz] of Object.entries(LA.BUSINESSES)) {
    for (const key of ['urgent', 'maintenance', 'quote']) {
      await p.click(`[data-business=${bid}]`); await p.click(`[data-sample=${key}]`);
      assert.equal(await p.inputValue('#enquiryText'), biz.samples[key].text);
      await run(p);
      const expected = LA.simulate(biz.samples[key].text, bid);
      assert.equal(await text(p, '#fieldCategory'), expected.job.category, `${bid}/${key}`);
      assert.equal(await text(p, '#fieldUrgency'), expected.urgency.label, `${bid}/${key}`);
      assert.equal(await p.$eval('#safetyAlert', (e) => e.hidden), !expected.safety.flagged, `${bid}/${key}`);
      assert.equal(await p.inputValue('#draftBody'), expected.draft_reply.body);
      assert.match(await text(p, '#resultTitle'), expected.safety.flagged ? /flagged/ : /ready for your review/);
    }
  }
  ok('all 12 sample enquiries (4 trades × urgent / maintenance / quote) show the expected results');
  assert.equal(await p.$$eval('#registerBody tr', (r) => r.length), 12);
  assert.match(await p.textContent('#registerBody tr:first-child'), /VQ-DEMO-012/);
  ok('each processed enquiry is added to the top of the demo lead register');

  // Approval: edits are kept, nothing sent
  await p.fill('#draftBody', 'Edited reply');
  await p.click('#approveDraft');
  assert.match(await text(p, '#approveStatus'), /Nothing was sent/);
  assert.match(await text(p, '#registerBody tr:first-child .status-pill'), /Approved · not sent \(demo\)/);
  assert.equal(await p.inputValue('#draftBody'), 'Edited reply');
  assert.equal(await p.$eval('#approveDraft', (b) => b.disabled), true);
  ok('approving a draft updates the register status and states that nothing was sent');

  assert.deepEqual(p.requests.filter((u) => !u.startsWith(BASE)), []);
  ok('processing 12 enquiries made no network requests at all (runs entirely in the browser)');

  await p.click('#clearRegister');
  assert.equal(await p.$$eval('#registerBody tr', (r) => r.length), 0);
  assert.equal(await p.$eval('#registerEmpty', (e) => e.hidden), false);
  ok('register can be cleared');

  // Validation and error handling
  await p.fill('#enquiryText', 'help');
  await p.click('#runDemo');
  assert.match(await text(p, '#enquiryError'), /at least 15 characters/);
  assert.equal(await p.getAttribute('#enquiryText', 'aria-invalid'), 'true');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'enquiryText');
  await p.type('#enquiryText', ' with the switchboard please');
  assert.equal(await text(p, '#enquiryError'), '');
  ok('too-short enquiry shows an accessible error, focuses the field, and clears when fixed');

  // Untrusted input is rendered as text, never executed
  await p.fill('#enquiryText', '<img src=x onerror="window.__xss=1"> Hi, I\'m <b>Zoe</b>. Please quote 2 split systems for my house in Toowong.');
  await p.click('[data-business=aircon]');
  await p.fill('#enquiryText', '<img src=x onerror="window.__xss=1"> Hi, I\'m Zoe Park. Please quote 2 split systems for my house in Toowong.');
  await run(p);
  assert.equal(await p.evaluate(() => window.__xss), undefined);
  assert.equal(await p.$$eval('#demoResult img, #leadRegister img', (e) => e.length), 0);
  ok('HTML in an enquiry is treated as text (no injected elements or script execution)');

  // Keyboard-only use
  await p.click('[data-business=electrical]');
  await p.focus('[data-business=plumbing]'); await p.keyboard.press('Enter');
  assert.equal(await p.getAttribute('[data-business=plumbing]', 'aria-pressed'), 'true');
  await p.focus('[data-sample=quote]'); await p.keyboard.press('Space');
  assert.equal(await p.inputValue('#enquiryText'), LA.BUSINESSES.plumbing.samples.quote.text);
  await p.focus('#enquiryText'); await p.keyboard.press('Control+Enter');
  await p.waitForSelector('#demoResult.show');
  assert.equal(await text(p, '#fieldCategory'), 'Hot water system replacement');
  ok('fully operable by keyboard (buttons expose aria-pressed; Ctrl/⌘+Enter runs)');
  assert.deepEqual(p.errs, []);
  ok('no console errors');

  // Mobile + reduced motion
  for (const [w, h] of [[375, 740], [768, 1024]]) {
    const m = await open({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const t0 = Date.now(); await run(m); const took = Date.now() - t0;
    assert.ok(took < 1500, `reduced motion should skip the step animation (${took}ms)`);
    assert.equal(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    for (const sel of ['.demo-card', '#demoResult', '#leadRegister']) {
      const r = await m.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; });
      assert.ok(r, `${sel} fits ${w}px`);
    }
    if (w === 375) assert.equal(await m.$eval('.register-table thead', (e) => getComputedStyle(e).display), 'none');
    if (process.env.AXE_PATH) {
      await m.addScriptTag({ content: readFileSync(process.env.AXE_PATH, 'utf8') });
      const v = await m.evaluate(async () => (await axe.run(document.getElementById('demo'), { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id));
      assert.deepEqual(v, [], `axe at ${w}px`);
    }
    ok(`${w}px: demo, result and register fit the screen; reduced motion respected${process.env.AXE_PATH ? '; no serious accessibility issues' : ''}`);
  }
  console.log(`\nALL ${n} LEAD ASSISTANT BROWSER CHECKS PASSED`);
} catch (e) {
  console.error('FAIL', e.message); process.exitCode = 1;
} finally {
  await browser.close();
}
