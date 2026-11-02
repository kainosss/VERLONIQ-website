// Checks the agreed brand positioning on the public pages:
// automation-led business improvement; consulting is a genuine, independent, optional service.
//   node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const home = read('index.html');
const auto = read('automation.html');
const text = (html) => html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('homepage keeps its headline and uses the agreed supporting paragraph', () => {
  assert.match(home, /<h1>Smarter business<br>decisions\.<br>Better systems\.<br><span>Less busywork\.<\/span><\/h1>/);
  assert.match(home, /<p>We help growing businesses reduce repetitive admin, improve everyday workflows and make better use of their existing systems through practical automation, AI and business improvement\.<\/p>/);
});

test('services: AI Automation is card 01, Business Consulting card 02, both with full content', () => {
  const grid = home.slice(home.indexOf('<div class="areas-grid"'), home.indexOf('</section>', home.indexOf('<div class="areas-grid"')));
  const cards = grid.split('<article class="service area-card">').slice(1);
  assert.equal(cards.length, 2);
  assert.match(cards[0], /01 \/ AI AUTOMATION[\s\S]*<h3>AI Automation &amp; Business Systems<\/h3>/);
  assert.match(cards[1], /02 \/ BUSINESS CONSULTING[\s\S]*<h3>Business Consulting &amp; Improvement<\/h3>/);
  for (const c of cards) assert.equal((c.match(/<li>/g) || []).length, 5, 'equal depth: five service points each');
  assert.match(cards[0], /Request an automation proposal/);
  assert.match(cards[0], /href="\/automation"/);
  assert.match(cards[1], /Ask about an assessment/);
});

test('customer journey: free call first; a paid assessment is never required before automation', () => {
  const t = text(home);
  assert.match(t, /free 20-minute/i);
  assert.match(t, /choose a direct automation proposal, an optional Business Improvement Assessment, or neither/);
  assert.match(t, /automation doesn’t require a paid assessment first/);
  assert.match(t, /You don’t need a paid assessment first/);
  assert.doesNotMatch(t, /(must|required to|need to) (buy|purchase|complete) (a|an|the) (paid )?(Business Improvement )?assessment/i);
  assert.match(text(auto), /No paid assessment required/);
});

test('no internal strategy figures or unsupported claims on public pages', () => {
  for (const html of [home, auto]) {
    const t = text(html);
    assert.doesNotMatch(t, /70\s?%|30\s?%|70\/30/, 'the 70/30 marketing split is internal');
    assert.doesNotMatch(t, /testimonial|case stud(y|ies)|clients include|trusted by|guarantee[ds]? (savings|results|outcomes)/i);
  }
});

test('SEO metadata uses business systems, automation and business-improvement language', () => {
  assert.match(home, /<title>VERLONIQ — Business systems, automation &amp; business improvement, Brisbane<\/title>/);
  assert.match(home, /<meta name="description" content="VERLONIQ helps growing businesses work more efficiently through better business systems, practical workflow automation and targeted business improvement\./);
  assert.match(auto, /<title>Workflow Automation &amp; Business Systems for Small Businesses \| VERLONIQ, Brisbane<\/title>/);
  for (const html of [home, auto]) {
    const d = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(d.length >= 120 && d.length <= 300, `description length ${d.length}`);
  }
});
