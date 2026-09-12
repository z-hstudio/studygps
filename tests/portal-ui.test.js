'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/portal.html'), 'utf8');
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
    ...actor, student: user(studentId), learning: learning(), advice: [],
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
  assert.deepEqual(Object.keys(app.w.localStorage), ['studygps-locale']);
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
