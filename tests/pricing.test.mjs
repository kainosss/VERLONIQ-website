// Starting prices: consistency between the homepage and /automation, scope wording that keeps every
// "from" price honest, required disclosures, and the GST approval gate (docs/pricing-gst-wording.md).
//   node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const home = read('index.html');
const auto = read('automation.html');
const text = (html) => html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const APPROVED = { assessment: '$795', implementation: '$2,500', support: '$299' };
const card = (html, heading) => { const i = html.indexOf(heading); assert.ok(i > 0, heading); return html.slice(html.lastIndexOf('<article', i), html.indexOf('</article>', i)); };

test('only the approved starting prices appear anywhere on the public pages', () => {
  const amounts = [...new Set([...text(home).matchAll(/\$[\d,.]+/g), ...text(auto).matchAll(/\$[\d,.]+/g)].map((m) => m[0]))].sort();
  assert.deepEqual(amounts, Object.values(APPROVED).sort());
  for (const f of ['privacy.html', 'terms.html', '404.html']) assert.doesNotMatch(text(read(f)), /\$\d/, `${f} has no prices`);
});

test('homepage service cards: starting-price element in the right card, order unchanged', () => {
  const grid = home.slice(home.indexOf('<div class="areas-grid"'), home.indexOf('</section>', home.indexOf('<div class="areas-grid"')));
  const [ai, consulting] = grid.split('<article class="service area-card">').slice(1);
  assert.match(ai, /01 \/ AI AUTOMATION/);
  assert.match(ai, /<p class="start-price"><span>Projects from<\/span> <strong>\$2,500<\/strong><\/p>/);
  assert.match(consulting, /02 \/ BUSINESS CONSULTING/);
  assert.match(consulting, /<p class="start-price"><span>Focused assessments from<\/span> <strong>\$795<\/strong><\/p>/);
  for (const c of [ai, consulting]) assert.equal((c.match(/<li>/g) || []).length, 5, 'descriptions kept');
});

test('every "from" price is tied to a defined entry scope, with larger work quoted separately', () => {
  const a = text(card(home, '<h3>Business Improvement Assessment</h3>'));
  assert.match(a, /From \$795/);
  assert.match(a, /one agreed business problem area/);
  assert.match(a, /Broader financial-performance, strategic or operational reviews are quoted separately/);
  for (const html of [home, auto]) {
    const impl = text(card(html, html === home ? '<h3>Automation proposal &amp; implementation</h3>' : '<span class="eyebrow">PROJECT</span><h3>Implementation</h3>'));
    assert.match(impl, /From \$2,500/);
    assert.match(impl, /clearly scoped workflow using up to two supported systems, with testing, documentation and handover/);
    assert.match(impl, /Custom AI agents, multiple integrations, sensitive-data workflows and more complex requirements are quoted separately/, 'the entry price never implies a custom AI agent');
    const sup = text(card(html, html === home ? '<h3>Ongoing support</h3><p>Optional' : '<span class="eyebrow">OPTIONAL</span><h3>Ongoing support</h3>'));
    assert.match(sup, /From \$299 per month/);
    assert.match(sup, /one agreed (automation )?workflow/);
    assert.match(sup, /monthly health check/);
    assert.match(sup, /30 minutes of minor adjustments/);
    assert.match(sup, /business(-support)? hours/);
    assert.match(sup, /Not a 24\/7 service: no guaranteed uptime or immediate incident response/);
    assert.match(sup, /quoted separately/);
  }
  assert.match(text(card(home, '<h3>Business Clarity Call</h3>')), /Free 20 minutes/);
  assert.match(text(card(auto, '<h3>Clarity Call</h3>')), /Free 20 minutes/);
});

test('no unsupported support promises anywhere (24/7, uptime, unlimited, immediate response)', () => {
  for (const html of [home, auto]) {
    const t = text(html).replace(/Not a 24\/7 service: no guaranteed uptime or immediate incident response/g, '');
    assert.doesNotMatch(t, /24\/7|24 hours a day|round-the-clock|guaranteed uptime|uptime guarantee|unlimited|immediate (incident )?response/i);
  }
});

const STATEMENT = 'All prices are in AUD. GST is not charged. Final project pricing is confirmed following scoping. Third-party software and AI usage costs may apply.';

test('the approved pricing statement appears beneath the pricing on both pages, word for word', () => {
  for (const [html, section] of [[home, '<section class="pricing" id="pricing">'], [auto, '<section class="pricing" id="pricing"']]) {
    const sec = html.slice(html.indexOf(section), html.indexOf('</section>', html.indexOf(section)));
    const notes = [...sec.matchAll(/<p class="pricing-note[^"]*">([\s\S]*?)<\/p>/g)].map((m) => text(m[1]).trim());
    assert.deepEqual(notes, [STATEMENT]);
    assert.ok(sec.lastIndexOf('<p class="pricing-note') > sec.lastIndexOf('class="price"'), 'statement sits beneath the prices');
  }
});

test('GST: not registered (founder-confirmed) — no GST added, no "+ GST", no GST-inclusive wording', () => {
  for (const html of [home, auto]) {
    const notes = [...html.matchAll(/<span class="gst-note" data-gst="([a-z-]+)">([^<]+)<\/span>/g)];
    assert.equal(notes.length, 1, 'exactly one GST note per page');
    assert.equal(notes[0][1], 'not-registered');
    assert.equal(notes[0][2], 'GST is not charged.');
    const t = text(html);
    assert.doesNotMatch(t, /\+\s?GST|inc(l\.?|luding|lusive of)? GST|GST[- ]inclusive|ex(cl\.?|cluding)? GST|GST[- ]exclusive|10\s?%/i);
    assert.deepEqual([...t.matchAll(/GST[^.]*\./g)].map((m) => m[0]).filter((x) => !/^GST is not charged\.$/.test(x) && !/GST is not charged\./.test(x)), [], 'only "GST is not charged" wording');
  }
  assert.match(text(auto), /Prices are in AUD and GST is not charged\./);
});

test('/automation FAQ quotes the same prices and scope as the pricing section', () => {
  const faq = text(auto.slice(auto.indexOf('<summary>How much does it cost?</summary>'), auto.indexOf('</details>', auto.indexOf('<summary>How much does it cost?</summary>'))));
  assert.match(faq, /from \$2,500 for a straightforward, clearly scoped workflow using up to two supported systems/);
  assert.match(faq, /Custom AI agents, multiple integrations and more complex work are quoted separately/);
  assert.match(faq, /from \$299 a month/);
});
