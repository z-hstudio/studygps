'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/pricing.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'web/pricing.js'), 'utf8');
function boot(t, options = {}) {
  const dom = new JSDOM(html, { url: 'https://studygps.test/pricing.html' + (options.query || ''), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  if (options.current) w.localStorage.setItem('studygps-locale', options.current);
  if (options.legacy) w.localStorage.setItem('studygps.locale', options.legacy);
  if (options.blocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  w.fetch = () => assert.fail('A proposed pricing page must not initiate purchases or API requests.');
  w.eval(script);
  return { w, d: w.document, tier(name) { w.document.querySelector('[data-calculator-tier="' + name + '"]').click(); }, cost(value) { const slider = w.document.getElementById('unit-cost'); slider.value = String(value); slider.dispatchEvent(new w.Event('input')); } };
}
for (const scenario of [
  { name: 'fresh visits default to English', expected: 'en' },
  { name: 'invalid preferences default to English', query: '?lang=de', current: 'invalid', legacy: 'invalid', expected: 'en' },
  { name: 'URL wins over stored Chinese', query: '?lang=en', current: 'zh', expected: 'en' },
  { name: 'explicit Chinese is preserved', query: '?lang=zh', current: 'en', expected: 'zh-CN' },
  { name: 'invalid URL retains current Chinese', query: '?lang=xx', current: 'zh', expected: 'zh-CN' },
  { name: 'valid current preference wins over legacy', current: 'en', legacy: 'zh', expected: 'en' },
  { name: 'legacy Chinese remains valid', current: 'bad', legacy: 'zh', expected: 'zh-CN' },
  { name: 'unavailable storage still renders', blocked: true, expected: 'en' },
]) test('pricing locale: ' + scenario.name, t => { assert.equal(boot(t, scenario).d.documentElement.lang, scenario.expected); });

test('pricing: bilingual copy is complete, preserves USD prices and does not start billing', t => {
  const ui = boot(t);
  assert.deepEqual([...ui.d.querySelectorAll('.plan-price strong')].map(el => el.textContent), ['29.99', '44.99', '79.99']);
  assert.ok([...ui.d.querySelectorAll('.price-currency')].every(el => el.textContent === 'USD'));
  assert.match(ui.d.body.textContent, /Planned pricing · Not on sale/);
  assert.equal(ui.d.querySelectorAll('form').length, 0);
  assert.ok([...ui.d.querySelectorAll('.plan-cta')].every(link => ['/demo.html', '/portal.html'].includes(new URL(link.href).pathname)));
  const before = [...ui.d.querySelectorAll('[data-i18n]')].map(el => el.textContent);
  assert.ok(before.every(text => text.length > 0 && text !== 'undefined'));
  ui.d.querySelector('[data-locale="zh"]').click();
  assert.match(ui.d.body.textContent, /拟议价格 · 尚未销售/);
  assert.ok([...ui.d.querySelectorAll('[data-i18n]')].every(el => el.textContent.length > 0 && el.textContent !== 'undefined'));
  assert.equal(ui.w.localStorage.getItem('studygps-locale'), 'zh');
  assert.equal(ui.w.localStorage.getItem('studygps.locale'), 'zh');
  assert.ok([...ui.d.querySelectorAll('[data-locale-link]')].every(link => new URL(link.href).searchParams.get('lang') === 'zh'));
  ui.d.querySelector('[data-locale="en"]').click();
  assert.deepEqual([...ui.d.querySelectorAll('[data-i18n]')].map(el => el.textContent), before);
});

test('pricing: static initial HTML matches the English rendered copy without a language flash', t => {
  const ui = boot(t);
  const staticDom = new JSDOM(html); t.after(() => staticDom.window.close());
  const d = staticDom.window.document;
  assert.equal(d.documentElement.lang, 'en');
  assert.equal(d.title, ui.d.title);
  assert.equal(d.querySelector('meta[name="description"]').content, ui.d.querySelector('meta[name="description"]').content);
  for (const el of d.querySelectorAll('[data-i18n]')) assert.equal(el.textContent, ui.d.querySelector('[data-i18n="' + el.dataset.i18n + '"]').textContent, el.dataset.i18n);
});

test('pricing calculator: tiers change monthly revenue, assumed starting cost and exact 80% ceiling', t => {
  const ui = boot(t);
  for (const [tier, revenue, cost, margin, ceiling, state] of [
    ['silver', 'USD 29.99', 'USD 2.50', '91.66%', 'USD 5.998', 'above'],
    ['gold', 'USD 44.99', 'USD 8.00', '82.22%', 'USD 8.998', 'above'],
    ['platinum', 'USD 79.99', 'USD 16.50', '79.37%', 'USD 15.998', 'below'],
  ]) {
    ui.tier(tier);
    for (const [id, value] of [['calc-revenue', revenue], ['cost-value', cost], ['calc-margin', margin], ['calc-ceiling', ceiling]]) assert.equal(ui.d.getElementById(id).textContent, value);
    assert.equal(ui.d.getElementById('margin-status').dataset.state, state);
    assert.equal(ui.d.querySelector('[data-calculator-tier="' + tier + '"]').getAttribute('aria-pressed'), 'true');
  }
});

test('pricing calculator: costs rounded near 80% do not imply the target has been met', t => {
  const ui = boot(t);
  for (const [tier, lower, upper, display] of [['silver', 5.9, 6, '79.99%'], ['gold', 8.9, 9, '<80.00%'], ['platinum', 15.9, 16, '<80.00%']]) {
    ui.tier(tier); ui.cost(lower); assert.equal(ui.d.getElementById('margin-status').dataset.state, 'above');
    ui.cost(upper); assert.equal(ui.d.getElementById('margin-status').dataset.state, 'below');
    assert.equal(ui.d.getElementById('calc-margin').textContent, display);
  }
});

test('pricing calculator: zero costs and costs exceeding revenue show their actual arithmetic', t => {
  const ui = boot(t); ui.cost(0);
  assert.equal(ui.d.getElementById('calc-margin').textContent, '100.00%');
  ui.cost(40);
  assert.equal(ui.d.getElementById('calc-margin').textContent, '-33.38%');
  assert.equal(ui.d.getElementById('margin-status').dataset.state, 'loss');
  assert.equal(ui.d.getElementById('unit-cost').getAttribute('aria-valuetext'), 'USD 40.00');
  ui.d.querySelector('[data-locale="zh"]').click();
  assert.match(ui.d.getElementById('margin-status').textContent, /超过收入/);
  assert.equal(ui.d.getElementById('calc-margin').textContent, '-33.38%');
});

test('pricing: assumed cost ranges have correctly rounded gross margins and explicit limits', t => {
  const ui = boot(t);
  const rows = [...ui.d.querySelectorAll('.cost-table tbody tr')].map(row => [...row.children].map(el => el.textContent));
  assert.deepEqual(rows, [
    ['Silver', 'USD 2–3', '90.0–93.3%', 'USD 5.998'],
    ['Gold', 'USD 7–9', '80.0–84.4%', 'USD 8.998'],
    ['Platinum', 'USD 15–18', '77.5–81.2%', 'USD 15.998'],
  ]);
  assert.match(ui.d.querySelector('[data-i18n="economicsIntro"]').textContent, /not measured/);
  assert.match(ui.d.querySelector('[data-i18n="economicsNote"]').textContent, /not net profit/);
  assert.match(ui.d.querySelector('[data-i18n="economicsNote"]').textContent, /payment fees, taxes, support/);
  assert.match(ui.d.querySelector('#fair-use').textContent, /fair-use, file-size and compute budgets/);
  assert.match(ui.d.querySelector('#grade-scenarios').textContent, /would not predict an exam result/);
  assert.match(ui.d.querySelector('[data-i18n="currentBody"]').textContent, /does not call an LLM or consume a proposed AI-refresh allowance/);
  assert.match(ui.d.querySelector('[data-i18n="extensionBody"]').textContent, /No annual offer, checkout or recurring payment is active/);
});
