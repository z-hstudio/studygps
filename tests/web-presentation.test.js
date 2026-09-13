'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const P = require('../web/presentation');
const units = require('../web/learning-content.json');
const signatures = require('../web/learning-sources.json');
const course = require('../engine/examples/course.json');
const { generateExamples } = require('../engine/scripts/demo');
const { generateStudyPlan, comparePlans } = require('../engine');
const root = path.resolve(__dirname,'..');
const examples = generateExamples();
const make = (index = 0,budget = 180,target = 80) => {
  const request = structuredClone(examples[index].request);
  request.input.available_minutes = budget; request.input.target_score = target;
  return generateStudyPlan(request.input,request.course,request.previous_plan);
};

test('locale dictionaries have identical complete keys, and every HTML translation resolves',() => {
  assert.deepEqual(Object.keys(P.strings.en).sort(),Object.keys(P.strings.zh).sort());
  const doc = new JSDOM(fs.readFileSync(path.join(root,'web/demo.html'),'utf8')).window.document;
  for (const attribute of ['data-i18n','data-i18n-aria','data-i18n-placeholder']) for (const el of doc.querySelectorAll('[' + attribute + ']')) {
    for (const lang of ['zh','en']) assert.ok(P.t(lang,el.getAttribute(attribute)),el.outerHTML);
  }
  for (const [key,text] of Object.entries(P.strings.en)) assert.doesNotMatch(text,/\p{Script=Han}/u,key);
});
test('both presentations preserve the canonical plan and its executable comparison',() => {
  const plan = make(2); const before = JSON.stringify(plan);
  for (const lang of ['zh','en']) {
    assert.ok(P.summary(lang,plan));
    for (const task of plan.priorities) assert.ok(P.reason(lang,plan,task));
    assert.ok(P.changes(lang,plan,examples[2].request.previous_plan).length);
  }
  assert.equal(JSON.stringify(plan),before);
  assert.equal(comparePlans(JSON.parse(before),plan).plan_changed,false);
});
test('explanations use current computed values, including modified target and partial duration',() => {
  const plan = make(0,30,90); const task = plan.priorities[0];
  assert.match(P.reason('en',plan,task),/90 reference target/);
  assert.match(P.reason('en',plan,task),/Allocated 30 min/);
  assert.match(P.reason('zh',plan,task),/部分练习/);
  assert.match(P.reason('zh',plan,task),/90/);
  const missing = structuredClone(examples[0].request); missing.input.topic_scores.entropy = null;
  const result = generateStudyPlan(missing.input,missing.course);
  assert.match(P.summary('zh',result),/不计算总分/);
  assert.equal(P.number('en',null),'—');
});
test('date-only localization pins the calendar day and numeric formatting is localized',() => {
  assert.equal(P.date('en','2026-09-20'),'20 Sept 2026');
  assert.equal(P.date('zh','2026-09-20'),'2026年9月20日');
  assert.equal(P.minutes('zh',180),'180 分钟');
  assert.equal(P.minutes('en',180),'180 min');
  assert.equal(P.date('zh',null),'未设置');
});
test('budget comparison captures removed and partial tasks for any learner without changing assessment baseline',() => {
  for (const index of [0,1,2]) for (const budget of [0,29,30,60,120,150,180,210,240]) {
    const reference = make(index); const current = make(index,budget);
    const diff = P.budgetDiff(reference,current);
    assert.equal(diff.reduce((sum,item) => sum + item.after,0),current.total_planned_minutes);
    assert.equal(diff.reduce((sum,item) => sum + item.before,0),reference.total_planned_minutes);
    assert.ok(current.total_planned_minutes <= budget);
  }
  assert.deepEqual(P.budgetDiff(make(),make(0,60)).map(x => [x.topic_id,x.state]),[['second_law','deferred'],['entropy','deferred'],['rankine_cycle','retained']]);
  assert.throws(() => P.budgetDiff(make(),make(1)),/scope mismatch/);
});
test('all empty-plan statuses, warnings and validation paths have useful zh/en explanations',() => {
  for (const lang of ['en','zh']) {
    for (const status of ['no_scores','target_met','no_study_time','insufficient_block_time']) assert.ok(P.summary(lang,{status,priorities:[]}));
    assert.match(P.warning(lang,{code:'TOPIC_BELOW_BLOCK_SIZE',topic_id:'entropy'}),/30/);
    assert.ok(P.errorIssue(lang,{path:'previousPlan.student_id'}));
    assert.ok(P.errorIssue(lang,{path:'input.available_minutes'}));
    assert.ok(P.errorIssue(lang,{path:'course.topics[0].importance'}));
  }
});
test('bilingual micro-exercises match all four source resources, preserve answers and explicit demo provenance',() => {
  assert.deepEqual(Object.keys(units),course.topics.map(t => t.topic_id));
  for (const topic of course.topics) {
    const local = units[topic.topic_id];
    assert.equal(local.en.correctIndex,local.zh.correctIndex);
    for (const lang of ['en','zh']) {
      const item = local[lang];
      assert.equal(item.steps.length,3); assert.equal(item.options.length,3);
      assert.ok(item.correctIndex >= 0 && item.correctIndex < 3);
      assert.ok(item.sourceNote.includes(topic.resource_id));
      assert.ok(fs.existsSync(path.join(root,topic.resource_ref)));
      assert.ok(item.feedback.length > 20);
      assert.equal(Object.keys(item).length,9);
    }
  }
});
test('retained task resource/activity/details changes are all explained in both languages',() => {
  const previous = make(); const next = structuredClone(previous);
  Object.assign(next.priorities[1],{resource_id:'new_resource',resource_ref:'new.md',activity:'New checked activity',topic_name:'New label'});
  Object.assign(next,comparePlans(previous,next));
  for (const lang of ['en','zh']) {
    const messages = P.changes(lang,next,previous).join(' ');
    for (const key of ['resourceChanged','activityChanged','detailChanged']) assert.ok(messages.includes(P.t(lang,key)));
  }
});

