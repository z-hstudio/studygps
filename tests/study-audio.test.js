'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'web/study-audio.js'), 'utf8');
const authoredManifest = JSON.parse(fs.readFileSync(path.join(root, 'web/assets/audio/manifest.json'), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { url: 'https://studygps.example/portal.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window;
  const state = new WeakMap();
  const calls = [];
  let playCalls = 0;
  Object.defineProperty(w.HTMLMediaElement.prototype, 'paused', { configurable: true, get() { return state.get(this) !== 'playing'; } });
  w.HTMLMediaElement.prototype.play = function () { playCalls++; state.set(this, 'playing'); this.dispatchEvent(new w.Event('play')); return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () { const playing = state.get(this) === 'playing'; state.set(this, 'paused'); if (playing) this.dispatchEvent(new w.Event('pause')); };
  w.HTMLMediaElement.prototype.load = function () {};
  w.fetch = async (url, settings) => {
    calls.push({ url, settings });
    return options.fetch ? options.fetch(url, settings) : { ok: true, json: async () => structuredClone(authoredManifest) };
  };
  w.eval(script);
  function create(topicId = 'first_law', locale = 'en') {
    const node = w.StudyGPSAudio.create({ topicId, locale, fallbackText: { en: 'Read the current task and check your explanation.', zh: '阅读当前任务，再检查自己的解释。' } });
    w.document.body.append(node); return node;
  }
  async function open(node) {
    node.querySelector('.study-audio-toggle').click();
    await tick(); await tick();
    const audio = node.querySelector('audio');
    if (audio.hasAttribute('src')) audio.dispatchEvent(new w.Event('loadedmetadata'));
    return audio;
  }
  return { w, create, open, calls, playCalls: () => playCalls };
}

test('a guide fetches only on request, exposes native controls and never starts automatically', async t => {
  const app = setup(t);
  const node = app.create();
  assert.equal(app.calls.length, 0);
  assert.equal(node.querySelector('audio').hasAttribute('src'), false);
  assert.equal(node.querySelector('.study-audio-provider').hidden, true);
  const audio = await app.open(node);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].url, '/assets/audio/manifest.json');
  assert.equal(app.calls[0].settings.credentials, 'omit');
  assert.equal(audio.getAttribute('src'), '/assets/audio/first-law.wav');
  assert.equal(audio.controls, true);
  assert.equal(audio.autoplay, false);
  assert.equal(app.playCalls(), 0);
  assert.match(node.querySelector('.study-audio-status').textContent, /Press Play to begin/);
  assert.match(node.querySelector('.study-audio-provider').textContent, /AI voice: Pocket TTS · Alba MacKenna · CC BY 4.0/);
  assert.equal(node.querySelector('.study-audio-provider a').href, authoredManifest.first_law.voiceSource);
  assert.equal(node.querySelectorAll('.study-audio-provider a')[1].href, authoredManifest.first_law.licenseUrl);
});

test('Chinese presentation explicitly retains English audio with a Chinese reference and exact English transcript', async t => {
  const app = setup(t);
  const node = app.create('entropy', 'zh');
  await app.open(node);
  assert.match(node.textContent, /英文音频 · 下方提供中文对照稿/);
  assert.equal(node.querySelector('.study-audio-transcript > p').textContent, authoredManifest.entropy.text.zh);
  assert.equal(node.querySelector('.study-audio-original > p').textContent, authoredManifest.entropy.text.en);
  assert.equal(node.querySelector('.study-audio-original').hidden, false);
  assert.equal(node.querySelector('audio').getAttribute('aria-label'), '英文知识点学习指导');
});

test('playing another guide pauses the first and speed changes reach the native player', async t => {
  const app = setup(t);
  const first = await app.open(app.create('first_law'));
  const secondNode = app.create('second_law');
  const second = await app.open(secondNode);
  await first.play(); assert.equal(first.paused, false);
  await second.play();
  assert.equal(first.paused, true);
  assert.equal(second.paused, false);
  const speed = secondNode.querySelector('select');
  assert.deepEqual([...speed.options].map(option => option.value), ['0.75', '1', '1.25', '1.5']);
  speed.value = '1.25'; speed.dispatchEvent(new app.w.Event('change'));
  assert.equal(second.playbackRate, 1.25);
});

test('closing a guide and application-level stop both pause and rewind playback', async t => {
  const app = setup(t);
  const node = app.create();
  const audio = await app.open(node);
  await audio.play(); audio.currentTime = 8;
  node.querySelector('.study-audio-toggle').click();
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(node.querySelector('.study-audio-panel').hidden, true);
  node.querySelector('.study-audio-toggle').click();
  await audio.play(); audio.currentTime = 7;
  app.w.StudyGPSAudio.stopAll();
  assert.equal(audio.paused, true); assert.equal(audio.currentTime, 0);
});

test('disconnecting a player stops its audio and releases the source without waiting for another playback', async t => {
  const app = setup(t);
  const node = app.create();
  const audio = await app.open(node);
  await audio.play();
  node.remove(); await tick();
  assert.equal(audio.paused, true);
  assert.equal(audio.hasAttribute('src'), false);
});

test('stopping while the manifest is pending aborts the request and ignores its late response', async t => {
  let resolve;
  const response = new Promise(done => { resolve = done; });
  const app = setup(t, { fetch: () => response });
  const node = app.create();
  node.querySelector('.study-audio-toggle').click();
  await tick();
  app.w.StudyGPSAudio.stopAll();
  assert.equal(app.calls[0].settings.signal.aborted, true);
  resolve({ ok: true, json: async () => structuredClone(authoredManifest) });
  await tick(); await tick();
  assert.equal(node.querySelector('audio').hasAttribute('src'), false);
  assert.equal(node.querySelector('.study-audio-provider').hidden, true);
  assert.equal(app.playCalls(), 0);
});

test('unavailable audio provides readable steps and Retry can recover without an automatic play', async t => {
  let failures = 1;
  const app = setup(t, { fetch: async () => failures-- > 0 ? { ok: false } : { ok: true, json: async () => structuredClone(authoredManifest) } });
  const node = app.create();
  await app.open(node);
  assert.match(node.querySelector('.study-audio-status').textContent, /Audio is unavailable/);
  assert.equal(node.querySelector('.study-audio-transcript').open, true);
  assert.match(node.querySelector('.study-audio-transcript > p').textContent, /Read the current task/);
  const retry = [...node.querySelectorAll('button')].find(button => button.textContent === 'Retry audio');
  assert.equal(retry.hidden, false);
  retry.click(); await tick(); await tick();
  assert.equal(app.calls.length, 2);
  assert.equal(node.querySelector('audio').getAttribute('src'), '/assets/audio/first-law.wav');
  assert.equal(node.querySelector('.study-audio-transcript > p').textContent, authoredManifest.first_law.text.en);
  assert.equal(app.playCalls(), 0);
});

test('a media decoding/network error retains the authored transcript and offers retry', async t => {
  const app = setup(t);
  const node = app.create('rankine_cycle');
  const audio = await app.open(node);
  audio.dispatchEvent(new app.w.Event('error'));
  assert.match(node.querySelector('.study-audio-status').textContent, /Audio is unavailable/);
  assert.equal(node.querySelector('.study-audio-transcript').open, true);
  assert.equal(node.querySelector('.study-audio-transcript > p').textContent, authoredManifest.rankine_cycle.text.en);
  assert.equal([...node.querySelectorAll('button')].find(button => button.textContent === 'Retry audio').hidden, false);
});

test('manifest validation rejects external media and unsupported providers without a Pocket TTS claim', async t => {
  for (const patch of [{ src: 'https://untrusted.example/voice.wav' }, { provider: 'Other provider' }, { voiceSource: 'javascript:alert(1)' }]) {
    const manifest = structuredClone(authoredManifest); Object.assign(manifest.first_law, patch);
    const app = setup(t, { fetch: async () => ({ ok: true, json: async () => manifest }) });
    const node = app.create(); await app.open(node);
    assert.equal(node.querySelector('audio').hasAttribute('src'), false);
    assert.equal(node.querySelector('.study-audio-provider').hidden, true);
    assert.match(node.querySelector('.study-audio-status').textContent, /Audio is unavailable/);
  }
});

test('transcripts are literal text and page navigation pauses an active guide', async t => {
  const manifest = structuredClone(authoredManifest);
  manifest.first_law.text.en = '<img src=x onerror=alert(1)> Read the guide.';
  const app = setup(t, { fetch: async () => ({ ok: true, json: async () => manifest }) });
  const node = app.create(); const audio = await app.open(node);
  assert.match(node.querySelector('.study-audio-transcript > p').textContent, /<img/);
  assert.equal(node.querySelectorAll('img').length, 0);
  await audio.play(); app.w.dispatchEvent(new app.w.Event('pagehide'));
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
});
