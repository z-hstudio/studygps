(function () {
  'use strict';
  const root = document.getElementById('navigation-demo');
  if (!root) return;
  const copy = {
    en: { title: 'Change the situation. Watch the route respond.', eyebrow: 'TRY THE LEARNING GPS', intro: 'What to study → When to study → How to study → Re-route. Try a deadline, a shorter night, or a new assessment.', preset: 'Starting point', alex1: 'Alex · First assessment', alex2: 'Alex · After reassessment', sarah1: 'Sarah · Same total, different gaps', urgency: 'Second-law assignment', none: 'No deadline / feedback', today: 'Due today at 21:00', soon: 'Due in 2 days', later: 'Due in 20 days', sleep: 'Apple Health simulation', off: 'Off', rested: 'Rested · fictional 7.8 h', short_sleep: 'Short sleep · fictional 5.2 h', no_data: 'No available data', feedback: 'Teacher guidance', units: 'Focus on entropy units', complete: 'Simulate completing the first block', loading: 'Updating the route…', ready: 'Route updated from the selected situation.', error: 'The route could not load. Your settings are still here; retry when the connection returns.', retry: 'Retry route', what: 'What to study', when: 'When to study', how: 'How to study', assessment: 'Observed assessment', focus: 'First available block', clock: 'Simulation clock', minutes: 'min', scope: 'Fictional students, real calculation. Nothing here changes an account or demonstrates a grade gain. The same route planner runs in the signed-in workspace.', sleepNote: 'Short-sleep simulation: today’s budget is halved, with focus blocks up to 20 minutes. Blood oxygen is display-only.', show: 'First 4 upcoming blocks. Expand a card for the reason, method and next review.', own: 'Build my own learning route ↗', pricing: 'View planned pricing ↗', legacy: 'Explore the original assessment engine below', legacyNote: 'The original demo below preserves its assessment-only budget calculation and n8n handoff. The live navigation above uses Weakness × Impact × Urgency and dated study blocks.' },
    zh: { title: '改变当前情况，看路线如何回应。', eyebrow: '亲手试试学习导航', intro: '学什么 → 什么时候学 → 怎么学 → 持续重新规划。试着改变截止日期、睡眠情境或测评结果。', preset: '目前的起点', alex1: 'Alex · 第一次测评', alex2: 'Alex · 更新测评后', sarah1: 'Sarah · 同总分，不同薄弱点', urgency: '第二定律作业', none: '没有截止任务 / 反馈', today: '今天 21:00 截止', soon: '2 天后截止', later: '20 天后截止', sleep: 'Apple Health 健康模拟', off: '关闭', rested: '休息充足 · 虚构 7.8 小时', short_sleep: '睡眠偏少 · 虚构 5.2 小时', no_data: '没有可用记录', feedback: '老师的指导', units: '重点检查熵的单位', complete: '模拟完成第一个学习时段', loading: '正在更新路线…', ready: '已依据当前选择更新路线。', error: '暂时无法加载路线。你的选择还在；连接恢复后可以重试。', retry: '重新加载路线', what: '学什么', when: '什么时候学', how: '怎么学', assessment: '已记录测评', focus: '下一段学习', clock: '模拟时钟', minutes: '分钟', scope: '虚构学生，真实计算。此处不会更改任何账号，也不能证明产品带来提分。登录后的学习空间使用同一个路线规划器。', sleepNote: '睡眠偏少演示：今天的预算减半，每段专注最多 20 分钟。血氧只作展示。', show: '展示接下来的 4 段学习。展开卡片，查看原因、方法和下次复习。', own: '建立我自己的学习路线 ↗', pricing: '查看拟议套餐 ↗', legacy: '继续体验原有的成绩分析引擎', legacyNote: '下方原有演示保留按测评和时间预算计算的逻辑及 n8n 对接。上方实时导航使用“薄弱程度 × 影响 × 紧迫度”，并安排具体学习日期。' },
  };
  let data = null, version = 0, controller = null, requestState = 'loading';
  let settings = { preset: 'alex1', urgency: 'none', sleep: 'off', feedback: 'none', completed: '0' };
  const locale = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  function render() {
    const lang = locale(), t = copy[lang];
    window.StudyGPSAudio?.stopAll();
    root.replaceChildren();
    root.append(node('p', 'eyebrow', t.eyebrow), node('h2', '', t.title), node('p', 'lab-intro', t.intro));
    const form = node('form', 'lab-controls'); form.setAttribute('aria-label', t.title);
    for (const [key, values] of Object.entries({ preset: ['alex1', 'alex2', 'sarah1'], urgency: ['none', 'today', 'soon', 'later'], sleep: ['off', 'rested', 'short_sleep', 'no_data'], feedback: ['none', 'units'] })) {
      const label = node('label', '', t[key]), select = node('select'); select.name = key; select.id = 'lab-' + key; label.htmlFor = select.id;
      for (const value of values) { const option = node('option', '', t[value]); option.value = value; select.append(option); }
      select.value = settings[key]; select.addEventListener('change', () => { settings[key] = select.value; settings.completed = '0'; form.querySelector('input').checked = false; void update(); });
      const field = node('div'); field.append(label, select); form.append(field);
    }
    const completeLabel = node('label', 'lab-complete'), complete = node('input'); complete.type = 'checkbox'; complete.checked = settings.completed === '1';
    complete.addEventListener('change', () => { settings.completed = complete.checked ? '1' : '0'; void update(); });
    completeLabel.append(complete, node('span', '', t.complete)); form.append(completeLabel); form.addEventListener('submit', event => event.preventDefault());
    root.append(form, node('p', 'lab-provenance', t.scope));
    const status = node('p', 'lab-status', t[requestState]); status.id = 'lab-status'; status.setAttribute('role', 'status'); root.append(status);
    const content = node('div'); content.id = 'lab-result'; root.append(content);
    const retry = node('button', 'outline-button', t.retry); retry.id = 'lab-retry'; retry.type = 'button'; retry.hidden = requestState !== 'error'; retry.addEventListener('click', () => void update()); root.append(retry);
    const links = node('div', 'lab-links');
    for (const [path, label] of [['/portal.html', t.own], ['/pricing.html', t.pricing]]) { const a = node('a', 'text-link', label); a.href = path + '?lang=' + lang; links.append(a); }
    root.append(links);
    const legacy = node('a', 'lab-legacy', t.legacy); legacy.href = '#workspace'; root.append(legacy, node('p', 'lab-provenance', t.legacyNote));
    if (data) renderResult();
    renderStatus();
  }
  function renderStatus() {
    document.getElementById('lab-status').textContent = copy[locale()][requestState];
    document.getElementById('lab-retry').hidden = requestState !== 'error';
    root.setAttribute('aria-busy', String(requestState === 'loading'));
  }
  function renderResult() {
    const t = copy[locale()], route = data.navigation, local = value => value?.[locale()] || value?.en || '';
    const result = document.getElementById('lab-result'); result.replaceChildren();
    const summary = node('div', 'lab-summary');
    for (const key of ['what', 'when', 'how']) { const item = node('div'); item.append(node('span', '', t[key]), node('strong', '', local(route.summary[key]))); summary.append(item); }
    result.append(summary);
    const metrics = node('p', 'lab-metrics', `${t.assessment}: ${data.overallScore}% · ${t.focus}: ${route.sessions.find(s => !s.completed && s.date)?.durationMinutes || '—'} ${t.minutes} · ${route.timezone}`); result.append(metrics);
    if (data.simulationClock) {
      const clock = data.simulationClock;
      result.append(node('p', 'lab-clock', `${t.clock}: ${clock.date} ${clock.time} · ${clock.timezone}`));
    }
    if (route.health?.scenario === 'short_sleep') result.append(node('p', 'lab-health-note', t.sleepNote));
    result.append(node('p', 'lab-provenance', t.show));
    if (window.StudyGPSNavigationUI) result.append(window.StudyGPSNavigationUI.render({ context: data.context, navigation: { ...route, sessions: route.sessions.filter(s => !s.completed).slice(0, 4) }, locale: locale(), readOnly: true, hideContext: true, compact: true }));
  }
  async function update() {
    const ownVersion = ++version; controller?.abort(); controller = new AbortController();
    window.StudyGPSAudio?.stopAll();
    requestState = 'loading'; renderStatus();
    try {
      const response = await fetch('/api/navigation-demo?' + new URLSearchParams(settings), { signal: controller.signal });
      if (!response.ok) throw new Error('Navigation unavailable');
      const payload = await response.json(); if (!Array.isArray(payload.navigation?.sessions) || !payload.navigation.summary || payload.source !== 'synthetic') throw new Error('Invalid route');
      if (ownVersion !== version) return;
      data = payload; renderResult(); requestState = 'ready';
    } catch (error) {
      if (ownVersion !== version || error.name === 'AbortError') return;
      data = null; document.getElementById('lab-result').replaceChildren(); requestState = 'error';
    } finally { if (ownVersion === version) renderStatus(); }
  }
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.addEventListener('pagehide', () => { ++version; controller?.abort(); window.StudyGPSAudio?.stopAll(); });
  render(); void update();
})();