async function boot(options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root,'web/demo.html'),'utf8'),{url:'https://studygps.test/demo.html' + (options.query ?? '?lang=zh'),runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, calls = [], errors = [];
  w.structuredClone = structuredClone;
  w.matchMedia = () => ({matches:true});
  w.HTMLElement.prototype.scrollIntoView = function () {};
  // jsdom checks DOM state, not native dialog focus trapping or visual layout.
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.addEventListener('error',event => errors.push(event.error));
  w.fetch = async (url,init = {}) => {
    calls.push({url,payload:init.body ? JSON.parse(init.body) : null});
    if (options.fetch) {
      const custom = await options.fetch(url,init);
      if (custom) return custom;
    }
    if (url === '/api/study-plan') {
      const q = JSON.parse(init.body);
      return {ok:true,json:async () => generateStudyPlan(q.input,q.course,q.previous_plan)};
    }
    const basename = path.basename(url);
    const entry = examples.find(e => basename.startsWith(e.name + '.'));
    if (!entry) throw new Error('Unexpected test URL: ' + url);
    return {ok:true,json:async () => structuredClone(basename.endsWith('.request.json') ? entry.request : entry.output)};
  };
  w.eval(fs.readFileSync(path.join(root,'web/presentation.js'),'utf8'));
  w.StudyGPSLearning = {units:structuredClone(units),signatures:structuredClone(signatures)};
  w.eval(fs.readFileSync(path.join(root,'web/app.js'),'utf8'));
  const $ = id => w.document.getElementById(id);
  const settle = async (predicate = () => $('result-status').dataset.state === 'ready') => {
    for (let n = 0; n < 200; n += 1) { if (predicate()) { assert.equal(errors.length,0,errors[0]?.stack); return; } await new Promise(r => setTimeout(r,5)); }
    assert.fail('UI did not settle: ' + $('result-status').textContent + '; ' + errors.map(e => e.stack).join('\n'));
  };
  await settle(options.ready || undefined);
  const language = lang => w.document.querySelector('[data-locale="' + lang + '"]').click();
  const edit = (id,value) => { $(id).value = value; $(id).dispatchEvent(new w.Event('input',{bubbles:true})); };
  const preset = async value => { $('preset').value = value; $('preset').dispatchEvent(new w.Event('change')); await settle(); };
  return {dom,w,$,calls,errors,settle,language,edit,preset};
}

