'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/portal.html'), 'utf8');
const navigationScript = fs.readFileSync(path.join(root, 'web/navigation-ui.js'), 'utf8');
const script = fs.readFileSync(path.join(root, 'web/portal.js'), 'utf8');
const examplePlan = JSON.parse(fs.readFileSync(path.join(root, 'engine/examples/alex-assessment-1.output.json'), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function user(id, role = 'student') {
  return { id, name: id, email: `${id}@example.test`, role, goal: 'Understand thermodynamic cycles', timezone: 'Australia/Sydney' };
}
function learning() {
  return {
    scores: { first_law: 85, second_law: 65, entropy: 35, rankine_cycle: 50 },
    targetScore: 80, minutes: 180, plan: structuredClone(examplePlan), completedTaskIds: [],
    history: [{ id: 'assessment-a', createdAt: '2026-09-12T00:00:00Z', overallScore: 63.5 }],
    updatedAt: '2026-09-12T00:00:00Z',
  };
}
function studentView(id = 'student-a') {
  return { user: user(id), classroom: null, students: [], learning: learning(), advice: [], recommendation: null };
}
function teacherView() {
  return {
    user: user('teacher-a', 'teacher'), classroom: { id: 'class-a', name: 'Thermodynamics', code: '01234567890123456789' },
    students: ['student-a', 'student-b'].map(id => ({ ...user(id), overallScore: 63.5, completedTasks: 0, totalTasks: 3, focusTopic: 'rankine_cycle', updatedAt: '2026-09-12T00:00:00Z' })),
    learning: null, advice: [], recommendation: null,
  };
}
function detailView(actor, studentId) {
  return {
    ...actor, student: { ...user(studentId), isDemo: actor.students.find(student => student.id === studentId)?.isDemo === true }, learning: learning(), advice: [],
    recommendation: {
      topicId: 'rankine_cycle', source: 'deterministic-study-engine',
      reason: { zh: '朗肯循环与目标存在差距。', en: 'Rankine cycle has a gap to target.' },
      action: { zh: '先标出四个装置，再计算效率。', en: 'Label the four devices, then calculate efficiency.' },
    },
  };
}
async function launch(t, options = {}) {
  const actor = options.view || studentView();
  const dom = new JSDOM(html, {
    url: options.url || 'https://studygps.example/portal.html?lang=en',
    runScripts: 'outside-only', pretendToBeVisual: true,
    // Navigation is intentionally unsupported by jsdom; production uses a full
    // reload on locale changes to reset private data and localize Clerk together.
    virtualConsole: new VirtualConsole(),
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const requests = [];
  const pendingUnmounts = [];
  const mounts = [];
  function mountManaged(node, text, kind) {
    const child = w.document.createElement('span');
    child.textContent = text;
    node.append(child);
    mounts.push({ node, child, kind });
  }
  function unmountManaged(node) {
    const mounted = mounts.findLast(entry => entry.node === node);
    if (!mounted) return;
    const cleanup = () => node.removeChild(mounted.child);
    if (options.delayedUnmount) pendingUnmounts.push(cleanup);
    else cleanup();
  }
  let identityListener;
  w.matchMedia = () => ({ matches: false });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (options.storageLocale) w.localStorage.setItem('studygps-locale', options.storageLocale);
  if (options.legacyLocale) w.localStorage.setItem('studygps.locale', options.legacyLocale);
  if (options.storageError) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  const clerk = {
    user: options.signedOut ? null : { id: actor.user.id },
    addListener(callback) { identityListener = callback; return () => {}; },
    mountSignIn(node, props) { mountManaged(node, 'TEST SIGN IN', 'signIn'); this.signInProps = props; },
    unmountSignIn(node) { unmountManaged(node); },
    mountSignUp(node, props) { mountManaged(node, 'TEST SIGN UP', 'signUp'); this.signUpProps = props; },
    unmountSignUp(node) { unmountManaged(node); },
    mountUserButton(node) { mountManaged(node, `ACCOUNT ${this.user.id}`, 'account'); },
    unmountUserButton(node) { unmountManaged(node); },
    async signOut() { this.user = null; identityListener({ user: null }); },
  };
  w.StudyGPSAuth = {
    async ready(locale) {
      if (options.readyError) throw options.readyError;
      clerk.loadedLocale = locale;
      return { clerk, config: { development: true } };
    },
    async request(url, settings = {}) {
      requests.push({ url, settings });
      if (options.request) return options.request(url, settings, clerk);
      if (settings.method === 'POST') return { ok: true };
      if (url.includes('studentId=')) return detailView(actor, new URL(url, w.location.origin).searchParams.get('studentId'));
      return actor;
    },
  };
  if (options.audio) w.StudyGPSAudio = options.audio;
  w.eval(navigationScript);
  w.eval(script);
  await tick();
  await tick();
  return {
    w, clerk, requests, mounts, document: w.document,
    flushUnmounts() { for (const cleanup of pendingUnmounts.splice(0)) cleanup(); },
    async identity(id) { clerk.user = id ? { id } : null; identityListener({ user: clerk.user }); await tick(); },
  };
}
function submit(w, form) {
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
}
function getButton(document, label) {
  const button = [...document.querySelectorAll('button')].find(node => node.textContent === label);
  assert.ok(button, `Expected button: ${label}`);
  return button;
}

test('portal requests the selected locale for roster and student detail', async t => {
  for (const locale of ['en', 'zh']) {
    const app = await launch(t, { view: teacherView(), url: `https://studygps.example/portal.html?lang=${locale}` });
    app.document.querySelector('[data-student-id]').click();
    await tick(); await tick();
    const reads = app.requests.filter(entry => entry.settings.method !== 'POST');
    assert.ok(reads.some(entry => entry.url.includes('studentId=')));
    assert.ok(reads.every(entry => new URL(entry.url, 'https://studygps.example').searchParams.get('lang') === locale));
  }
});

test('Alex presentation link selects only an authorised synthetic classroom student', async t => {
  const id = 'demo_studygps_0123456789abcdef0123_alex-chen';
  const view = teacherView();
  view.students.unshift({ ...user(id), name: 'Alex Chen', isDemo: true });
  const app = await launch(t, { view, url: 'https://studygps.example/portal.html?lang=en&demo=alex#student-detail' });
  assert.equal(app.document.querySelector('.student-card.selected')?.dataset.studentId, id);
  assert.ok(app.requests.some(entry => entry.url.includes('studentId=' + id)));

  for (const isolatedView of [teacherView(), studentView()]) {
    const isolated = await launch(t, { view: isolatedView, url: 'https://studygps.example/portal.html?lang=en&demo=alex' });
    assert.ok(!isolated.requests.some(entry => entry.url.includes('studentId=')));
  }
  view.students[0].isDemo = false;
  const real = await launch(t, { view, url: 'https://studygps.example/portal.html?lang=en&demo=alex' });
  assert.ok(!real.requests.some(entry => entry.url.includes('studentId=')));
});

test('Alex presentation destination survives sign-in and signup', async t => {
  const app = await launch(t, { signedOut: true, url: 'https://studygps.example/portal.html?lang=en&demo=alex#student-detail' });
  assert.equal(app.clerk.signInProps.forceRedirectUrl, '/portal.html?lang=en&demo=alex#student-detail');
  assert.equal(app.clerk.signInProps.signUpUrl, '/portal.html?lang=en&demo=alex&mode=signup');
});

test('student assessment uses the documented shape, preserves unassessed null, and cannot choose an owner', async t => {
  const app = await launch(t);
  const { document, w } = app;
  assert.match(document.querySelector('#private-content h1').textContent, /student-a/);
  assert.equal(document.querySelectorAll('.task-row').length, 3);
  document.getElementById('assessment-first_law').value = '';
  document.getElementById('assessment-entropy').value = '42.5';
  document.getElementById('assessment-minutes').value = '120';
  submit(w, document.getElementById('assessment-first_law').closest('form'));
  await tick(); await tick();
  const sent = JSON.parse(app.requests.find(entry => entry.settings.method === 'POST').settings.body);
  assert.deepEqual(sent, {
    action: 'save-assessment', scores: { first_law: null, second_law: 65, entropy: 42.5, rankine_cycle: 50 }, targetScore: 80, minutes: 120,
  });
  assert.equal(document.querySelectorAll('[data-student-id]').length, 0);
});

test('private API strings render literally and never become active markup', async t => {
  const view = studentView();
  view.user.name = '<img src=x onerror=alert(1)>';
  view.user.goal = '</textarea><script>alert(1)</script>';
  view.advice = [{ id: 'advice-a', message: '<iframe src=https://evil.test></iframe>', teacherName: '<svg onload=alert(1)>', focusTopic: null, createdAt: '2026-09-12T00:00:00Z' }];
  const { document } = await launch(t, { view });
  assert.match(document.querySelector('#private-content h1').textContent, /<img src=x/);
  assert.match(document.querySelector('.advice-message').textContent, /<iframe/);
  assert.equal(document.getElementById('profile-goal').value, view.user.goal);
  assert.equal(document.querySelectorAll('#private-content script, #private-content iframe, #private-content img, #private-content svg[onload]').length, 0);
});

test('sign-out aborts private requests and a late response cannot restore another account’s data', async t => {
  const pending = deferred();
  const app = await launch(t, { request: () => pending.promise });
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].settings.signal.aborted, false);
  await app.identity(null);
  assert.equal(app.requests[0].settings.signal.aborted, true);
  pending.resolve(studentView('private-student-a'));
  await tick(); await tick();
  assert.equal(app.document.getElementById('private-content').textContent, '');
  assert.equal(app.document.getElementById('private-content').hidden, true);
  assert.equal(app.document.getElementById('sign-in').textContent, 'TEST SIGN IN');
  assert.doesNotMatch(app.document.body.textContent, /private-student-a/);
});

test('switching accounts discards the old identity’s in-flight response and stores no learning data locally', async t => {
  const old = deferred();
  const app = await launch(t, {
    request: (_url, _options, clerk) => clerk.user.id === 'student-a' ? old.promise : studentView('student-b'),
  });
  await app.identity('student-b');
  await tick();
  assert.match(app.document.querySelector('#private-content h1').textContent, /student-b/);
  old.resolve(studentView('student-a'));
  await tick();
  assert.match(app.document.querySelector('#private-content h1').textContent, /student-b/);
  assert.doesNotMatch(app.document.getElementById('private-content').textContent, /student-a/);
  assert.equal(app.w.localStorage.length, 0);
});

test('teacher details are read-only for scores and tasks, while edited advice names the selected student', async t => {
  const app = await launch(t, { view: teacherView() });
  app.document.querySelector('[data-student-id="student-b"]').click();
  await tick(); await tick();
  const detail = app.document.getElementById('student-detail');
  assert.match(detail.textContent, /student-b/);
  assert.equal(detail.querySelectorAll('.task-row').length, 3);
  assert.equal(detail.querySelectorAll('input[type="checkbox"], input[type="number"]').length, 0);
  assert.match(detail.textContent, /Rule-generated/);
  getButton(app.document, 'Use this draft').click();
  const input = app.document.getElementById('teacher-advice-message');
  assert.match(input.value, /Label the four devices/);
  input.value = 'Try the four-device diagram, then bring one calculation to our next tutorial.';
  submit(app.w, input.closest('form'));
  await tick(); await tick();
  const sent = JSON.parse(app.requests.find(entry => entry.settings.method === 'POST').settings.body);
  assert.deepEqual(sent, { action: 'save-advice', studentId: 'student-b', message: input.value, focusTopic: 'rankine_cycle' });
});

test('out-of-order teacher detail reads cannot overwrite the currently selected student', async t => {
  const first = deferred();
  const actor = teacherView();
  const app = await launch(t, {
    view: actor,
    request: url => url.includes('student-a') ? first.promise : url.includes('student-b') ? detailView(actor, 'student-b') : actor,
  });
  app.document.querySelector('[data-student-id="student-a"]').click();
  app.document.querySelector('[data-student-id="student-b"]').click();
  await tick();
  first.resolve(detailView(actor, 'student-a'));
  await tick();
  assert.equal(app.document.getElementById('student-detail-heading').textContent, 'student-b');
  assert.equal(app.document.querySelector('.student-card.selected').dataset.studentId, 'student-b');
});

test('missing auth configuration shows an honest error and never fabricates a private workspace', async t => {
  const app = await launch(t, { readyError: Object.assign(new Error('Not configured'), { code: 'AUTH_NOT_CONFIGURED' }) });
  assert.match(app.document.getElementById('auth-status').textContent, /not configured/);
  assert.equal(app.document.getElementById('private-content').hidden, true);
  assert.equal(app.requests.length, 0);
  assert.equal(app.document.getElementById('auth-retry').hidden, false);
});

test('query locale wins over storage and localizes app metadata plus the Clerk initialization', async t => {
  const app = await launch(t, { url: 'https://studygps.example/portal.html?lang=zh', storageLocale: 'en' });
  assert.equal(app.document.documentElement.lang, 'zh-CN');
  assert.equal(app.document.title, 'StudyGPS · 学习驾驶舱');
  assert.equal(app.clerk.loadedLocale, 'zh');
  assert.match(app.document.getElementById('private-content').textContent, /保存测评并规划/);
  assert.equal(app.document.getElementById('demo-link').getAttribute('href'), '/demo.html?lang=zh');
});

test('locale switching clears private DOM before full-page navigation and persists only the language preference', async t => {
  const app = await launch(t);
  app.document.querySelector('[data-locale="zh"]').click();
  assert.equal(app.document.getElementById('private-content').textContent, '');
  assert.equal(app.w.localStorage.getItem('studygps-locale'), 'zh');
  assert.deepEqual(Object.keys(app.w.localStorage).sort(), ['studygps-locale', 'studygps.locale'].sort());
});

for (const locale of ['en', 'zh']) test('portal brand and navigation preserve ' + locale + ' when storage is unavailable', async t => {
  const app = await launch(t, { url: 'https://studygps.example/portal.html?lang=' + locale, storageError: true, signedOut: true });
  for (const link of app.document.querySelectorAll('a.brand, #workspace-link, #demo-link, #home-link, #auth-demo-link')) {
    assert.equal(new URL(link.href).searchParams.get('lang'), locale);
  }
});

test('registration mounts the dedicated Clerk sign-up component with a same-origin localized return', async t => {
  const app = await launch(t, { signedOut: true, url: 'https://studygps.example/portal.html?lang=zh&mode=signup' });
  assert.equal(app.document.getElementById('sign-in').textContent, 'TEST SIGN UP');
  assert.equal(app.clerk.signUpProps.routing, 'hash');
  assert.equal(app.clerk.signUpProps.forceRedirectUrl, '/portal.html?lang=zh');
  assert.equal(app.clerk.signUpProps.signInUrl, '/portal.html?lang=zh');
  assert.equal(app.requests.length, 0);
});

test('successful mutation followed by failed refresh does not claim the workspace is up to date', async t => {
  let reads = 0;
  const app = await launch(t, {
    request(_url, options) {
      if (options.method === 'POST') return { ok: true };
      if (reads++ === 0) return studentView();
      throw Object.assign(new Error('Unavailable'), { code: 'SERVICE_UNAVAILABLE' });
    },
  });
  submit(app.w, app.document.getElementById('profile-name').closest('form'));
  await tick(); await tick();
  assert.match(app.document.getElementById('notice').textContent, /saved, but the workspace could not refresh/);
  assert.doesNotMatch(app.document.getElementById('notice').textContent, /is up to date/);
});


test('delayed Clerk cleanup retains detached children and cannot corrupt a rapid account remount', async t => {
  const app = await launch(t, {
    delayedUnmount: true,
    request: (_url, _options, clerk) => studentView(clerk.user.id),
  });
  const firstAccount = app.document.getElementById('account-button');
  const firstChild = firstAccount.firstChild;
  await app.identity(null);
  assert.equal(firstAccount.isConnected, false);
  assert.equal(firstChild.parentNode, firstAccount);
  assert.equal(app.document.getElementById('account-button').textContent, '');
  assert.equal(app.document.getElementById('private-content').textContent, '');

  const oldSignIn = app.document.getElementById('sign-in');
  const oldSignInChild = oldSignIn.firstChild;
  await app.identity('student-b');
  const secondAccount = app.document.getElementById('account-button');
  assert.notEqual(firstAccount, secondAccount);
  assert.equal(oldSignIn.isConnected, false);
  assert.equal(oldSignInChild.parentNode, oldSignIn);
  assert.equal(secondAccount.textContent, 'ACCOUNT student-b');

  assert.doesNotThrow(() => app.flushUnmounts());
  assert.equal(firstAccount.childNodes.length, 0);
  assert.equal(oldSignIn.childNodes.length, 0);
  assert.equal(secondAccount.textContent, 'ACCOUNT student-b');
  assert.match(app.document.querySelector('#private-content h1').textContent, /student-b/);
});

test('normal sign-out and sign-in retries each retire their Clerk host before delayed cleanup', async t => {
  const app = await launch(t, { delayedUnmount: true });
  const accountHost = app.document.getElementById('account-button');
  app.document.getElementById('sign-out').click();
  await tick();
  assert.equal(accountHost.isConnected, false);
  assert.equal(app.document.getElementById('private-content').textContent, '');
  const signInHost = app.document.getElementById('sign-in');
  assert.equal(signInHost.textContent, 'TEST SIGN IN');

  app.document.getElementById('auth-retry').click();
  await tick(); await tick();
  const replacement = app.document.getElementById('sign-in');
  assert.notEqual(signInHost, replacement);
  assert.equal(signInHost.isConnected, false);
  assert.equal(signInHost.textContent, 'TEST SIGN IN');
  assert.equal(replacement.textContent, 'TEST SIGN IN');
  assert.doesNotThrow(() => app.flushUnmounts());
  assert.equal(replacement.textContent, 'TEST SIGN IN');
});

test('sign-up cleanup is isolated from a new mount while the old React tree is still pending', async t => {
  const app = await launch(t, {
    delayedUnmount: true, signedOut: true,
    url: 'https://studygps.example/portal.html?lang=en&mode=signup',
  });
  const signUpHost = app.document.getElementById('sign-in');
  await app.identity('student-a');
  assert.equal(signUpHost.isConnected, false);
  assert.equal(signUpHost.textContent, 'TEST SIGN UP');
  await app.identity(null);
  const nextSignUpHost = app.document.getElementById('sign-in');
  assert.notEqual(signUpHost, nextSignUpHost);
  assert.equal(nextSignUpHost.textContent, 'TEST SIGN UP');
  assert.doesNotThrow(() => app.flushUnmounts());
  assert.equal(signUpHost.childNodes.length, 0);
  assert.equal(nextSignUpHost.textContent, 'TEST SIGN UP');
});


test('synthetic students are explicitly marked in the roster and classroom totals are disclosed', async t => {
  const view = teacherView();
  view.students[0].isDemo = true;
  view.students[1].isDemo = false;
  const app = await launch(t, { view });
  const demoCard = app.document.querySelector('[data-student-id="student-a"]');
  const realCard = app.document.querySelector('[data-student-id="student-b"]');
  assert.equal(demoCard.querySelector('.demo-badge').textContent, 'Demo');
  assert.equal(realCard.querySelector('.demo-badge'), null);
  const disclosure = app.document.querySelector('.demo-disclosure');
  assert.match(disclosure.textContent, /synthetic records/);
  assert.match(disclosure.textContent, /include 1 of these records/);
  assert.match(disclosure.textContent, /not measured product outcomes/);
  assert.match(disclosure.textContent, /Real student records stay separate/);
  assert.equal(app.document.getElementById('auth-environment').hidden, false);

  demoCard.click();
  await tick();
  assert.equal(app.document.querySelector('#student-detail .demo-badge').textContent, 'Demo');
  realCard.click();
  await tick();
  assert.equal(app.document.querySelector('#student-detail .demo-badge'), null);
  assert.equal(app.document.getElementById('student-detail-heading').textContent, 'student-b');
});

test('demo markers and outcome disclosure are localized in Chinese without changing student data', async t => {
  const view = teacherView();
  view.students[0].isDemo = true;
  const app = await launch(t, { view, url: 'https://studygps.example/portal.html?lang=zh' });
  const card = app.document.querySelector('[data-student-id="student-a"]');
  assert.equal(card.querySelector('.demo-badge').textContent, '演示数据');
  assert.match(app.document.querySelector('.demo-disclosure').textContent, /包含 1 条演示记录/);
  assert.match(app.document.querySelector('.demo-disclosure').textContent, /成绩变化不代表产品实测成效/);
  card.click();
  await tick();
  assert.equal(app.document.querySelector('#student-detail .demo-badge').textContent, '演示数据');
  assert.equal(app.document.getElementById('student-detail-heading').textContent, 'student-a');
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 0);
});

test('real-only classrooms do not receive demo labels or a synthetic-data disclosure', async t => {
  const view = teacherView();
  view.students[0].name = 'Demo is part of my real name';
  view.students[0].isDemo = false;
  const app = await launch(t, { view });
  assert.equal(app.document.querySelector('.demo-disclosure'), null);
  assert.equal(app.document.querySelector('.demo-badge'), null);
  app.document.querySelector('[data-student-id="student-a"]').click();
  await tick();
  assert.equal(app.document.querySelector('#student-detail .demo-badge'), null);
  assert.equal(app.document.getElementById('auth-environment').hidden, false);
});

function planningContext() {
  return {
    semesterGoal: 'Explain a power cycle without reading my notes', careerGoal: 'Energy systems engineering', interests: 'Efficient power generation', preferredMethod: 'diagram', focusMinutes: 25,
    availability: { days: [1, 3, 5], startTime: '18:00', minutesPerDay: 90 },
    goalTopics: ['rankine_cycle'], careerTopics: ['first_law', 'rankine_cycle'],
    topicProgress: { first_law: 'confident', second_law: 'learning', entropy: 'not_started', rankine_cycle: 'learning' },
    feedback: 'My sign convention needs a check.', feedbackTopics: ['first_law'],
    deadlines: [{ id: 'exam-cycle', title: 'Cycle explanation assessment', kind: 'exam', dueDate: '2026-09-23', dueTime: '09:00', topicIds: ['rankine_cycle'], requirements: 'Draw the four devices and justify the energy balance.' }],
  };
}
function bilingual(en, zh) { return { en, zh }; }
function navigationFixture() {
  const base = {
    id: 'block-learn-rankine', topicId: 'rankine_cycle', title: bilingual('Draw the Rankine cycle', '画出朗肯循环'), kind: 'learn',
    why: [bilingual('Your assessment and upcoming exam both point to this topic.', '测评与即将到来的考试都需要这个知识点。')],
    date: '2026-09-14', time: '18:00', durationMinutes: 25, breakMinutes: 5, completed: false, completedAt: null, prerequisiteId: null, canComplete: true,
    deadline: { id: 'exam-cycle', title: 'Cycle explanation assessment', dueDate: '2026-09-23', dueTime: '09:00' },
    nextReviewDate: '2026-09-15', method: bilingual('Recall the devices, then check your diagram.', '先回忆装置，再核对图示。'),
    steps: [bilingual('Close your notes and draw the cycle.', '合上笔记画出循环。'), bilingual('Check omissions and explain one correction.', '检查遗漏并解释一处修正。')],
    resourceRef: 'engine/examples/resources/rankine-cycle.md',
  };
  return {
    summary: { what: bilingual('Rankine cycle first', '先学朗肯循环'), when: bilingual('Monday at 18:00', '周一 18:00'), how: bilingual('Recall, check, explain', '回忆、核对、解释') },
    sessions: [base, { ...base, id: 'block-review-rankine', kind: 'review', title: bilingual('Retrieve the cycle from memory', '凭记忆复习循环'), date: '2026-09-15', time: '18:00', nextReviewDate: '2026-09-18' }, { ...base, id: 'block-unscheduled', date: null, time: null, why: [bilingual('No available study window before this deadline.', '截止日期前没有可用学习时间。')], nextReviewDate: null }],
    warnings: [bilingual('One block could not fit before the deadline.', '有一个时段无法安排在截止日期前。')],
    signals: [{ label: bilingual('Reference target', '参考目标'), value: bilingual('80 points', '80 分') }],
    contextComplete: true, timezone: 'Asia/Shanghai', generatedAt: '2026-09-13T00:00:00Z', horizonDays: 14,
  };
}

test('English is the portal default while explicit and previously saved Chinese choices remain effective', async t => {
  for (const options of [
    { url: 'https://studygps.example/portal.html' },
    { url: 'https://studygps.example/portal.html?lang=invalid', storageLocale: 'invalid' },
    { url: 'https://studygps.example/portal.html', storageError: true },
  ]) {
    const app = await launch(t, options);
    assert.equal(app.document.documentElement.lang, 'en');
    assert.equal(app.clerk.loadedLocale, 'en');
  }
  for (const options of [
    { url: 'https://studygps.example/portal.html', storageLocale: 'zh' },
    { url: 'https://studygps.example/portal.html', legacyLocale: 'zh' },
    { url: 'https://studygps.example/portal.html?lang=zh', storageLocale: 'en' },
  ]) {
    const app = await launch(t, options);
    assert.equal(app.document.documentElement.lang, 'zh-CN');
  }
  const staticPage = new JSDOM(html);
  assert.equal(staticPage.window.document.documentElement.lang, 'en');
  assert.match(staticPage.window.document.getElementById('auth-title').textContent, /Your next step/);
  staticPage.window.close();
});

test('navigation presents all six planning questions, deadline and student timezone with separate review sessions', async t => {
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, { view });
  const navigation = app.document.querySelector('.navigation-space');
  for (const label of ['What to study', 'When to study', 'How to study', 'Why now', 'Time to set aside', 'Next review']) assert.match(navigation.textContent, new RegExp(label));
  assert.match(navigation.textContent, /Times shown in · Asia\/Shanghai/);
  assert.match(navigation.textContent, /25 min focus \+ 5 min break/);
  assert.match(navigation.textContent, /Cycle explanation assessment/);
  assert.match(navigation.textContent, /23 Sept/);
  assert.equal(navigation.querySelectorAll('[data-session-id]').length, 3);
  assert.match(navigation.querySelector('[data-session-id="block-review-rankine"]').textContent, /Review/);
  assert.match(navigation.querySelector('[data-session-id="block-unscheduled"]').textContent, /No available study window before this deadline/);
  assert.equal(navigation.querySelector('[data-session-id="block-unscheduled"] button'), null);
  assert.match(navigation.querySelector('.navigation-evidence').textContent, /product defaults/);
  assert.match(navigation.querySelector('.navigation-evidence a').href, /gsi\.berkeley\.edu/);
  assert.equal(app.document.querySelector('.navigation-course-reference').open, false);
});

