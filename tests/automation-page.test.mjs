// Static checks for the AI Automation landing page (/automation) and its isolation from the homepage.
//   node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const page = read('automation.html');
const js = read('automation.js');
const css = read('automation.css');
const home = read('index.html');

test('homepage does not load or link the automation page assets (strict isolation)', () => {
  assert.doesNotMatch(home, /automation\.(?:js|css|html)|href="\/automation"/);
});

test('automation page uses only its own assets plus the shared public config', () => {
  const scripts = [...page.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['/config.js', '/automation.js']);
  assert.ok(!scripts.includes('/lead-assistant.js'), 'the demo is linked, not rebuilt');
  assert.match(page, /<link rel="stylesheet" href="\/automation\.css"/);
});

test('primary and secondary CTAs use the agreed wording', () => {
  assert.match(page, />Book a Free Clarity Call </);
  assert.match(page, />Explore Our Automation Demo </);
  assert.match(page, />Send an Enquiry</);
  for (const m of page.matchAll(/href="([^"]*#demo)"/g)) assert.equal(m[1], '/#demo');
});

test('demo is described as simulated, not a live AI service', () => {
  assert.match(page, /SIMULATED DEMO/);
  assert.match(page, /not connected to a live AI model or to any real customer systems/);
});

test('no published prices, statistics, guarantees or regulated-advice claims', () => {
  const text = page.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\$\s?\d|\bAUD\b|\d+\s?%|guarantee|ROI\b/i);
  assert.doesNotMatch(text, /financial advice|tax advice|legal advice|accounting advice/i);
  for (const word of ['Free', 'Quoted', 'Monthly']) assert.match(page, new RegExp(`class="price">${word}<`));
});

test('enquiries are tagged with a non-sensitive source identifier', () => {
  assert.match(page, /<input type="hidden" name="enquiry_source" value="automation-page">/);
  assert.match(js, /New VERLONIQ automation enquiry/);
});

test('analytics: no third-party scripts, no personal data, no "confirmed booking" events', () => {
  assert.doesNotMatch(page + js, /googletagmanager|gtag\(|plausible|cloudflareinsights|facebook\.net|fbq\(/);
  const tracked = [...js.matchAll(/track\('([a-z_]+)'(?:,\s*\{([^}]*)\})?/g)];
  assert.deepEqual(tracked.map((m) => m[1]).sort(), ['automation_booking_calendar_opened', 'automation_booking_cta_click', 'automation_demo_click', 'automation_enquiry_click', 'automation_enquiry_submitted', 'automation_page_view'].sort());
  for (const m of tracked) assert.doesNotMatch(m[2] || '', /fName|fEmail|fPhone|fBusiness|fMessage|email|phone|message/i, m[1]);
});

test('no secrets, webhook URLs or hard-coded booking links in page assets', () => {
  assert.doesNotMatch(page + js + css, /n8n\.cloud|\/webhook\/|api[_-]?key|secret[_-]?key\s*[:=]|cal\.com\//i);
});

test('styles respect reduced motion', () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('sitemap lists the homepage and /automation', () => {
  const sm = read('sitemap.xml');
  assert.match(sm, /<loc>https:\/\/verloniq\.com\/<\/loc>/);
  assert.match(sm, /<loc>https:\/\/verloniq\.com\/automation<\/loc>/);
});
