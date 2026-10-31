// Browser tests for the AI Automation landing page at /automation (Playwright).
// Uses the REAL public/config.js. Every request to Formspree, Cloudflare Turnstile and Cal.com is intercepted
// and answered by a mock, so nothing is ever sent to Formspree, any inbox or any calendar.
//   npx wrangler dev                       # from the repository root (serves public/ on :8787)
//   node tests/browser/automation-page.browser.mjs http://127.0.0.1:8787
// Optional: set AXE_PATH to axe-core's axe.min.js to include an accessibility audit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // local or global (NODE_PATH) install
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ENDPOINT = 'https://formspree.io/f/xwllqgvn';
const CAL = 'https://cal.com/verloniq/free-20-minute-discovery-call';
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
let n = 0;
const ok = (m) => console.log(` ✓ ${m}`, ++n);

// Minimal mock of Cloudflare Turnstile's explicit-render API (challenges.cloudflare.com is unreachable from tests).
const TS_MOCK = `(function(){var st={opts:null,input:null,key:null};window.__ts=st;
window.turnstile={render:function(el,o){var c=document.querySelector(el);st.opts=o;st.key=o.sitekey;var i=document.createElement('input');i.type='hidden';i.name='cf-turnstile-response';c.appendChild(i);st.input=i;return 'w0'},
getResponse:function(){return st.input?st.input.value:''},reset:function(){if(st.input)st.input.value=''}};
st.solve=function(){st.input.value='${DUMMY_TOKEN}';st.opts.callback&&st.opts.callback(st.input.value)};
var cb=new URL(document.currentScript.src).searchParams.get('onload');setTimeout(function(){window[cb]&&window[cb]()},0)})();`;

const browser = await chromium.launch();
const page = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, reducedMotion: opts.reducedMotion || 'no-preference', isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const p = await ctx.newPage();
  p.errs = []; p.posts = []; p.external = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_NAME|net::ERR_FAILED/.test(m.text())) p.errs.push(m.text()); });
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: TS_MOCK }));
  await ctx.route('https://cal.com/**', (r) => { p.external.push(r.request().url()); return r.fulfill({ contentType: 'text/html', body: '<title>Cal.com stub</title>' }); });
  await ctx.route('https://formspree.io/**', async (route) => {
    const r = route.request(); p.posts.push({ url: r.url(), body: r.postDataBuffer()?.toString() || '' });
    return opts.respond ? opts.respond(route) : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const res = await p.goto(BASE + (opts.path || '/automation'), { waitUntil: 'networkidle' });
  p.status = res.status();
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return p;
};
const events = (p) => p.evaluate(() => (window.vqAnalytics || []).map((e) => ({ ...e })));
const fill = async (p) => {
  await p.fill('#fName', 'Test Person'); await p.fill('#fBusiness', 'Test Plumbing Pty Ltd'); await p.fill('#fEmail', 'test@example.com');
  await p.selectOption('#fIndustry', 'Trades & construction'); await p.selectOption('#fTeam', '6–19 people');
  await p.fill('#fMessage', 'Automated test enquiry from the automation page. Not a real customer. Please ignore.'); await p.check('#fConsent');
};
const multipart = (body) => { const out = {}; for (const m of body.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)) out[m[1]] = m[2]; return out; };