test('completing a review sends only its session ID and refreshes the route without completing old course tasks', async t => {
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, {
    view,
    request(_url, settings) {
      if (settings.method === 'POST') {
        const payload = JSON.parse(settings.body);
        view.navigation.sessions.find(session => session.id === payload.sessionId).completed = payload.completed;
        return { ok: true };
      }
      return view;
    },
  });
  const review = app.document.querySelector('[data-session-id="block-review-rankine"]');
  review.querySelector('button').click();
  await tick(); await tick();
  const writes = app.requests.filter(request => request.settings.method === 'POST');
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].settings.body), { action: 'complete-navigation-session', sessionId: 'block-review-rankine', completed: true });
  assert.match(app.document.querySelector('[data-session-id="block-review-rankine"]').textContent, /Reopen this study block/);
  assert.equal(app.document.querySelectorAll('.navigation-course-reference input:checked').length, 0);
});

test('context editing preserves explicit topic mappings and saves deadline requirements with a server refresh', async t => {
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, { view });
  app.document.getElementById('nav-feedback').value = 'I need to explain each device without reading the answer.';
  app.document.getElementById('nav-focusMinutes').value = '30';
  app.document.getElementById('nav-deadline-exam-cycle-requirements').value = 'Explain each energy balance and state the sign convention.';
  submit(app.w, app.document.getElementById('navigation-context-form'));
  await tick(); await tick();
  const payload = JSON.parse(app.requests.find(request => request.settings.method === 'POST').settings.body);
  assert.equal(payload.action, 'save-navigation-context');
  assert.deepEqual(payload.context.goalTopics, ['rankine_cycle']);
  assert.deepEqual(payload.context.careerTopics, ['first_law', 'rankine_cycle']);
  assert.deepEqual(payload.context.availability, { days: [1, 3, 5], startTime: '18:00', minutesPerDay: 90 });
  assert.equal(payload.context.focusMinutes, 30);
  assert.equal(payload.context.deadlines[0].requirements, 'Explain each energy balance and state the sign convention.');
  assert.match(payload.context.feedback, /without reading the answer/);
  assert.equal(Object.hasOwn(payload, 'studentId'), false);
  assert.equal(app.requests.filter(request => !request.settings.method).length, 2);
});

