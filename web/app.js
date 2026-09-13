'use strict';
const P = window.StudyGPSPresentation;
const L = window.StudyGPSLearning;
const $ = id => document.getElementById(id);
const scoreInputs = Array.from(document.querySelectorAll('[data-topic]'));
let savedLocale;
try {
  const current = localStorage.getItem('studygps-locale');
  const legacy = localStorage.getItem('studygps.locale');
  savedLocale = ['en','zh'].includes(current) ? current : ['en','zh'].includes(legacy) ? legacy : null;
} catch { /* Preference storage is optional. */ }
const queryLocale = new URLSearchParams(location.search).get('lang');
const state = {
  locale: ['en','zh'].includes(queryLocale) ? queryLocale : savedLocale || 'en',
  request:null, plan:null, renderedPlan:null, renderedRequest:null, reference:null,
  mode:'loading', busy:false, error:null, proofs:[], proofError:false, learning:null
};
let requestVersion = 0;
let activeController;
const tr = key => P.t(state.locale,key);
const fmt = value => P.number(state.locale,value);
const topic = (id,fallback) => P.topic(state.locale,id,fallback);
const mins = value => P.minutes(state.locale,value);
function node(tag,className,text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function beginRequest() {
  activeController?.abort();
  activeController = new AbortController();
  requestVersion += 1;
  return { version:requestVersion, signal:activeController.signal };
}
function applyLocale(locale, persist = false) {
  state.locale = locale;
  document.documentElement.lang = locale === 'en' ? 'en-AU' : 'zh-CN';
  document.title = tr('title');
  document.querySelector('meta[name="description"]').content = tr('description');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label',tr(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = tr(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll('[data-locale]')) el.setAttribute('aria-pressed',String(el.dataset.locale === locale));
  for (const link of document.querySelectorAll('a.brand')) link.href = '/?lang=' + locale;
  document.querySelector('[data-i18n="downloadHandoff"]').href = locale === 'en' ? '/downloads/HANDOFF.en.md' : '/downloads/HANDOFF.md';
  if (persist) {
    try { localStorage.setItem('studygps-locale',locale); localStorage.setItem('studygps.locale',locale); } catch { /* Private mode may disallow storage. */ }
    const url = new URL(location.href); url.searchParams.set('lang',locale);
    history.replaceState(null,'',url);
  }
  renderMetadata();
  if (state.renderedPlan) renderPlan(state.renderedPlan,state.renderedRequest,state.reference);
  renderProofs();
  if (state.learning) renderLearning();
  syncStatus();
}
function renderMetadata() {
  if (!state.request) { $('student-meta').textContent = tr(state.mode === 'error' ? 'configurationError' : 'loading'); return; }
  $('student-meta').textContent = tr('exam') + ' · ' + P.date(state.locale,state.request.input.exam_date);
  $('previous-note').hidden = !state.request.previous_plan;
  $('previous-note').textContent = tr('previousNote');
}
function syncStatus() {
  const mode = state.mode;
  const current = state.plan;
  $('result-status').dataset.state = mode;
  $('result-status').textContent = mode === 'ready' && current
    ? (state.locale === 'zh' ? '按当前输入生成 · ' + current.priorities.length + ' 项任务 · ' + mins(current.total_planned_minutes) : 'Generated from these inputs · ' + current.priorities.length + ' tasks · ' + mins(current.total_planned_minutes))
    : tr(({ loading:'loading', calculating:'calculating', stale:'stale', error:'errorStatus' })[mode] || 'loading');
  $('plan-status-label').textContent = mode === 'ready' && current ? tr(current.status) : tr(({ loading:'loadingShort', calculating:'computingShort', stale:'staleShort', error:'inputError' })[mode] || 'loadingShort');
  $('result-panel').classList.toggle('is-stale',mode !== 'ready');
  $('result-panel').setAttribute('aria-busy',String(state.busy));
  $('generate-button').disabled = state.busy || !state.request;
  $('generate-button').firstElementChild.textContent = tr(state.busy ? 'generating' : 'generate');
  $('download-json').disabled = !state.plan || mode !== 'ready';
  $('start-learning').disabled = mode !== 'ready';
  for (const el of document.querySelectorAll('[data-open-learning]')) el.disabled = mode !== 'ready';
  for (const el of document.querySelectorAll('[data-budget]')) {
    el.disabled = state.busy || !state.request;
    el.setAttribute('aria-pressed',String(mode === 'ready' && Number(el.dataset.budget) === current?.available_minutes));
    el.setAttribute('aria-label',mins(Number(el.dataset.budget)));
  }
  $('error-box').hidden = mode !== 'error';
  if (mode === 'error' && state.error) {
    const key = state.error.code === 'VALIDATION_ERROR' ? 'validationError' : state.error.code === 'RESPONSE_ERROR' ? 'responseError' : state.error instanceof TypeError || state.error.code === 'TIMEOUT' ? 'networkError' : 'serverError';
    $('error-message').textContent = tr(key);
    $('error-issues').replaceChildren(...(state.error.issues || []).map(issue => node('li','',P.errorIssue(state.locale,issue))));
  }
}
function markStale() {
  requestVersion += 1;
  activeController?.abort();
  state.mode = 'stale'; state.busy = false; state.plan = null; state.error = null;
  syncStatus();
}
function validationError() {
  const issues = [];
  const target = $('target-score'), budget = $('available-minutes');
  if (target.value.trim() === '' || !Number.isFinite(Number(target.value)) || Number(target.value) < 0 || Number(target.value) > 100 || target.validity.badInput) issues.push({path:'input.target_score'});
  if (budget.value.trim() === '' || !Number.isFinite(Number(budget.value)) || Number(budget.value) < 0 || Number(budget.value) > Number.MAX_SAFE_INTEGER || budget.validity.badInput) issues.push({path:'input.available_minutes'});
  for (const el of scoreInputs) if (el.validity.badInput || (el.value.trim() !== '' && (!Number.isFinite(Number(el.value)) || Number(el.value) < 0 || Number(el.value) > 100))) issues.push({path:'input.topic_scores.' + el.dataset.topic});
  for (const el of [target,budget,...scoreInputs]) el.removeAttribute('aria-invalid');
  for (const issue of issues) {
    const el = issue.path.endsWith('target_score') ? target : issue.path.endsWith('available_minutes') ? budget : scoreInputs.find(x => issue.path.endsWith(x.dataset.topic));
    el?.setAttribute('aria-invalid','true');
  }
  if (!issues.length) return null;
  return Object.assign(new Error('Invalid inputs'),{code:'VALIDATION_ERROR',issues});
}
function collectRequest() {
  const payload = structuredClone(state.request);
  payload.input.target_score = Number($('target-score').value);
  payload.input.available_minutes = Number($('available-minutes').value);
  payload.input.topic_scores = Object.fromEntries(scoreInputs.map(el => [el.dataset.topic,el.value.trim() === '' ? null : Number(el.value)]));
  return payload;
}
async function readResponse(response) {
  let body;
  try { body = await response.json(); } catch { throw Object.assign(new Error('Invalid JSON response'),{code:'RESPONSE_ERROR'}); }
  if (!response.ok) throw Object.assign(new Error('Request failed'),{code:body.error?.code,issues:body.error?.issues});
  return body;
}
async function postPlan(payload,signal) {
  const result = await requestJSON('/api/study-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});
  if (!Array.isArray(result?.priorities) || !Array.isArray(result?.topic_analysis) || !result.changes || !P.strings.en[result.status]) throw Object.assign(new Error('Incomplete plan'),{code:'RESPONSE_ERROR'});
  return result;
}
async function requestJSON(url,options = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener('abort',cancel,{once:true});
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; cancel(); },15000);
  try { return await readResponse(await fetch(url,{...options,signal:controller.signal})); }
  catch (error) { if (timedOut) throw Object.assign(new Error('Request timed out'),{code:'TIMEOUT'}); throw error; }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort',cancel); }
}
async function calculate() {
  if (!state.request) return;
  const error = validationError();
  if (error) { state.error = error; state.mode = 'error'; state.plan = null; state.busy = false; syncStatus(); $('error-box').focus(); return; }
  const {version,signal} = beginRequest();
  const payload = collectRequest();
  const referenceRequest = structuredClone(payload);
  referenceRequest.input.available_minutes = 180;
  // A separate, matched baseline changes only the budget, never the assessment comparison.
  state.mode = 'calculating'; state.busy = true; state.plan = null; state.error = null; syncStatus();
  try {
    const [plan,reference] = await Promise.all([
      postPlan(payload,signal),
      payload.input.available_minutes === 180 ? Promise.resolve(null) : postPlan(referenceRequest,signal)
    ]);
    if (version !== requestVersion) return;
    state.plan = plan; state.renderedPlan = plan; state.renderedRequest = payload; state.reference = reference || plan;
    state.mode = 'ready'; state.busy = false;
    renderPlan(plan,payload,state.reference);
    syncStatus();
  } catch (error) {
    if (version !== requestVersion || error.name === 'AbortError') return;
    state.error = error; state.mode = 'error'; state.busy = false; $('empty-state').hidden = true; syncStatus();
  }
}
async function loadPreset() {
  const preset = $('preset').value;
  const {version,signal} = beginRequest();
  state.request = null; state.plan = null; state.renderedPlan = null; state.renderedRequest = null; state.reference = null;
  state.mode = 'loading'; state.busy = true; state.error = null;
  $('assessment-fields').disabled = true; $('result-panel').hidden = true; $('empty-state').hidden = false; $('previous-note').hidden = true;
  renderMetadata(); syncStatus();
  try {
    const payload = await requestJSON('/examples/' + encodeURIComponent(preset) + '.request.json',{signal});
    if (version !== requestVersion) return;
    if (!payload.input || !payload.course || !Object.hasOwn(payload,'previous_plan')) throw Object.assign(new Error('Incomplete example'),{code:'RESPONSE_ERROR'});
    state.request = payload;
    $('target-score').value = payload.input.target_score;
    $('available-minutes').value = payload.input.available_minutes;
    for (const el of scoreInputs) el.value = payload.input.topic_scores?.[el.dataset.topic] ?? '';
    $('assessment-fields').disabled = false;
    renderMetadata();
    await calculate();
  } catch (error) {
    if (version !== requestVersion || error.name === 'AbortError') return;
    state.error = error; state.mode = 'error'; state.busy = false;
    $('empty-state').hidden = true; renderMetadata(); syncStatus();
  }
}
function learningFor(task) {
  const signature = L.signatures[task.topic_id];
  return signature && ['resource_id','resource_ref','activity'].every(key => signature[key] === task[key]) ? L.units[task.topic_id]?.[state.locale] : null;
}
function renderTask(task,plan) {
  const card = node('article','task-card');
  card.dataset.topicId = task.topic_id;
  const rank = node('span','task-rank',String(task.priority).padStart(2,'0'));
  const body = node('div','task-content');
  const heading = node('div','task-card-heading');
  const title = node('h4','',topic(task.topic_id,task.topic_name));
  const duration = node('strong','task-duration',mins(task.duration_minutes));
  heading.append(title,duration);
  const material = learningFor(task);
  const activity = node('p','task-activity',material ? material.title : task.activity);
  if (!material) activity.lang = 'en';
  const blocks = node('div','block-strip');
  blocks.setAttribute('aria-label',task.duration_minutes / 30 + ' ' + tr('blocks'));
  for (let i = 0; i < Math.min(20,Math.ceil(task.estimated_minutes / 30)); i += 1) blocks.append(node('span',i < task.duration_minutes / 30 ? 'block filled' : 'block'));
  const allocation = node('span','allocation-label',(task.is_partial ? tr('partial') : tr('complete')) + ' · ' + fmt(task.duration_minutes) + ' / ' + mins(task.estimated_minutes));
  const blockRow = node('div','block-row'); blockRow.append(blocks,allocation);
  const actions = node('div','task-footer');
  if (material) {
    const button = node('button','text-button',tr('microPractice'));
    button.type = 'button'; button.dataset.openLearning = task.topic_id;
    button.addEventListener('click',() => openLearning(task));
    actions.append(button);
  } else {
    const note = node('p','helper',tr('originalActivity'));
    actions.append(note);
    try {
      const url = new URL(task.resource_ref,location.origin + '/');
      if (['http:','https:'].includes(url.protocol)) {
        const link = node('a','text-button',tr('fullResource'));
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        actions.append(link);
      }
    } catch { /* Preserve the source in JSON, without creating an unsafe link. */ }
  }
  const reason = node('details','task-reason'); reason.append(node('summary','',tr('taskReason')),node('p','',P.reason(state.locale,plan,task)));
  body.append(heading,activity,blockRow,actions,reason); card.append(rank,body);
  return card;
}
function renderLens(plan,reference) {
  const diff = P.budgetDiff(reference,plan);
  const changed = diff.filter(x => x.before !== x.after);
  $('lens-summary').textContent = plan.available_minutes === 180 ? tr('lensBase') : !changed.length ? tr('lensSame') : tr('versus') + ' · ' + tr('currentBudget') + ' ' + mins(plan.available_minutes);
  $('lens-diff').replaceChildren(...(plan.available_minutes === 180 ? [] : diff).map(item => {
    const row = node('div','lens-row ' + item.state);
    row.append(node('span','',topic(item.topic_id)),node('span','',mins(item.before) + ' → ' + mins(item.after)),node('span','diff-state',tr(item.state)));
    return row;
  }));
}
function renderPlan(plan,payload,reference) {
  $('result-panel').hidden = false; $('empty-state').hidden = true;
  const first = plan.priorities[0];
  $('next-topic').textContent = first ? topic(first.topic_id,first.topic_name) : tr(plan.status + 'Title');
  $('next-reason').textContent = first
    ? (state.locale === 'zh' ? '先留出 ' + mins(first.duration_minutes) + '。' : 'Set aside ' + mins(first.duration_minutes) + ' first. ') + P.reason(state.locale,plan,first).split(state.locale === 'zh' ? '。' : '. ')[0] + (state.locale === 'zh' ? '。' : '.')
    : tr(plan.status + 'Body');
  $('start-learning').hidden = !first || !learningFor(first);
  $('overall-score').textContent = fmt(plan.overall_score);
  $('planned-minutes').textContent = fmt(plan.total_planned_minutes);
  $('unused-minutes').textContent = mins(plan.unused_minutes) + ' ' + tr('unused');
  $('task-count').textContent = plan.priorities.length + ' ' + tr('taskCount');
  $('tasks').replaceChildren(...(first ? plan.priorities.map(task => renderTask(task,plan)) : [node('p','no-tasks',tr('noTasks'))]));
  $('analysis-rows').replaceChildren(...plan.topic_analysis.map(a => {
    const row = node('tr');
    const label = node('th','',topic(a.topic_id,a.topic_name)); label.scope = 'row';
    row.append(label,...[a.observed_score === null ? tr('missing') : fmt(a.observed_score),fmt(a.target_gap),fmt(a.importance * 100) + '%',mins(a.estimated_minutes),P.number(state.locale,a.priority_score,4)].map(value => node('td','',value)));
    return row;
  }));
  renderLens(plan,reference);
  $('changes-section').hidden = !payload.previous_plan;
  $('change-kind').textContent = tr(plan.plan_changed ? 'updated' : 'unchanged');
  $('changes-list').replaceChildren(...P.changes(state.locale,plan,payload.previous_plan).map(text => node('li','',text)));
  $('route-transition').replaceChildren();
  if (payload.previous_plan) {
    for (const [key,task] of [['previous',payload.previous_plan.priorities[0]],['current',first]]) {
      const step = node('div','transition-step'); step.append(node('span','helper',tr(key)),node('strong','',task ? topic(task.topic_id,task.topic_name) : tr('noTasks'))); $('route-transition').append(step);
    }
  }
  $('warnings-section').hidden = plan.warnings.length === 0;
  $('warnings-list').replaceChildren(...[...new Set(plan.warnings.map(w => P.warning(state.locale,w)))].map(text => node('li','',text)));
  $('plan-summary').textContent = P.summary(state.locale,plan);
  $('json-output').textContent = JSON.stringify(plan,null,2);
}
async function loadProofs() {
  const names = ['alex-assessment-1','sarah-assessment-1','alex-assessment-2'];
  const results = await Promise.allSettled(names.map(async name => ({ name, plan:await requestJSON('/examples/' + name + '.output.json') })));
  state.proofs = results.filter(x => x.status === 'fulfilled').map(x => x.value);
  state.proofError = results.some(x => x.status === 'rejected');
  renderProofs();
}
function renderProofs() {
  const container = $('proof-cards'); container.replaceChildren();
  for (const {name,plan} of state.proofs) {
    const card = node('article','proof-card' + (name.endsWith('-2') ? ' reroute' : ''));
    const label = name === 'alex-assessment-1' ? 'alex1' : name === 'sarah-assessment-1' ? 'sarah1' : 'alex2';
    const top = node('div','section-head'); top.append(node('h3','',tr(label)),node('span','avatar',name.startsWith('alex') ? 'A' : 'S'));
    const total = node('p','proof-total',fmt(plan.overall_score)); total.append(node('small','',' / 100'));
    card.append(top,total,node('p','helper',tr('weightedScore')));
    const bars = node('div','score-bars');
    for (const a of plan.topic_analysis) {
      const row = node('div','score-bar-row');
      const meter = node('meter'); meter.min = 0; meter.max = 100; meter.value = a.observed_score ?? 0;
      meter.setAttribute('aria-label',topic(a.topic_id) + ' ' + fmt(a.observed_score));
      row.append(node('span','',topic(a.topic_id)),meter,node('span','',fmt(a.observed_score))); bars.append(row);
    }
    const next = node('p','proof-next',tr('startWith') + ' · ' + topic(plan.priorities[0]?.topic_id));
    const button = node('button','text-button',tr('showCase')); button.type = 'button';
    button.addEventListener('click',() => { $('preset').value = name; loadPreset(); $('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'}); $('preset').focus({preventScroll:true}); });
    card.append(bars,next,button); container.append(card);
  }
  if (state.proofError) container.append(node('p','helper',tr('proofUnavailable')));
}
function openLearning(task) {
  if (state.mode !== 'ready' || !learningFor(task)) return;
  state.learning = { task,answer:null };
  renderLearning(); $('learning-dialog').showModal();
}
function renderLearning() {
  const {task,answer} = state.learning;
  const material = learningFor(task);
  if (!material) return;
  const body = $('learning-body'); body.replaceChildren();
  const title = node('h2','',material.title); title.id = 'learning-title';
  body.append(node('p','eyebrow',material.kicker),title);
  const concept = node('section','learning-concept'); concept.append(node('h3','',tr('learnConcept')),node('p','',material.concept));
  const steps = node('section','learning-steps'); steps.append(node('h3','',tr('learnSteps')));
  const ol = node('ol'); for (const step of material.steps) ol.append(node('li','',step)); steps.append(ol);
  const quiz = node('section','learning-quiz'); quiz.append(node('h3','',tr('learnCheck')),node('p','quiz-question',material.question));
  const options = node('div','quiz-options');
  material.options.forEach((text,index) => {
    const button = node('button','quiz-option',String.fromCharCode(65 + index) + '  ' + text); button.type = 'button';
    button.setAttribute('aria-pressed',String(answer === index));
    if (answer !== null && index === material.correctIndex) button.classList.add('correct');
    if (answer === index && index !== material.correctIndex) button.classList.add('incorrect');
    button.addEventListener('click',() => { state.learning.answer = index; renderLearning(); $('quiz-feedback').focus(); });
    options.append(button);
  });
  quiz.append(options);
  if (answer !== null) {
    const feedback = node('div','quiz-feedback ' + (answer === material.correctIndex ? 'correct' : 'incorrect'));
    feedback.id = 'quiz-feedback'; feedback.tabIndex = -1; feedback.setAttribute('role','status');
    feedback.append(node('strong','',tr(answer === material.correctIndex ? 'correct' : 'incorrect')),node('p','',material.feedback));
    quiz.append(feedback);
  }
  quiz.append(node('p','helper',tr('quizNote')));
  const source = node('p','source-note',material.sourceNote);
  const sourceLink = node('a','text-button',tr('fullResource'));
  // Local demo signatures are checked before a link or activity is shown.
  sourceLink.href = '/' + task.resource_ref; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
  body.append(concept,steps,quiz,source,sourceLink);
}
for (const button of document.querySelectorAll('[data-locale]')) button.addEventListener('click',() => applyLocale(button.dataset.locale,true));
for (const button of document.querySelectorAll('[data-budget]')) button.addEventListener('click',() => { $('available-minutes').value = button.dataset.budget; calculate(); });
$('study-form').addEventListener('submit',event => { event.preventDefault(); calculate(); });
$('assessment-fields').addEventListener('input',markStale);
$('preset').addEventListener('change',loadPreset);
$('reset-button').addEventListener('click',loadPreset);
$('retry-button').addEventListener('click',() => state.request ? calculate() : loadPreset());
$('start-learning').addEventListener('click',() => { if (state.plan?.priorities[0]) openLearning(state.plan.priorities[0]); });
$('close-learning').addEventListener('click',() => $('learning-dialog').close());
$('learning-dialog').addEventListener('close',() => { state.learning = null; });
$('learning-dialog').addEventListener('click',event => { if (event.target === $('learning-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('download-json').addEventListener('click',() => {
  if (!state.plan || state.mode !== 'ready') return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.plan,null,2) + '\n'],{type:'application/json'}));
  const link = node('a'); link.href = url; link.download = 'studygps-' + state.plan.student_id + '-' + state.plan.assessment_id + '.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
applyLocale(state.locale);
loadPreset();
loadProofs();