test('DOM: complete initial EN/ZH views and language switch leave downloaded JSON unchanged',async t => {
  const ui = await boot(); t.after(() => ui.dom.window.close());
  assert.equal(ui.$('next-topic').textContent,'朗肯循环');
  const json = ui.$('json-output').textContent, calls = ui.calls.length;
  ui.language('en');
  assert.equal(ui.w.document.documentElement.lang,'en-AU');
  assert.equal(ui.$('next-topic').textContent,'Rankine Cycle');
  assert.match(ui.$('student-meta').textContent,/20 Sept 2026/);
  assert.doesNotMatch(ui.$('tasks').textContent,/\p{Script=Han}/u);
  assert.equal(ui.$('json-output').textContent,json); assert.equal(ui.calls.length,calls);
  assert.equal(ui.w.localStorage.getItem('studygps.locale'),'en');
  assert.equal(ui.w.location.search,'?lang=en');
  ui.language('zh'); assert.equal(ui.$('json-output').textContent,json);
});
test('DOM: Sarah and reassessment show computed priorities and exact changes',async t => {
  const ui = await boot(); t.after(() => ui.dom.window.close());
  await ui.preset('sarah-assessment-1');
  assert.equal(ui.$('overall-score').textContent,'63.5'); assert.equal(ui.$('next-topic').textContent,'第一定律');
  await ui.preset('alex-assessment-2');
  assert.equal(ui.$('next-topic').textContent,'第二定律');
  assert.match(ui.$('changes-list').textContent,/熵: 60 分钟 → 90 分钟/);
  assert.match(ui.$('changes-list').textContent,/朗肯循环: 60 分钟 → 30 分钟/);
  assert.equal(ui.$('changes-section').hidden,false);
  ui.language('en'); assert.doesNotMatch(ui.$('changes-section').textContent,/\p{Script=Han}/u);
});
test('DOM: time lens changes only budget and does not overwrite the previous assessment',async t => {
  const ui = await boot({query:'?lang=en'}); t.after(() => ui.dom.window.close());
  await ui.preset('alex-assessment-2');
  ui.edit('target-score','90');
  ui.w.document.querySelector('[data-budget="60"]').click(); await ui.settle();
  assert.equal(ui.$('planned-minutes').textContent,'60');
  const requests = ui.calls.filter(c => c.url === '/api/study-plan').slice(-2);
  assert.deepEqual(requests.map(c => c.payload.input.available_minutes),[60,180]);
  assert.deepEqual(requests.map(c => c.payload.input.target_score),[90,90]);
  assert.ok(requests.every(c => c.payload.previous_plan.assessment_id === 'quiz_01'));
  assert.match(ui.$('lens-diff').textContent,/Deferred/);
  assert.match(ui.$('previous-note').textContent,/Assessment 1/);
});
test('DOM: editing, then switching language preserves stale state and blocks obsolete downloads',async t => {
  const ui = await boot(); t.after(() => ui.dom.window.close());
  const json = ui.$('json-output').textContent;
  ui.edit('target-score','95'); ui.language('en');
  assert.equal(ui.$('download-json').disabled,true);
  assert.equal(ui.$('result-status').dataset.state,'stale');
  assert.equal(ui.$('json-output').textContent,json);
  assert.match(ui.$('plan-summary').textContent,/180 min/);
  assert.doesNotMatch(ui.$('next-reason').textContent,/95/);
  ui.$('generate-button').click(); await ui.settle();
  assert.equal(JSON.parse(ui.$('json-output').textContent).target_score,95);
});
test('DOM: invalid values have localized errors; zero time and missing scores are valid states',async t => {
  const ui = await boot(); t.after(() => ui.dom.window.close());
  ui.edit('score-first-law','101'); ui.$('generate-button').click();
  assert.match(ui.$('error-issues').textContent,/第一定律/);
  assert.equal(ui.$('score-first-law').getAttribute('aria-invalid'),'true');
  ui.language('en'); assert.match(ui.$('error-issues').textContent,/First Law/); assert.doesNotMatch(ui.$('error-box').textContent,/\p{Script=Han}/u);
  ui.edit('score-first-law','85'); ui.edit('available-minutes','0'); ui.$('generate-button').click(); await ui.settle();
  assert.equal(ui.$('planned-minutes').textContent,'0');
  assert.equal(ui.$('start-learning').hidden,true);
  assert.match(ui.$('next-topic').textContent,/Make a little time/);
  for (const el of ui.w.document.querySelectorAll('[data-topic]')) ui.edit(el.id,'');
  ui.$('generate-button').click(); await ui.settle();
  assert.equal(ui.$('overall-score').textContent,'—');
  assert.match(ui.$('next-topic').textContent,/assessment data/);
  assert.match(ui.$('warnings-list').textContent,/never treated as zero/);
});
test('DOM: quizzes give correct and incorrect localized feedback without changing the plan',async t => {
  const ui = await boot(); t.after(() => ui.dom.window.close());
  const json = ui.$('json-output').textContent;
  ui.$('start-learning').click(); assert.equal(ui.$('learning-dialog').open,true);
  ui.w.document.querySelectorAll('.quiz-option')[0].click();
  assert.match(ui.$('quiz-feedback').textContent,/再看一下/);
  ui.w.document.querySelectorAll('.quiz-option')[1].click();
  assert.match(ui.$('quiz-feedback').textContent,/答对了/);
  assert.equal(ui.$('json-output').textContent,json);
  ui.$('close-learning').click(); ui.language('en'); ui.$('start-learning').click();
  assert.doesNotMatch(ui.$('learning-body').textContent,/\p{Script=Han}/u);
  ui.w.document.querySelectorAll('.quiz-option')[1].click();
  assert.match(ui.$('quiz-feedback').textContent,/That is right/);
  assert.equal(ui.$('json-output').textContent,json);
});
test('DOM: delayed obsolete calculations cannot overwrite a newer edit and request',async t => {
  let delay = false;
  const ui = await boot({fetch:async (url,init) => {
    if (url === '/api/study-plan' && delay && JSON.parse(init.body).input.target_score === 90) await new Promise(r => setTimeout(r,100));
  }});
  t.after(() => ui.dom.window.close()); delay = true;
  ui.edit('target-score','90'); ui.$('generate-button').click();
  ui.edit('target-score','75'); ui.$('generate-button').click(); await ui.settle();
  await new Promise(r => setTimeout(r,130));
  assert.equal(JSON.parse(ui.$('json-output').textContent).target_score,75);
  assert.equal(ui.$('download-json').disabled,false);
});
test('DOM: failed initial load has a working retry and honors language URL preference',async t => {
  let fail = true;
  const ui = await boot({query:'?lang=en',ready:() => !fail,fetch:async url => {
    if (fail && url.endsWith('alex-assessment-1.request.json')) { fail = false; return {ok:false,json:async () => ({error:{code:'UNAVAILABLE'}})}; }
  }});
  t.after(() => ui.dom.window.close());
  await ui.settle(() => ui.$('result-status').dataset.state === 'error');
  assert.equal(ui.$('error-box').hidden,false);
  assert.doesNotMatch(ui.$('error-box').textContent,/\p{Script=Han}/u);
  ui.$('retry-button').click(); await ui.settle();
  assert.equal(ui.$('next-topic').textContent,'Rankine Cycle');
});