test('deadline add/remove and cancel are reversible and do not persist a partial form', async t => {
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, { view });
  getButton(app.document, 'Add an exam or assignment').click();
  assert.equal(app.document.querySelectorAll('.navigation-deadline-editor').length, 2);
  const added = app.document.querySelectorAll('.navigation-deadline-editor')[1];
  added.querySelector('button').click();
  assert.equal(app.document.querySelectorAll('.navigation-deadline-editor').length, 1);
  app.document.getElementById('nav-semesterGoal').value = 'Unsaved goal';
  getButton(app.document, 'Cancel changes').click();
  assert.equal(app.document.getElementById('nav-semesterGoal').value, planningContext().semesterGoal);
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 0);
});

test('invalid evening window and missing deadline topic are caught without a persistence request', async t => {
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, { view });
  app.document.getElementById('nav-startTime').value = '21:00';
  app.document.getElementById('nav-minutesPerDay').value = '90';
  submit(app.w, app.document.getElementById('navigation-context-form'));
  assert.match(app.document.querySelector('.navigation-form-error').textContent, /ends after 22:00/);
  app.document.getElementById('nav-startTime').value = '18:00';
  app.document.querySelectorAll('[name="deadline-exam-cycle-topics"]').forEach(input => { input.checked = false; });
  submit(app.w, app.document.getElementById('navigation-context-form'));
  assert.match(app.document.querySelector('.navigation-form-error').textContent, /at least one topic/);
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 0);
});

