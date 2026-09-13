'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createNavigationDemoHandler } = require('../api/navigation-demo');
const root = path.resolve(__dirname, '..');
const navigationScript = fs.readFileSync(path.join(root, 'web/navigation-ui.js'), 'utf8');
const labScript = fs.readFileSync(path.join(root, 'web/navigation-demo.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const settle = async () => { await tick(); await tick(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function apiResponse(url) {
  const res = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
  createNavigationDemoHandler({ now: () => new Date('2026-09-13T00:00:00Z') })({ method: 'GET', url }, res);
  return { ok: res.statusCode === 200, json: async () => res.body };
}

function setup(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><section id="navigation-demo"></section></body></html>', { url: 'https://studygps.example/demo.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window, calls = [], renders = [], guides = [];
  let stops = 0;
  w.StudyGPSAudio = { stopAll() { stops++; }, create(value) { guides.push(value); const guide = w.document.createElement('div'); guide.className = 'test-guide'; return guide; } };
  w.eval(navigationScript);
  const render = w.StudyGPSNavigationUI.render;
  w.StudyGPSNavigationUI = { render(value) { renders.push(value); return render(value); } };
  w.fetch = (url, settings) => {
    calls.push({ url, settings });
    return options.fetch ? options.fetch(url, settings, calls.length) : Promise.resolve(apiResponse(url));
  };
  if (options.lang) w.document.documentElement.lang = options.lang;
  w.eval(labScript);
  const find = selector => w.document.querySelector(selector);
  const change = (name, value) => { const field = find('#lab-' + name); field.value = value; field.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const query = index => Object.fromEntries(new URL(calls[index ?? calls.length - 1].url, w.location.href).searchParams);
  return { w, find, change, query, calls, renders, guides, stops: () => stops };
}

test('the lab sends supported settings to the real API and reuses the compact route with four upcoming blocks', async t => {
  const app = setup(t); await settle();
  assert.deepEqual(app.query(), { preset: 'alex1', urgency: 'none', sleep: 'off', feedback: 'none', completed: '0' });
  assert.equal(new URL(app.calls[0].url, app.w.location.href).pathname, '/api/navigation-demo');
  assert.equal(app.find('#navigation-demo').getAttribute('aria-busy'), 'false');
  assert.match(app.find('#lab-status').textContent, /Route updated/);
  const options = app.renders.at(-1);
  assert.equal(options.compact, true); assert.equal(options.hideContext, true); assert.equal(options.readOnly, true);
  const payload = await apiResponse(app.calls[0].url).json();
  assert.deepEqual(options.navigation.sessions.map(session => session.id), payload.navigation.sessions.filter(session => !session.completed).slice(0, 4).map(session => session.id));
  assert.equal(options.navigation.sessions[0].nextReviewDate, payload.navigation.sessions[0].nextReviewDate);
  assert.equal(app.find('#lab-result').querySelectorAll('.navigation-session').length, 4);
  assert.equal(app.find('.navigation-context'), null); assert.equal(app.find('.navigation-hero'), null);
  assert.equal(app.find('.navigation-health'), null); assert.equal(app.find('.navigation-session-actions button'), null);
  assert.equal(app.guides.length, 4);
  assert.match(app.find('#lab-result').textContent, /Fictional|course impact|priority/);
});

test('every control updates exact API parameters; changing the situation resets simulated completion', async t => {
  const app = setup(t); await settle();
  for (const [key, value] of [['preset', 'alex2'], ['urgency', 'soon'], ['sleep', 'short_sleep'], ['feedback', 'units']]) { app.change(key, value); await settle(); }
  assert.deepEqual(app.query(), { preset: 'alex2', urgency: 'soon', sleep: 'short_sleep', feedback: 'units', completed: '0' });
  const checkbox = app.find('.lab-complete input'); checkbox.click(); await settle();
  assert.equal(app.query().completed, '1');
  assert.ok(app.renders.at(-1).navigation.sessions.every(session => !session.completed));
  app.change('preset', 'sarah1'); await settle();
  assert.equal(app.query().completed, '0'); assert.equal(checkbox.checked, false);
  assert.equal(app.query().preset, 'sarah1');
  assert.equal(app.calls.some(call => call.settings.method && call.settings.method !== 'GET'), false);
});

test('a newer situation aborts the pending request and a late old response cannot replace the latest route', async t => {
  const old = deferred();
  const app = setup(t, { fetch: (url, settings, count) => count === 1 ? old.promise : Promise.resolve(apiResponse(url)) });
  assert.equal(app.find('#navigation-demo').getAttribute('aria-busy'), 'true');
  app.change('urgency', 'soon'); await settle();
  assert.equal(app.calls[0].settings.signal.aborted, true);
  assert.equal(app.renders.at(-1).navigation.sessions[0].topicId, 'second_law');
  assert.match(app.find('.navigation-priority').textContent, /15 score gap × 30% course impact × 3 urgency = 13.5 priority/);
  const renderCount = app.renders.length;
  old.resolve(apiResponse(app.calls[0].url)); await settle();
  assert.equal(app.renders.length, renderCount);
  assert.equal(app.find('#navigation-demo').getAttribute('aria-busy'), 'false');
  assert.equal(app.find('#lab-retry').hidden, true);
});

test('network failure keeps settings and a localized retry recovers the same situation', async t => {
  const app = setup(t, { fetch: (url, settings, count) => count < 3 ? Promise.reject(new Error('Offline')) : Promise.resolve(apiResponse(url)) });
  await settle(); app.change('sleep', 'short_sleep'); await settle();
  assert.match(app.find('#lab-status').textContent, /could not load/);
  assert.equal(app.find('#lab-retry').hidden, false);
  assert.equal(app.find('#lab-result').childElementCount, 0);
  app.w.document.documentElement.lang = 'zh-CN'; await settle();
  assert.match(app.find('#lab-status').textContent, /暂时无法加载/);
  assert.equal(app.find('#lab-retry').hidden, false);
  assert.equal(app.find('#lab-sleep').value, 'short_sleep');
  assert.equal(app.calls.length, 2);
  app.find('#lab-retry').click(); await settle();
  assert.deepEqual(app.query(), { preset: 'alex1', urgency: 'none', sleep: 'short_sleep', feedback: 'none', completed: '0' });
  assert.match(app.find('#lab-status').textContent, /已依据当前选择/);
  assert.match(app.find('.lab-health-note').textContent, /今天的预算减半/);
  assert.equal(app.find('#lab-retry').hidden, true);
});

test('language changes during a pending request retain loading until that request actually completes', async t => {
  const pending = deferred();
  const app = setup(t, { fetch: () => pending.promise });
  app.w.document.documentElement.lang = 'zh'; await settle();
  assert.equal(app.find('#lab-status').textContent, '正在更新路线…');
  assert.equal(app.find('#navigation-demo').getAttribute('aria-busy'), 'true');
  assert.equal(app.find('#lab-result').childElementCount, 0);
  assert.equal(app.calls.length, 1);
  pending.resolve(apiResponse(app.calls[0].url)); await settle();
  assert.match(app.find('#lab-status').textContent, /已依据当前选择/);
  assert.equal(app.find('#navigation-demo').getAttribute('aria-busy'), 'false');
  assert.equal(app.renders.at(-1).locale, 'zh');
  assert.match(app.find('.lab-metrics').textContent, /分钟/);
  assert.equal(app.find('.lab-links a').getAttribute('href'), '/portal.html?lang=zh');
  app.w.document.documentElement.lang = 'en'; await settle();
  assert.match(app.find('#lab-status').textContent, /Route updated/);
  assert.equal(app.renders.at(-1).locale, 'en');
  assert.equal(app.calls.length, 1);
});

test('compact planning notes are collapsed without discarding localized warnings or study instructions', async t => {
  const app = setup(t); await settle();
  const warnings = app.renders.at(-1).navigation.warnings;
  assert.ok(warnings.length > 0);
  const notes = app.find('.navigation-planning-notes');
  assert.equal(notes.tagName, 'DETAILS'); assert.equal(notes.open, false);
  assert.equal(notes.querySelector('summary').textContent, `Planning notes (${warnings.length})`);
  assert.deepEqual([...notes.querySelectorAll('li')].map(li => li.textContent), warnings.map(warning => warning.en));
  notes.open = true; assert.equal(notes.open, true);
  assert.ok(app.find('.navigation-session[open] .navigation-steps li'));
  app.w.document.documentElement.lang = 'zh'; await settle();
  assert.equal(app.find('.navigation-planning-notes summary').textContent, `规划说明 (${warnings.length})`);
  assert.deepEqual([...app.find('.navigation-planning-notes').querySelectorAll('li')].map(li => li.textContent), warnings.map(warning => warning.zh));
});

test('the real public API simulation clock remains visible and localized', async t => {
  const app = setup(t); await settle();
  const payload = await apiResponse(app.calls[0].url).json();
  assert.ok(payload.simulationClock);
  const { date, time, timezone } = payload.simulationClock;
  assert.equal(app.find('.lab-clock').textContent, `Simulation clock: ${date} ${time} · ${timezone}`);
  app.w.document.documentElement.lang = 'zh'; await settle();
  assert.equal(app.find('.lab-clock').textContent, `模拟时钟: ${date} ${time} · ${timezone}`);
});

test('malformed or non-synthetic payloads fail safely without claiming a ready route', async t => {
  for (const payload of [{ source: 'private', navigation: { sessions: [], summary: {} } }, { source: 'synthetic', navigation: { sessions: 'invalid', summary: {} } }]) {
    const app = setup(t, { fetch: async () => ({ ok: true, json: async () => payload }) });
    await settle();
    assert.equal(app.find('#lab-retry').hidden, false);
    assert.equal(app.find('#lab-result').childElementCount, 0);
    assert.match(app.find('#lab-status').textContent, /could not load/);
    assert.equal(app.renders.length, 0);
  }
});

test('leaving the page aborts pending work, stops audio and ignores later responses', async t => {
  const pending = deferred(); const app = setup(t, { fetch: () => pending.promise });
  const previousStops = app.stops();
  app.w.dispatchEvent(new app.w.Event('pagehide'));
  assert.equal(app.calls[0].settings.signal.aborted, true);
  assert.equal(app.stops(), previousStops + 1);
  pending.resolve(apiResponse(app.calls[0].url)); await settle();
  assert.equal(app.renders.length, 0);
  assert.equal(app.find('#lab-result').childElementCount, 0);
});

test('the full route summary jumps over locked reviews to the next actionable block in both languages', async t => {
  const app = setup(t); await settle();
  const payload = await apiResponse(app.calls[0].url).json();
  const actionable = payload.navigation.sessions.find(session => !session.completed && session.date && session.time && session.canComplete);
  assert.ok(actionable);
  const locked = { ...actionable, id: 'locked-review', canComplete: false, kind: 'review' };
  const finished = { ...actionable, id: 'finished-block', completed: true };
  const navigation = { ...payload.navigation, sessions: [locked, finished, actionable] };
  const scrolls = [];
  app.w.HTMLElement.prototype.scrollIntoView = function (options) { scrolls.push({ node: this, options }); };
  app.w.matchMedia = () => ({ matches: true });
  for (const locale of ['en', 'zh']) {
    const view = app.w.StudyGPSNavigationUI.render({ context: payload.context, navigation, locale });
    app.w.document.body.append(view);
    const jump = view.querySelector('.navigation-jump-link');
    assert.equal(jump.textContent, locale === 'zh' ? '跳到下一段学习 ↓' : 'Jump to next study block ↓');
    assert.ok(view.querySelector('.navigation-summary-actions .navigation-edit-link'));
    jump.click();
    assert.equal(scrolls.at(-1).node.dataset.sessionId, actionable.id);
    assert.equal(scrolls.at(-1).options.behavior, 'instant');
    assert.equal(scrolls.at(-1).node.open, true);
    assert.equal(app.w.document.activeElement, scrolls.at(-1).node.querySelector('summary'));
    view.remove();
  }
});

test('the route does not offer a dead jump button when only locked, completed or unscheduled blocks remain', async t => {
  const app = setup(t); await settle();
  const payload = await apiResponse(app.calls[0].url).json();
  const session = payload.navigation.sessions[0];
  for (const value of [{ ...session, canComplete: false }, { ...session, completed: true }, { ...session, date: null, time: null }]) {
    const view = app.w.StudyGPSNavigationUI.render({ context: payload.context, navigation: { ...payload.navigation, sessions: [value] }, locale: 'en' });
    assert.equal(view.querySelector('.navigation-jump-link'), null);
    assert.ok(view.querySelector('.navigation-edit-link'));
  }
});
