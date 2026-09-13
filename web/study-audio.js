(function () {
  'use strict';
  const TOPICS = { first_law: 'first-law', second_law: 'second-law', entropy: 'entropy', rankine_cycle: 'rankine-cycle' };
  const COPY = {
    en: {
      listen: 'Listen to study guide', close: 'Close audio guide', loading: 'Loading the study guide…', ready: 'Press Play to begin. Audio never starts automatically.', paused: 'Audio paused.', playing: 'Playing the English study guide.', complete: 'Study guide finished.',
      unavailable: 'Audio is unavailable. You can still read the guide below.', retry: 'Retry audio', speed: 'Playback speed', transcript: 'Read the transcript', englishTranscript: 'English transcript', language: 'English audio · Text transcript available', chineseNote: 'English audio · Chinese reference text below',
      note: 'A pre-recorded topic guide. Follow your current task for your personal dates and priorities.', fallback: 'Read the current task’s steps while audio is unavailable.', provider: 'AI voice: Pocket TTS', audioLabel: 'English topic study guide',
    },
    zh: {
      listen: '听学习步骤', close: '收起语音指导', loading: '正在加载学习指导…', ready: '点击播放开始。音频不会自动播放。', paused: '音频已暂停。', playing: '正在播放英文学习指导。', complete: '学习指导播放完毕。',
      unavailable: '音频暂时无法使用，仍可阅读下方文字指导。', retry: '重试音频', speed: '播放速度', transcript: '阅读中文对照稿', englishTranscript: '查看英文原稿', language: '英文音频 · 提供文字稿', chineseNote: '英文音频 · 下方提供中文对照稿',
      note: '这是预先生成的知识点指导；个人日期与优先级请以当前任务为准。', fallback: '音频不可用时，可以阅读当前任务的学习步骤。', provider: 'AI 语音：Pocket TTS', audioLabel: '英文知识点学习指导',
    },
  };
  const instances = new Set();
  let active = null;
  let sequence = 0;
  let cachedManifest = null;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function append(parent, ...children) { for (const child of children) if (child) parent.append(child); return parent; }
  function stopAll() { for (const item of instances) item.stop(); }
  const observer = new MutationObserver(() => {
    for (const item of instances) {
      if (item.root.isConnected) item.wasConnected = true;
      else if (item.wasConnected) item.dispose();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pagehide', stopAll);
  window.addEventListener('popstate', stopAll);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (link && link.target !== '_blank' && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) stopAll();
  });

  function create(options = {}) {
    const locale = options.locale === 'zh' ? 'zh' : 'en';
    const t = key => COPY[locale][key];
    const topicId = options.topicId;
    const root = element('section', 'study-audio');
    if (!Object.hasOwn(TOPICS, topicId)) return root;
    const id = 'study-audio-' + (++sequence);
    const toggle = element('button', 'button button-outline button-small study-audio-toggle', t('listen'));
    toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', id);
    const panel = element('div', 'study-audio-panel'); panel.id = id; panel.hidden = true;
    const language = element('p', 'form-note', t(locale === 'zh' ? 'chineseNote' : 'language'));
    const provider = element('p', 'study-audio-provider'); provider.hidden = true;
    const audio = element('audio', 'study-audio-player');
    audio.controls = true; audio.autoplay = false; audio.preload = 'none'; audio.hidden = true;
    audio.setAttribute('aria-label', t('audioLabel'));
    const tools = element('div', 'study-audio-tools'); tools.hidden = true;
    const speedLabel = element('label', null, t('speed')); speedLabel.htmlFor = id + '-speed';
    const speed = element('select'); speed.id = id + '-speed';
    for (const rate of [0.75, 1, 1.25, 1.5]) { const option = element('option', null, rate + '×'); option.value = String(rate); speed.append(option); }
    speed.value = '1'; speed.addEventListener('change', () => { audio.playbackRate = Number(speed.value); });
    append(tools, speedLabel, speed);
    const status = element('p', 'study-audio-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const retry = element('button', 'button button-outline button-small', t('retry')); retry.type = 'button'; retry.hidden = true;
    const transcript = element('details', 'study-audio-transcript');
    const transcriptText = element('p'); transcriptText.lang = locale === 'zh' ? 'zh-CN' : 'en';
    const english = element('details', 'study-audio-original'); english.hidden = true;
    const englishText = element('p'); englishText.lang = 'en';
    append(english, element('summary', null, t('englishTranscript')), englishText);
    append(transcript, element('summary', null, t('transcript')), transcriptText, english);
    const fallback = options.fallbackText && typeof options.fallbackText === 'object' ? options.fallbackText : {};
    transcriptText.textContent = typeof fallback[locale] === 'string' ? fallback[locale] : t('fallback');
    append(panel, language, provider, audio, tools, status, retry, transcript, element('p', 'form-note', t('note')));
    append(root, toggle, panel);
    let version = 0;
    let controller = null;
    let timer = null;
    let loaded = false;
    let disposed = false;
    let failed = false;
    function clearTimer() { if (timer !== null) window.clearTimeout(timer); timer = null; }
    function pause(reset = false) {
      try { audio.pause(); if (reset) audio.currentTime = 0; } catch (_) {}
      if (active === item) active = null;
    }
    function setStatus(text) { status.textContent = text; }
    function failure() {
      if (disposed || panel.hidden) return;
      clearTimer(); failed = true; pause();
      setStatus(t('unavailable')); retry.hidden = false; transcript.open = true;
    }
    const item = {
      root, audio, wasConnected: false,
      stop() { version++; controller?.abort(); controller = null; clearTimer(); pause(true); if (!panel.hidden && !failed) setStatus(t('paused')); },
      dispose() { if (disposed) return; disposed = true; item.stop(); audio.removeAttribute('src'); try { audio.load(); } catch (_) {} instances.delete(item); },
    };
    instances.add(item);
    audio.addEventListener('play', () => {
      if (disposed || !root.isConnected || panel.hidden) { pause(); return; }
      if (active && active !== item) active.audio.pause();
      active = item; failed = false; retry.hidden = true; setStatus(t('playing'));
    });
    audio.addEventListener('pause', () => { if (!failed && !disposed && !panel.hidden) setStatus(t('paused')); if (active === item) active = null; });
    audio.addEventListener('ended', () => { if (!disposed) setStatus(t('complete')); if (active === item) active = null; });
    audio.addEventListener('error', failure);
    audio.addEventListener('loadedmetadata', () => { clearTimer(); if (!failed && !disposed && !panel.hidden) setStatus(t('ready')); });
    audio.addEventListener('canplay', () => { clearTimer(); if (!failed && !disposed && !panel.hidden && audio.paused) setStatus(t('ready')); });

    async function loadGuide(force = false) {
      const generation = ++version;
      controller?.abort(); controller = new AbortController();
      clearTimer(); pause(); failed = false; retry.hidden = true; setStatus(t('loading'));
      timer = window.setTimeout(() => { controller?.abort(); failure(); }, 20000);
      try {
        let manifest = !force && cachedManifest;
        if (!manifest) {
          const response = await fetch('/assets/audio/manifest.json', { credentials: 'omit', cache: force ? 'reload' : 'default', signal: controller.signal });
          if (!response.ok) throw new Error('Audio manifest unavailable');
          manifest = await response.json();
        }
        if (disposed || generation !== version || !root.isConnected || panel.hidden) return;
        const entry = manifest?.[topicId];
        const expected = '/assets/audio/' + TOPICS[topicId] + '.wav';
        if (!entry || entry.provider !== 'Pocket TTS' || entry.src !== expected || entry.voiceSource !== 'https://huggingface.co/kyutai/tts-voices/tree/main/alba-mackenna' || entry.licenseUrl !== 'https://creativecommons.org/licenses/by/4.0/' || typeof entry.text?.en !== 'string' || !entry.text.en.trim() || typeof entry.text?.zh !== 'string' || !entry.text.zh.trim()) throw new Error('Invalid audio guide');
        cachedManifest = manifest;
        transcriptText.textContent = entry.text[locale]; englishText.textContent = entry.text.en; english.hidden = locale !== 'zh';
        const voice = element('a', null, 'Alba MacKenna'); voice.href = entry.voiceSource; voice.target = '_blank'; voice.rel = 'noopener noreferrer';
        const license = element('a', null, 'CC BY 4.0'); license.href = entry.licenseUrl; license.target = '_blank'; license.rel = 'noopener noreferrer';
        provider.replaceChildren(document.createTextNode(t('provider') + ' · '), voice, document.createTextNode(' · '), license); provider.hidden = false;
        audio.src = entry.src; audio.preload = 'metadata'; audio.hidden = false; tools.hidden = false; audio.playbackRate = Number(speed.value);
        loaded = true; audio.load(); setStatus(t('ready'));
        // Loading metadata is initiated only after this explicit user action;
        // playback remains on the browser's native Play control.
      } catch (error) {
        if (disposed || generation !== version || error?.name === 'AbortError') return;
        failure();
      }
    }
    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); toggle.textContent = t(panel.hidden ? 'listen' : 'close');
      if (panel.hidden) item.stop();
      else if (!loaded || failed) void loadGuide();
      else setStatus(t('ready'));
    });
    retry.addEventListener('click', () => void loadGuide(true));
    return root;
  }
  window.StudyGPSAudio = Object.freeze({ create, stopAll });
})();