test('teacher can read student context and navigation but receives no edit or session-completion controls', async t => {
  const actor = teacherView();
  const app = await launch(t, {
    view: actor,
    request(url) { return url.includes('studentId=') ? { ...detailView(actor, 'student-a'), context: planningContext(), navigation: navigationFixture() } : actor; },
  });
  app.document.querySelector('[data-student-id="student-a"]').click();
  await tick();
  const navigation = app.document.querySelector('#student-detail .navigation-space');
  assert.equal(app.document.querySelector('#student-detail .student-goal').textContent, planningContext().semesterGoal);
  assert.match(navigation.textContent, /Asia\/Shanghai/);
  assert.equal(navigation.querySelectorAll('.navigation-session button').length, 0);
  assert.equal(navigation.querySelectorAll('.navigation-context button').length, 0);
  assert.ok(navigation.querySelectorAll('.navigation-context input').length > 0);
  navigation.querySelectorAll('.navigation-context input, .navigation-context select, .navigation-context textarea').forEach(input => assert.equal(input.matches(':disabled'), true));
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 0);
});

function syntheticHealth(scenario = 'short_sleep') {
  const samples = Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-${String(index + 7).padStart(2, '0')}`, sleepHours: index === 6 ? 4.5 : 7.5, oxygenPercent: 98 }));
  return { source: 'synthetic', connected: false, scenario, samples, latest: samples.at(-1), adjustment: { focusCapMinutes: 20, todayBudgetFactor: 0.5 }, message: bilingual('This demonstration reduces only today’s schedule.', '这个演示只减少今天的安排。') };
}

test('synthetic health shows accessible seven-day values, limits claims and saves only the scenario selector', async t => {
  const view = { ...studentView(), context: { ...planningContext(), healthDemo: 'short_sleep' }, navigation: { ...navigationFixture(), health: syntheticHealth() } };
  const app = await launch(t, { view });
  const health = app.document.querySelector('.navigation-health');
  assert.match(health.textContent, /Synthetic · Not connected/);
  assert.match(health.textContent, /has not imported or shared any real Apple Health data/);
  assert.match(health.textContent, /98%/);
  assert.match(health.textContent, /4.5h/);
  assert.equal(health.querySelectorAll('.navigation-sleep-day').length, 7);
  assert.match(health.querySelector('.navigation-sleep-day:last-child').getAttribute('aria-label'), /4.5 h, 98%/);
  assert.match(health.textContent, /up to 20 min · 50% of today’s time budget/);
  assert.match(health.textContent, /Only today is adjusted in this route/);
  assert.match(health.textContent, /rolls forward each day until you switch it off/);
  assert.match(health.textContent, /Blood oxygen is displayed only/);
  assert.equal(health.querySelector('a[href="https://support.apple.com/en-gb/120358"]')?.target, '_blank');
  app.document.getElementById('nav-healthDemo').value = 'rested';
  submit(app.w, app.document.getElementById('navigation-context-form'));
  await tick(); await tick();
  const payload = JSON.parse(app.requests.find(request => request.settings.method === 'POST').settings.body);
  assert.equal(payload.context.healthDemo, 'rested');
  assert.equal(Object.hasOwn(payload.context, 'samples'), false);
  assert.equal(Object.hasOwn(payload.context, 'oxygenPercent'), false);
  assert.equal(app.w.localStorage.length, 0);
});

test('no-data health scenario and off do not invent readings or claim a connection', async t => {
  const health = { ...syntheticHealth('no_data'), latest: null, samples: [], adjustment: { focusCapMinutes: null, todayBudgetFactor: 1 } };
  const view = { ...studentView(), context: { ...planningContext(), healthDemo: 'no_data' }, navigation: { ...navigationFixture(), health } };
  const app = await launch(t, { view });
  const card = app.document.querySelector('.navigation-health');
  assert.match(card.textContent, /No simulated readings/);
  assert.equal(card.querySelector('.navigation-health-metrics'), null);
  assert.equal(card.querySelector('.navigation-health-adjustment'), null);
  assert.equal(card.querySelectorAll('button').length, 0);
  const off = await launch(t, { view: { ...view, context: { ...planningContext(), healthDemo: 'off' }, navigation: { ...view.navigation, health: { ...health, scenario: 'off' } } } });
  assert.equal(off.document.querySelector('.navigation-health'), null);
  assert.equal(off.document.getElementById('nav-healthDemo').value, 'off');
});

test('teacher sees clearly synthetic health only as read-only and Chinese values remain localized', async t => {
  const actor = teacherView();
  const app = await launch(t, {
    view: actor, url: 'https://studygps.example/portal.html?lang=zh',
    request(url) { return url.includes('studentId=') ? { ...detailView(actor, 'student-a'), context: { ...planningContext(), healthDemo: 'short_sleep' }, navigation: { ...navigationFixture(), health: syntheticHealth() } } : actor; },
  });
  app.document.querySelector('[data-student-id="student-a"]').click();
  await tick();
  const detail = app.document.getElementById('student-detail');
  assert.match(detail.querySelector('.navigation-health').textContent, /合成数据 · 尚未连接/);
  assert.match(detail.querySelector('.navigation-health').textContent, /4.5小时/);
  assert.match(detail.querySelector('.navigation-health').textContent, /血氧仅作展示，不决定学习强度/);
  assert.equal(detail.querySelector('#nav-healthDemo').matches(':disabled'), true);
  assert.equal(detail.querySelectorAll('.navigation-health button').length, 0);
});

test('review completion respects the prerequisite flag but an already completed block can be reopened', async t => {
  const route = navigationFixture();
  route.sessions[1].prerequisiteId = route.sessions[0].id;
  route.sessions[1].canComplete = false;
  const view = { ...studentView(), context: planningContext(), navigation: route };
  const app = await launch(t, { view });
  const review = app.document.querySelector('[data-session-id="block-review-rankine"]');
  assert.equal(review.querySelector('button').disabled, true);
  assert.match(review.textContent, /Complete the earlier block, then return on a later day/);
  review.querySelector('button').click();
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 0);
  const completed = await launch(t, { view: { ...view, navigation: { ...route, sessions: route.sessions.map(session => session.id === 'block-review-rankine' ? { ...session, completed: true } : session) } } });
  assert.equal(completed.document.querySelector('[data-session-id="block-review-rankine"] button').disabled, false);
});

function visibility(app, state) {
  Object.defineProperty(app.document, 'visibilityState', { configurable: true, value: state });
  app.document.dispatchEvent(new app.w.Event('visibilitychange'));
}

test('returning to a visible signed-in portal refreshes once without showing a loading replacement', async t => {
  let reads = 0;
  const app = await launch(t, {
    request() { const view = studentView(); view.user.name = ++reads === 1 ? 'Before return' : 'After return'; return view; },
  });
  visibility(app, 'hidden');
  assert.equal(app.requests.length, 1);
  visibility(app, 'visible');
  assert.equal(app.document.querySelectorAll('.detail-loading').length, 0);
  await tick(); await tick();
  assert.equal(app.requests.length, 2);
  assert.match(app.document.querySelector('#private-content h1').textContent, /After return/);
  visibility(app, 'visible');
  await tick();
  assert.equal(app.requests.length, 2);
});

test('returning while assessment, profile or planning context has unsaved input preserves the form', async t => {
  for (const id of ['assessment-first_law', 'profile-name', 'nav-feedback']) {
    const app = await launch(t, { view: { ...studentView(), context: planningContext(), navigation: navigationFixture() } });
    const input = app.document.getElementById(id);
    const draft = id === 'assessment-first_law' ? '74' : 'My unsaved text';
    input.value = draft;
    input.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    visibility(app, 'hidden'); visibility(app, 'visible');
    await tick();
    assert.equal(app.requests.length, 1, `${id} must prevent automatic refresh`);
    assert.equal(app.document.getElementById(id), input);
    assert.equal(input.value, draft);
  }
});

test('a teacher’s generated advice draft counts as unsaved even before they type into it', async t => {
  const app = await launch(t, { view: teacherView() });
  app.document.querySelector('[data-student-id="student-a"]').click();
  await tick();
  getButton(app.document, 'Use this draft').click();
  const message = app.document.getElementById('teacher-advice-message');
  const draft = message.value;
  assert.ok(draft.length > 0);
  const requestCount = app.requests.length;
  visibility(app, 'hidden'); visibility(app, 'visible');
  await tick();
  assert.equal(app.requests.length, requestCount);
  assert.equal(app.document.getElementById('teacher-advice-message'), message);
  assert.equal(message.value, draft);
});

test('structural deadline edits suppress automatic refresh until Cancel restores a clean form', async t => {
  const app = await launch(t, { view: { ...studentView(), context: planningContext(), navigation: navigationFixture() } });
  getButton(app.document, 'Add an exam or assignment').click();
  visibility(app, 'hidden'); visibility(app, 'visible');
  await tick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.document.querySelectorAll('.navigation-deadline-editor').length, 2);
  getButton(app.document, 'Cancel changes').click();
  visibility(app, 'hidden'); visibility(app, 'visible');
  await tick(); await tick();
  assert.equal(app.requests.length, 2);
  assert.equal(app.document.querySelectorAll('.navigation-deadline-editor').length, 1);
});

test('visibility changes never issue portal reads while signed out or while a request is in flight', async t => {
  const signedOut = await launch(t, { signedOut: true });
  visibility(signedOut, 'hidden'); visibility(signedOut, 'visible');
  await tick();
  assert.equal(signedOut.requests.length, 0);
  const pending = deferred();
  const busy = await launch(t, { request: () => pending.promise });
  visibility(busy, 'hidden'); visibility(busy, 'visible');
  await tick();
  assert.equal(busy.requests.length, 1);
  pending.resolve(studentView());
  await tick();
});

test('returning during a study-block write does not interrupt the mutation or create a competing refresh', async t => {
  const pending = deferred();
  const view = { ...studentView(), context: planningContext(), navigation: navigationFixture() };
  const app = await launch(t, { view, request: (_url, settings) => settings.method === 'POST' ? pending.promise : view });
  app.document.querySelector('[data-session-id="block-learn-rankine"] button').click();
  assert.equal(app.requests.length, 2);
  visibility(app, 'hidden'); visibility(app, 'visible');
  await tick();
  assert.equal(app.requests.length, 2);
  pending.resolve({ ok: true });
  await tick(); await tick();
  assert.equal(app.requests.length, 3);
  assert.equal(app.requests.filter(request => request.settings.method === 'POST').length, 1);
});


test('session priority explains Weakness × Impact × Urgency and preserves unknown scores in both languages', async t => {
  for (const locale of ['en', 'zh']) {
    const navigation = navigationFixture();
    navigation.sessions[0].priority = { weakness: 15, impact: 0.3, urgency: 3, score: 13.5, daysRemaining: 2 };
    navigation.sessions[1].priority = { weakness: null, impact: 0.3, urgency: 1, score: null, daysRemaining: null };
    const app = await launch(t, { view: { ...studentView(), context: planningContext(), navigation }, url: `https://studygps.example/portal.html?lang=${locale}` });
    const scored = app.document.querySelector('[data-session-id="block-learn-rankine"] .navigation-priority');
    const unknown = app.document.querySelector('[data-session-id="block-review-rankine"] .navigation-priority');
    assert.equal(scored.querySelector('strong').textContent, locale === 'en'
      ? '15 score gap × 30% course impact × 3 urgency = 13.5 priority'
      : '15 分差距 × 30% 课程权重 × 3 紧急系数 = 13.5 优先分');
    assert.equal(unknown.querySelector('strong').textContent, locale === 'en' ? 'Not scored — check understanding' : '尚无分数，先检查理解');
    assert.doesNotMatch(unknown.querySelector('strong').textContent, /0/);
    assert.match(scored.textContent, locale === 'en' ? /product planning rules/ : /产品规划规则/);
    assert.match(scored.textContent, locale === 'en' ? /Ties consider feedback, progress and goal links/ : /同分时会参考反馈、学习进度与目标关联/);
  }
});

