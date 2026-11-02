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
const GST_VARIANTS = {
  pending: 'GST: VERLONIQ’s GST registration status is being finalised. Any applicable GST will be shown clearly with these prices and on every written quote.',
  'registered-inclusive': 'All prices include GST.',
  'registered-exclusive': 'Prices exclude GST. GST of 10% is added to the prices shown.',
  'not-registered': 'VERLONIQ is not registered for GST, so no GST is charged.',
};
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

test('disclosures: AUD, confirmed after scoping, third-party costs, ownership, larger work costs more, support optional', () => {
  const h = text(home.slice(home.indexOf('<p class="pricing-note">'), home.indexOf('</p>', home.indexOf('<p class="pricing-note">'))));
  for (const re of [/All prices are in AUD/, /starting prices for clearly defined entry-level scopes/, /larger or more complex projects cost more/, /fixed project price is confirmed in writing after scoping/, /Third-party software subscriptions, AI API usage and platform licences are charged separately/, /you generally own your connected software accounts/, /Ongoing support is optional/, /don’t need an assessment before an implementation/]) assert.match(h, re);
  const a = text(auto.slice(auto.indexOf('<div class="ownership'), auto.indexOf('</section>', auto.indexOf('<div class="ownership'))));
  for (const re of [/All prices are in AUD/, /larger or more complex projects cost more/, /confirmed in writing after scoping/, /Ongoing support is optional/, /own your connected software accounts/, /Third-party software, API usage and AI processing costs may be billed separately/]) assert.match(a, re);
});

test('GST approval gate: one approved GST sentence, identical on both pages', () => {
  const notes = [home, auto].map((html) => [...html.matchAll(/<span class="gst-note" data-gst="([a-z-]+)">([^<]+)<\/span>/g)]);
  for (const n of notes) assert.equal(n.length, 1, 'exactly one GST note per page');
  const [[, variant, sentence], [, variant2, sentence2]] = notes.map((n) => n[0]);
  assert.equal(variant, variant2, 'same GST variant on both pages');
  assert.equal(sentence, sentence2);
  assert.ok(variant in GST_VARIANTS, `unknown GST variant "${variant}"`);
  assert.equal(sentence, GST_VARIANTS[variant], 'use the exact approved wording from docs/pricing-gst-wording.md');
  if (variant === 'registered-exclusive') {
    for (const html of [home, auto]) for (const m of text(html).matchAll(/\$[\d,]+(?! \+ GST)/g)) assert.fail(`${m[0]} needs "+ GST" when prices exclude GST`);
  }
});

test('/automation FAQ quotes the same prices and scope as the pricing section', () => {
  const faq = text(auto.slice(auto.indexOf('<summary>How much does it cost?</summary>'), auto.indexOf('</details>', auto.indexOf('<summary>How much does it cost?</summary>'))));
  assert.match(faq, /from \$2,500 for a straightforward, clearly scoped workflow using up to two supported systems/);
  assert.match(faq, /Custom AI agents, multiple integrations and more complex work are quoted separately/);
  assert.match(faq, /from \$299 a month/);
});
