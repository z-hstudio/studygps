'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { generateStudyPlan } = require('../engine');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sources = [
  'https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/neuroscience/',
  'https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/memory/',
  'https://pubmed.ncbi.nlm.nih.gov/16719566/',
];

async function boot(t, page, options = {}) {
  const file = page === 'home' ? 'index.html' : 'demo.html';
  const dom = new JSDOM(read('web/' + file), {
    url: 'https://studygps.test/' + file + (options.query || ''),
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.structuredClone = structuredClone;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (options.current != null) w.localStorage.setItem('studygps-locale', options.current);
  if (options.legacy != null) w.localStorage.setItem('studygps.locale', options.legacy);
  if (options.blockedStorage) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  if (page === 'home') w.eval(read('web/home.js'));
  else {
    w.fetch = async (url, init = {}) => {
      if (url === '/api/study-plan') {
        const request = JSON.parse(init.body);
        return { ok: true, json: async () => generateStudyPlan(request.input, request.course, request.previous_plan) };
      }
      assert.match(url, /^\/examples\/[a-z0-9-]+\.(request|output)\.json$/);
      return { ok: true, json: async () => JSON.parse(read('engine/examples/' + path.basename(url))) };
    };
    w.eval(read('web/presentation.js'));
    w.StudyGPSLearning = { units: JSON.parse(read('web/learning-content.json')), signatures: JSON.parse(read('web/learning-sources.json')) };
    w.eval(read('web/app.js'));
    for (let attempt = 0; attempt < 25 && w.document.getElementById('result-status').dataset.state !== 'ready'; attempt++) {
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(w.document.getElementById('result-status').dataset.state, 'ready');
  }
  return w;
}

const localeCases = [
  { name: 'no preference defaults to English', expected: 'en' },
  { name: 'invalid query and stored values default to English', query: '?lang=fr', current: 'invalid', legacy: 'invalid', expected: 'en' },
  { name: 'valid query takes priority over both stored preferences', query: '?lang=en', current: 'zh', legacy: 'zh', expected: 'en' },
  { name: 'explicit Chinese query is preserved', query: '?lang=zh', current: 'en', expected: 'zh' },
  { name: 'invalid query preserves a valid Chinese preference', query: '?lang=invalid', current: 'zh', expected: 'zh' },
  { name: 'current preference takes priority over legacy preference', current: 'en', legacy: 'zh', expected: 'en' },
  { name: 'invalid current preference falls back to valid legacy Chinese', current: 'invalid', legacy: 'zh', expected: 'zh' },
  { name: 'blocked storage still starts in English', blockedStorage: true, expected: 'en' },
];

for (const page of ['home', 'demo']) {
  for (const scenario of localeCases) test(page + ': ' + scenario.name, async t => {
    const w = await boot(t, page, scenario);
    assert.equal(w.document.documentElement.lang.startsWith(scenario.expected), true);
    assert.equal(w.document.querySelector('[data-locale="' + scenario.expected + '"]').getAttribute('aria-pressed'), 'true');
    const headline = w.document.querySelector(page === 'home' ? '#hero-title' : 'h1').textContent;
    assert.equal(/[\u4e00-\u9fff]/.test(headline), scenario.expected === 'zh');
  });

  test(page + ': language switch synchronizes both preference keys', async t => {
    const w = await boot(t, page);
    w.document.querySelector('[data-locale="zh"]').click();
    assert.equal(w.localStorage.getItem('studygps-locale'), 'zh');
    assert.equal(w.localStorage.getItem('studygps.locale'), 'zh');
    assert.equal(new URL(w.location.href).searchParams.get('lang'), 'zh');
  });

  test(page + ': static English content matches the first rendered view', async t => {
    const file = page === 'home' ? 'index.html' : 'demo.html';
    const staticDom = new JSDOM(read('web/' + file));
    t.after(() => staticDom.window.close());
    const before = staticDom.window.document;
    const w = await boot(t, page);
    assert.ok(before.documentElement.lang.startsWith('en'));
    assert.equal(before.title, w.document.title);
    assert.equal(before.querySelector('meta[name="description"]').content, w.document.querySelector('meta[name="description"]').content);
    for (const element of before.querySelectorAll('[data-i18n]')) {
      const selector = '[data-i18n="' + element.dataset.i18n + '"]';
      assert.equal(element.textContent, w.document.querySelector(selector).textContent, element.dataset.i18n);
    }
    assert.equal(/[\u4e00-\u9fff]/.test(before.body.textContent.replace(/中文/g, '')), false);
  });
}

test('home: bilingual learning science cites sources without implying endorsement or fixed research intervals', async t => {
  const w = await boot(t, 'home');
  const section = w.document.getElementById('science');
  assert.deepEqual([...section.querySelectorAll('a')].map(link => link.href), sources);
  assert.equal(section.querySelectorAll('article').length, 4);
  assert.match(section.textContent, /No Berkeley endorsement or partnership/);
  assert.match(section.textContent, /Review intervals are adjustable planning rules/);
  const words = [...section.querySelectorAll('[data-i18n]')].map(el => el.textContent).join(' ').split(/\s+/);
  assert.ok(words.length <= 110, 'The science module should remain a short read.');
  w.document.querySelector('[data-locale="zh"]').click();
  assert.match(section.textContent, /主动回忆/);
  assert.match(section.textContent, /间隔复习/);
  assert.match(section.textContent, /休息与睡眠/);
  assert.match(section.textContent, /无 Berkeley 背书或合作关系/);
  assert.deepEqual([...section.querySelectorAll('a')].map(link => link.href), sources);
});

for (const page of ['home', 'demo']) test(page + ': brand links retain explicit locale when storage is unavailable', async t => {
  const w = await boot(t, page, { query: '?lang=zh', blockedStorage: true });
  for (const link of w.document.querySelectorAll('a.brand')) assert.equal(new URL(link.href).searchParams.get('lang'), 'zh');
  w.document.querySelector('[data-locale="en"]').click();
  for (const link of w.document.querySelectorAll('a.brand')) assert.equal(new URL(link.href).searchParams.get('lang'), 'en');
});

test('demo: primary navigation and skip link reach the new route without removing original engine anchors', async t => {
  const w = await boot(t, 'demo');
  for (const selector of ['.skip-link', '[data-i18n="navPlan"]']) {
    assert.equal(w.document.querySelector(selector).getAttribute('href'), '#navigation-demo');
    assert.ok(w.document.querySelector('#navigation-demo'));
  }
  assert.ok(w.document.querySelector('#workspace'));
  assert.ok(w.document.querySelector('#study-form'));
  assert.equal(w.document.querySelector('[data-i18n="navPlan"]').textContent, 'Learning navigation');
  w.document.querySelector('[data-locale="zh"]').click();
  assert.equal(w.document.querySelector('[data-i18n="navPlan"]').textContent, '学习导航');
});

test('home: route positioning identifies student inputs, local records and the replan loop', async t => {
  const w = await boot(t, 'home');
  assert.match(w.document.querySelector('[data-i18n="heroDescription"]').textContent, /what to learn, when to study and how to practise/);
  const intro = w.document.querySelector('[data-i18n="approachDescription"]').textContent;
  assert.match(intro, /Enter your deadlines, course requirements, goals and study habits/);
  assert.match(intro, /scores, progress and teacher feedback in StudyGPS/);
  assert.deepEqual([...w.document.querySelectorAll('.route-steps li [data-i18n]')].map(el => el.textContent), ['Your position', 'Your goal', 'Your study route', 'Update and replan']);
  assert.equal(w.document.querySelector('.hero-art') != null, true);
  for (const link of w.document.querySelectorAll('[data-locale-link]')) assert.equal(new URL(link.href).searchParams.get('lang'), 'en');
});

test('home: priority formula explains workspace and interactive routes, unknown scores and product-rule examples', async t => {
  const w = await boot(t, 'home');
  const section = w.document.querySelector('.priority-method');
  assert.match(section.textContent, /Workspace and interactive demo/);
  assert.match(section.textContent, /The weaker, more important and more urgent a topic is, the higher it moves/);
  assert.equal(section.querySelector('[role="math"]').getAttribute('aria-label'), 'Priority equals weakness times impact times urgency');
  assert.match(section.textContent, /max\(0, target score − recorded score\)/);
  assert.match(section.textContent, /factors 4 \/ 3 \/ 2 \/ 1.5/);
  assert.match(section.textContent, /20 × 30% × 3 = 18/);
  assert.match(section.textContent, /20 × 30% × 1 = 6/);
  assert.match(section.textContent, /assessment-only reference below the interactive demo retains its original calculation/);
  assert.match(section.textContent, /Unknown scores trigger a check of understanding/);
  w.document.querySelector('[data-locale="zh"]').click();
  assert.match(section.textContent, /产品规则/);
  assert.match(section.textContent, /学习空间和交互演示中带日期的路线都使用此公式/);
  assert.match(section.textContent, /越薄弱、越重要、越紧迫/);
  assert.match(section.querySelector('[role="math"]').getAttribute('aria-label'), /薄弱程度乘以影响乘以紧迫程度/);
  assert.ok([...w.document.querySelectorAll('[data-i18n="navPricing"]')].every(link => new URL(link.closest('a').href).searchParams.get('lang') === 'zh'));
});

test('home: illustrative route cards describe a 25-minute focus block in both languages', async t => {
  const w = await boot(t, 'home');
  assert.match(w.document.querySelector('[data-i18n="annotationTime"]').textContent, /^25-minute focus/);
  assert.match(w.document.querySelector('.route-time').textContent, /^25 /);
  assert.match(w.document.querySelector('[data-i18n="mockRouteDescription"]').textContent, /sketch the four stages from memory/);
  w.document.querySelector('[data-locale="zh"]').click();
  assert.match(w.document.querySelector('[data-i18n="annotationTime"]').textContent, /^25 分钟专注/);
  assert.match(w.document.querySelector('[data-i18n="mockRouteDescription"]').textContent, /凭记忆画出四个过程/);
});