test('teachers can inspect the same server priority calculation without gaining completion controls', async t => {
  const actor = teacherView();
  const navigation = navigationFixture();
  navigation.sessions[0].priority = { weakness: 15, impact: 0.3, urgency: 3, score: 13.5, daysRemaining: 2 };
  const app = await launch(t, { view: actor, request: url => url.includes('studentId=') ? { ...detailView(actor, 'student-a'), context: planningContext(), navigation } : actor });
  app.document.querySelector('[data-student-id="student-a"]').click();
  await tick();
  const session = app.document.querySelector('#student-detail [data-session-id="block-learn-rankine"]');
  assert.match(session.querySelector('.navigation-priority').textContent, /15 score gap × 30% course impact × 3 urgency = 13.5 priority/);
  assert.equal(session.querySelectorAll('button').length, 0);
});


test('navigation initially expands an actionable block instead of an earlier locked review', async t => {
  const navigation = navigationFixture();
  const actionable = navigation.sessions[0];
  const locked = { ...navigation.sessions[1], canComplete: false };
  navigation.sessions = [locked, actionable];
  const app = await launch(t, { view: { ...studentView(), context: planningContext(), navigation } });
  assert.equal(app.document.querySelector('[data-session-id="block-review-rankine"]').open, false);
  assert.equal(app.document.querySelector('[data-session-id="block-learn-rankine"]').open, true);
  const context = app.document.querySelector('.navigation-context > details');
  assert.equal(context.open, false);
  getButton(app.document, 'Adjust your goals, time & deadlines').click();
  assert.equal(context.open, true);
});