try {
  // 1. Direct load, SEO and sharing metadata
  let p = await page();
  assert.equal(p.status, 200, '/automation loads directly');
  assert.match(await p.title(), /AI Automation for Small Businesses in Australia/);
  assert.equal(await p.textContent('h1'), 'Less admin.More time running your business.');
  assert.equal(await p.locator('h1').count(), 1, 'exactly one h1');
  const meta = await p.evaluate(() => ({
    desc: document.querySelector('meta[name=description]').content,
    canonical: document.querySelector('link[rel=canonical]').href,
    ogUrl: document.querySelector('meta[property="og:url"]').content,
    ogImage: document.querySelector('meta[property="og:image"]').content,
    ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
  }));
  assert.equal(meta.canonical, 'https://verloniq.com/automation'); assert.equal(meta.ogUrl, 'https://verloniq.com/automation');
  assert.ok(meta.desc.length >= 120 && meta.desc.length <= 300, 'meta description length');
  assert.equal(meta.ld['@type'], 'Service');
  const og = await p.request.get(BASE + new URL(meta.ogImage).pathname); assert.equal(og.status(), 200); assert.match(og.headers()['content-type'], /image\/png/);
  for (const path of ['/automation/', '/automation.html']) { const r = await p.request.get(BASE + path, { maxRedirects: 0 }); assert.ok([301, 307, 308].includes(r.status()), path); assert.match(r.headers().location, /\/automation$/); }
  const sitemap = await (await p.request.get(BASE + '/sitemap.xml')).text();
  assert.match(sitemap, /<loc>https:\/\/verloniq\.com\/automation<\/loc>/); assert.match(sitemap, /<loc>https:\/\/verloniq\.com\/<\/loc>/);
  const csp = (await p.request.get(BASE + '/automation')).headers()['content-security-policy'] || '';
  assert.match(csp, /connect-src 'self' https:\/\/formspree\.io/, 'site security headers apply to /automation');
  ok('/automation loads directly (200), redirects /automation/ and /automation.html, has title, one h1, description, canonical, OG image, JSON-LD, sitemap entry and the site CSP');

  // 2. Required sections and copy
  const text = await p.evaluate(() => document.body.innerText);
  for (const s of ['Customer enquiries slipping through', 'Manual quote follow-ups', 'Double-handling information', 'Repetitive administration', 'Limited visibility',
    'AI Customer Enquiry Assistant', 'Automated Quote Follow-Ups', 'Business Systems Integration & Reporting',
    'Free discovery call', 'Technical scoping', 'Tailored proposal', 'Implementation', 'Testing & handover', 'Ongoing support', 'No paid assessment required']) assert.ok(text.includes(s), s);
  assert.ok(await p.locator('#solutions .tag-review').count() >= 3, 'staff-review steps are marked');
  assert.doesNotMatch(text, /\$\s?\d|AUD\s?\d|\d+\s?% (?:faster|saving|more)|guarantee/i, 'no prices, statistics or guarantees');
  assert.doesNotMatch(text, /testimonial|case study|clients include|trusted by/i, 'no invented social proof');
  ok('problems, three solutions (with automatic vs staff-review steps), process, pricing basis and ownership are present; no prices, stats, guarantees or testimonials');

  // 3. Booking: every primary CTA opens the booking panel; "Choose a time" opens the same Cal.com event as the homepage
  const bookBtns = p.locator('main [data-open-booking]');
  assert.ok(await bookBtns.count() >= 7, 'Book a Free Clarity Call appears throughout the page');
  for (const t of await bookBtns.allTextContents()) assert.match(t, /^Book a Free Clarity Call/);
  await p.click('.hero [data-open-booking]'); await p.waitForSelector('#bookingModal.open');
  assert.equal(await p.getAttribute('#bookingLink', 'href'), CAL); assert.equal(await p.getAttribute('#bookingLink', 'target'), '_blank'); assert.match(await p.getAttribute('#bookingLink', 'rel'), /noopener/);
  assert.match(await p.textContent('#bookingModal'), /confirmed once Cal\.com shows the confirmation/);
  const popupP = p.context().waitForEvent('page'); await p.click('#bookingLink'); const popup = await popupP; await popup.waitForLoadState(); assert.equal(popup.url(), CAL); await popup.close();
  await p.keyboard.press('Escape'); assert.equal(await p.evaluate(() => document.activeElement.matches('.hero [data-open-booking]')), true, 'focus returns to the CTA');
  let ev = await events(p);
  assert.deepEqual(ev.map((e) => e.event), ['automation_page_view', 'automation_booking_cta_click', 'automation_booking_calendar_opened']);
  assert.equal(ev[1].location, 'hero'); assert.ok(!ev.some((e) => /confirm|booked|appointment/i.test(e.event)), 'no event claims a confirmed booking');
  ok(`"Book a Free Clarity Call" (${await bookBtns.count()} CTAs) opens the booking panel; "Choose a time" opens ${CAL} in a new tab; events: page view, CTA click, calendar opened (never "booked")`);

  // 4. Demo link: goes to the existing homepage demo, which still works
  const demoLinks = p.locator('[data-demo-link]');
  assert.ok(await demoLinks.count() >= 2);
  for (const h of await demoLinks.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) assert.equal(h, '/#demo');
  assert.match(await p.textContent('#see-demo'), /not connected to a live AI model or to any real customer systems/);
  assert.match(await p.textContent('#see-demo .sim-badge'), /SIMULATED/);
  await p.evaluate(() => document.querySelectorAll('[data-demo-link]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true })));
  await p.click('#see-demo [data-demo-link]');
  ev = await events(p); assert.deepEqual(ev.at(-1), { event: 'automation_demo_click', page: 'automation', location: 'demo-section' });
  await p.evaluate(() => document.querySelectorAll('[data-demo-link]').forEach((a) => a.replaceWith(a.cloneNode(true)))); // drop the test's preventDefault
  await Promise.all([p.waitForURL(BASE + '/#demo'), p.click('.hero [data-demo-link]')]);
  await p.waitForFunction(() => { const r = document.getElementById('demo').getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
  await p.click('#runDemo'); await p.waitForSelector('#demoResult.show');
  assert.match(await p.textContent('#demoResult .sim-badge'), /SIMULATED/);
  ok('"Explore Our Automation Demo" links to /#demo; the homepage demo scrolls into view and still runs (simulated); demo is labelled simulated on this page too');
  assert.deepEqual(p.errs, []); await p.context().close();

  // 5. Enquiry: Send an Enquiry → same Formspree endpoint, tagged as an automation enquiry, Turnstile token included
  p = await page();
  await p.click('#solutions #quote-follow-ups [data-open-modal]'); await p.waitForSelector('#enquiryModal.open');
  assert.equal(await p.inputValue('#fService'), 'Automated quote follow-ups', 'solution CTA preselects the service');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'fName');
  await p.waitForFunction(() => window.__ts && window.__ts.opts);
  assert.equal(await p.evaluate(() => window.__ts.key), '0x4AAAAAAFttPcdbmy99PE4C', 'Turnstile uses the production Site Key from config.js');
  await fill(p); await p.evaluate(() => window.__ts.solve()); await p.waitForTimeout(3100);
  await p.click('#enquirySubmit'); await p.waitForSelector('#formSuccess:not([hidden])');
  assert.equal(p.posts.length, 1); assert.equal(p.posts[0].url, ENDPOINT);
  const sent = multipart(p.posts[0].body);
  assert.deepEqual(Object.keys(sent).sort(), ['_gotcha', '_subject', 'business', 'cf-turnstile-response', 'consent', 'consent_given_at', 'email', 'enquiry_source', 'industry', 'message', 'name', 'phone', 'service', 'team_size'].sort());
  assert.equal(sent.enquiry_source, 'automation-page'); assert.equal(sent.service, 'Automated quote follow-ups');
  assert.equal(sent._subject, 'New VERLONIQ automation enquiry: Test Plumbing Pty Ltd'); assert.equal(sent['cf-turnstile-response'], DUMMY_TOKEN);
  ev = await events(p);
  assert.deepEqual(ev.map((e) => e.event), ['automation_page_view', 'automation_enquiry_click', 'automation_enquiry_submitted']);
  assert.equal(ev[1].location, 'solution-quotes');
  assert.doesNotMatch(JSON.stringify(ev), /Test Person|example\.com|Test Plumbing|Automated test enquiry|DUMMY/, 'analytics events contain no form contents');
  ok('"Send an Enquiry" posts once to the same Formspree endpoint with enquiry_source=automation-page, an automation subject and the Turnstile token; analytics carry no personal details');
  await p.context().close();

  // 6. Failure handling mirrors the homepage: non-JSON 200 is never shown as sent; missing fields are blocked
  p = await page({ respond: (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>captcha</html>' }) });
  await p.click('#contact [data-open-modal]'); await p.waitForSelector('#enquiryModal.open');
  await p.click('#enquirySubmit'); assert.equal(p.posts.length, 0); assert.match(await p.textContent('#formStatus'), /highlighted fields/);
  await p.waitForFunction(() => window.__ts && window.__ts.opts); await fill(p); await p.selectOption('#fService', 'Not sure yet'); await p.evaluate(() => window.__ts.solve()); await p.waitForTimeout(3100);
  await p.click('#enquirySubmit'); await p.waitForFunction(() => !document.getElementById('formStatus').hidden && !document.getElementById('enquirySubmit').disabled);
  assert.equal(await p.evaluate(() => document.getElementById('formSuccess').hidden), true); assert.match(await p.textContent('#formStatus'), /couldn't confirm/);
  assert.ok(!(await events(p)).some((e) => e.event === 'automation_enquiry_submitted'));
  ok('invalid form blocked with no request; an unconfirmed (HTML 200) response is not shown as sent and is not counted as a submission');
  await p.context().close();

  // 7. Responsive layout, mobile menu and keyboard
  for (const [w, h] of [[320, 700], [375, 812], [768, 1024], [1280, 900]]) {
    p = await page({ viewport: { width: w, height: h }, mobile: w < 800 });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, `no horizontal scroll at ${w}px`);
    if (w < 1050) {
      await p.click('#menuToggle'); assert.equal(await p.getAttribute('#menuToggle', 'aria-expanded'), 'true');
      await p.click('#navLinks a[href="#process"]'); assert.equal(await p.getAttribute('#menuToggle', 'aria-expanded'), 'false');
      await p.click('#navLinks .nav-mobile-cta', { force: true }).catch(() => {});
    }
    const small = await p.evaluate(() => [...document.querySelectorAll('main .btn')].filter((b) => b.getClientRects().length && b.getBoundingClientRect().height < 44).length);
    assert.equal(small, 0, `touch targets at ${w}px`);
    assert.deepEqual(p.errs, []); await p.context().close();
  }
  ok('no horizontal scroll at 320/375/768/1280px; mobile menu opens and closes; buttons are at least 44px tall');

  p = await page();
  await p.keyboard.press('Tab'); assert.equal(await p.evaluate(() => document.activeElement.className), 'skip-link');
  await p.keyboard.press('Enter'); assert.equal(await p.evaluate(() => document.activeElement.id), 'top');
  await p.focus('#contact [data-open-booking]'); await p.keyboard.press('Enter'); await p.waitForSelector('#bookingModal.open');
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); assert.equal(await p.evaluate(() => !!document.activeElement.closest('#bookingModal')), true, 'focus stays in the dialog'); }
  await p.keyboard.press('Escape'); assert.equal(await p.evaluate(() => document.activeElement.matches('#contact [data-open-booking]')), true);
  ok('keyboard: skip link, booking dialog opens with Enter, focus is trapped, Escape closes and returns focus');
  if (process.env.AXE_PATH) {
    await p.addScriptTag({ content: readFileSync(process.env.AXE_PATH, 'utf8') });
    await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'))); await p.waitForTimeout(900);
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id + ': ' + x.nodes.length));
    assert.deepEqual(v, []);
    await p.click('#contact [data-open-modal]'); await p.waitForSelector('#enquiryModal.open'); await p.waitForTimeout(400);
    const vm = await p.evaluate(async () => (await window.axe.run('#enquiryModal', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id));
    assert.deepEqual(vm, []);
    ok('axe-core: no serious or critical WCAG 2 A/AA violations on the page or the enquiry dialog');
  }
  await p.context().close();

  // 8. Reduced motion: all content visible without animations
  p = await page({ reducedMotion: 'reduce' });
  assert.equal(await p.evaluate(() => [...document.querySelectorAll('.reveal')].every((e) => getComputedStyle(e).opacity === '1')), true);
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.flow-card')).animationName), 'none');
  ok('prefers-reduced-motion: every section visible immediately, no floating animation');
  await p.context().close();

  // 9. Nothing reaches external services on load; no secrets or paid booking links
  p = await page();
  assert.equal(p.posts.length, 0); assert.deepEqual(p.external, []);
  const html = await (await p.request.get(BASE + '/automation')).text(); // as served, before config.js runs
  assert.equal((html.match(/cal\.com\/[^"'\s<]*/g) || []).length, 0, 'no Cal.com link hard-coded in the page (taken from config.js)');
  assert.equal(await p.getAttribute('#bookingLink', 'href'), CAL, 'only the free call link is used');
  assert.doesNotMatch(html, /hooks?\.n8n|webhook|api[_-]?key|sk-[A-Za-z0-9]/i);
  ok('page load sends nothing to Formspree or Cal.com; booking link comes only from config.js; no webhook URLs or keys');
  await p.context().close();

  // 10. Homepage links to this page (nav, AI automation card, footer): visible, keyboard-focusable, one-line nav on desktop
  for (const [w, h] of [[375, 812], [1051, 800], [1280, 900]]) {
    p = await page({ path: '/', viewport: { width: w, height: h }, mobile: w < 800 });
    const links = p.locator('a[href="/automation"]');
    assert.equal(await links.count(), 3);
    await p.keyboard.press('Tab'); // keyboard user: focus rings (:focus-visible) apply
    if (w < 1051) { await p.focus('#menuToggle'); await p.keyboard.press('Enter'); }
    for (const l of await links.all()) {
      await l.scrollIntoViewIfNeeded(); assert.equal(await l.isVisible(), true);
      await l.focus(); assert.equal(await l.evaluate((el) => getComputedStyle(el).outlineStyle !== 'none' && getComputedStyle(el).outlineWidth !== '0px'), true, 'visible focus ring');
    }
    if (w >= 1051) assert.equal(await p.evaluate(() => [...document.querySelectorAll('#navLinks a')].every((a) => a.getBoundingClientRect().height < 24) && document.querySelector('.nav-cta').getBoundingClientRect().height < 56), true, `nav fits on one line at ${w}px`);
    await p.keyboard.press('Enter'); await p.waitForURL(/\/automation$/); assert.match(await p.title(), /AI Automation for Small Businesses/);
    assert.deepEqual(p.errs, []); await p.context().close();
  }
  ok('homepage: nav, AI automation card and footer links to /automation are visible, keyboard-focusable with a focus ring and open the page (375/1051/1280px); nav stays on one line');

  console.log(`\nALL ${n} AUTOMATION PAGE CHECKS PASSED (Formspree, Turnstile and Cal.com mocked; nothing was sent)`);
} catch (e) {
  console.error('FAIL', e.message); process.exitCode = 1;
} finally { await browser.close(); }