test('DOM: initial calculation failure removes the loading placeholder and can be retried',async t => {
  let fail = true;
  const ui = await boot({ready:() => !fail,fetch:async url => {
    if (fail && url === '/api/study-plan') { fail = false; return {ok:false,json:async () => ({error:{code:'INTERNAL_ERROR'}})}; }
  }});
  t.after(() => ui.dom.window.close());
  await ui.settle(() => ui.$('result-status').dataset.state === 'error');
  assert.equal(ui.$('empty-state').hidden,true);
  assert.equal(ui.$('error-box').hidden,false);
  ui.$('retry-button').click(); await ui.settle();
  assert.equal(ui.$('next-topic').textContent,'朗肯循环');
});
test('DOM: changed resources use actual source instructions instead of stale micro-practice',async t => {
  const ui = await boot({fetch:async (url,init) => {
    if (url === '/api/study-plan') {
      const q = JSON.parse(init.body);
      q.course.topics.find(t => t.topic_id === 'rankine_cycle').activity = 'Read the revised, checked instructions.';
      q.course.topics.find(t => t.topic_id === 'rankine_cycle').resource_ref = 'https://example.com/new-resource';
      return {ok:true,json:async () => generateStudyPlan(q.input,q.course,q.previous_plan)};
    }
  }});
  t.after(() => ui.dom.window.close());
  const card = ui.w.document.querySelector('.task-card[data-topic-id="rankine_cycle"]');
  assert.match(card.textContent,/Read the revised, checked instructions/);
  assert.equal(card.querySelector('[data-open-learning]'),null);
  assert.equal(card.querySelector('a').href,'https://example.com/new-resource');
  assert.equal(ui.$('start-learning').hidden,true);
});
test('reassessment removals are not mislabeled as deferred budget work',() => {
  const q = structuredClone(examples[2].request);
  q.input.topic_scores.rankine_cycle = 80;
  const plan = generateStudyPlan(q.input,q.course,q.previous_plan);
  assert.ok(P.changes('en',plan,q.previous_plan).includes('Removed: Rankine Cycle'));
  assert.ok(P.changes('zh',plan,q.previous_plan).includes('移除: 朗肯循环'));
});