test('compact public rendering keeps sessions and audio while omitting account-context controls and duplicate summaries', async t => {
  const app = await launch(t);
  const audioTopics = [];
  app.w.StudyGPSAudio = { create(options) { audioTopics.push(options); return app.document.createElement('div'); }, stopAll() {} };
  const compact = app.w.StudyGPSNavigationUI.render({ locale: 'en', readOnly: true, compact: true, hideContext: true, context: planningContext(), navigation: { ...navigationFixture(), health: syntheticHealth() } });
  app.document.body.append(compact);
  assert.equal(compact.querySelector('.navigation-hero'), null);
  assert.equal(compact.querySelector('.navigation-context'), null);
  assert.equal(compact.querySelector('.navigation-health'), null);
  assert.equal(compact.querySelector('.navigation-signals'), null);
  assert.equal(compact.querySelector('.navigation-block-note'), null);
  assert.equal(compact.querySelectorAll('[data-session-id]').length, 3);
  assert.equal(audioTopics.length, 3);
  assert.equal(audioTopics[0].topicId, 'rankine_cycle');
  assert.match(audioTopics[0].fallbackText.en, /Close your notes/);
});

test('account clearing and replanning explicitly stop the audio service', async t => {
  let stops = 0;
  let document;
  const audio = { create() { return document.createElement('div'); }, stopAll() { stops++; } };
  // The first student view has no sessions, so no create call is needed before
  // launch returns its document. The stop integration still runs on every render.
  const app = await launch(t, { audio });
  document = app.document;
  const initialStops = stops;
  getButton(document, 'Refresh').click();
  await tick(); await tick();
  assert.ok(stops > initialStops);
  const refreshedStops = stops;
  await app.identity(null);
  assert.ok(stops > refreshedStops);
  assert.equal(document.getElementById('private-content').textContent, '');
});
