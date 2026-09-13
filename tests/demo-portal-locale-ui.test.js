'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { buildDemoRows } = require('../scripts/seed-classroom-demo');
const { buildNavigationDemoContexts } = require('../scripts/seed-navigation-demo');
const { createPortalService } = require('../server/portal-service');
const dataset = require('../demo/classroom-students.json');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('web/portal.html');
const navigationScript = read('web/navigation-ui.js');
const portalScript = read('web/portal.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
const han = /[\u3400-\u9fff]/;

async function launch(t, locale) {
  const teacher = { id: 'teacher-locale-browser', name: 'Demo Teacher', email: 'teacher@example.test', role: 'teacher', goal: 'Support the class', timezone: 'Australia/Sydney', isDemo: false };
  const options = { classroomId: 'class-locale-browser', teacherId: teacher.id, referenceDate: '2026-09-13T02:00:00.000Z', dataset };
  const rows = buildDemoRows(options).students;
  const contexts = buildNavigationDemoContexts(options);
  const originals = structuredClone({ rows, contexts });
  const classroom = { id: options.classroomId, name: 'Thermodynamics', code: '01234567890123456789' };
  const student = id => rows.find(row => row.id === id);
  const repository = {
    ensureProfile: async () => structuredClone(teacher),
    getClassroom: async () => structuredClone(classroom),
    listStudents: async () => rows.map(row => ({ id: row.id, name: row.name, goal: row.goal, email: row.email, isDemo: row.isDemo,
      overallScore: row.learning.plan.overall_score, completedTasks: row.learning.completedTaskIds.length, totalTasks: row.learning.plan.priorities.length,
      focusTopic: row.learning.plan.priorities[0]?.topic_id ?? null, updatedAt: row.learning.updatedAt })),
    getAssignedStudent: async (_, id) => student(id) ? { id, name: student(id).name, goal: student(id).goal, email: student(id).email, isDemo: true, timezone: teacher.timezone } : null,
    getLearning: async id => ({ ...structuredClone(student(id).learning), history: student(id).assessments.map(entry => ({ id: entry.id, createdAt: entry.createdAt, overallScore: entry.overallScore })).reverse() }),
    getAdvice: async id => student(id).advice.map(note => ({ ...structuredClone(note), teacherName: teacher.name })),
    getNavigation: async id => ({ context: structuredClone(contexts.find(row => row.studentId === id).context), progress: {} }),
  };
  const service = createPortalService({ repository, now: () => new Date(options.referenceDate) });
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: `https://studygps.example/portal.html?lang=${locale}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  t.after(() => dom.window.close());
  const w = dom.window;
  const requests = [];
  const responses = [];
  w.matchMedia = () => ({ matches: false });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.StudyGPSAuth = {
    ready: async () => ({ config: { development: true }, clerk: {
      user: { id: teacher.id }, addListener: () => () => {}, mountUserButton() {}, unmountUserButton() {},
    } }),
    request: async (path, settings = {}) => {
      requests.push({ path, settings });
      assert.notEqual(settings.method, 'POST', 'This presentation must never write student records');
      const url = new URL(path, w.location.origin);
      assert.equal(url.searchParams.get('lang'), locale, 'Both list and detail reads carry the selected language');
      const response = await service.view(teacher, url.searchParams.get('studentId'), url.searchParams.get('lang'));
      responses.push(response);
      return response;
    },
  };
  w.eval(navigationScript);
  w.eval(portalScript);
  await tick(); await tick();
  return { w, document: w.document, rows, contexts, originals, requests, responses, errors, service, teacher };
}

test('English teacher presentation renders all six seeded learners without mixed-language names, goals or task details', async t => {
  const app = await launch(t, 'en');
  for (let index = 0; index < app.rows.length; index++) {
    const row = app.rows[index];
    const card = app.document.querySelector(`[data-student-id="${row.id}"]`);
    assert.ok(card);
    assert.equal(card.querySelector('.student-name').textContent, dataset.students[index].name.split(' · ')[0]);
    assert.match(card.querySelector('.avatar').textContent, /^[A-Z]{2}$/);
    card.click();
    await tick(); await tick();
    app.document.querySelectorAll('#student-detail details').forEach(details => { details.open = true; });
    const detail = app.document.getElementById('student-detail');
    assert.equal(app.document.getElementById('student-detail-heading').textContent, dataset.students[index].name.split(' · ')[0]);
    assert.equal(detail.querySelector('.student-goal').textContent, dataset.students[index].goal.en);
    assert.ok(detail.textContent.includes(dataset.students[index].advice[0].message.en));
    assert.doesNotMatch(app.document.getElementById('private-content').textContent, han, `No Chinese body text for ${row.id}`);
    const fields = [...app.document.querySelectorAll('#private-content input, #private-content textarea, #private-content select')];
    assert.doesNotMatch(fields.map(field => field.value).join('\n'), han, `All expanded planning/profile fields for ${row.id}`);
    const response = app.responses.at(-1);
    const raw = await app.service.view(app.teacher, row.id);
    assert.deepEqual(response.learning, raw.learning);
    assert.deepEqual(response.navigation.sessions.map(session => [session.id, session.date, session.time, session.priority, session.completed]),
      raw.navigation.sessions.map(session => [session.id, session.date, session.time, session.priority, session.completed]));
  }
  assert.deepEqual({ rows: app.rows, contexts: app.contexts }, app.originals);
  assert.deepEqual(app.errors, []);
});

test('Chinese teacher presentation restores each authored name, goal, advice and planning field on a locale reload', async t => {
  const app = await launch(t, 'zh');
  for (let index = 0; index < app.rows.length; index++) {
    const row = app.rows[index];
    const card = app.document.querySelector(`[data-student-id="${row.id}"]`);
    assert.equal(card.querySelector('.student-name').textContent, dataset.students[index].name.split(' · ')[1]);
    assert.match(card.querySelector('.avatar').textContent, han);
    card.click();
    await tick(); await tick();
    app.document.querySelectorAll('#student-detail details').forEach(details => { details.open = true; });
    const detail = app.document.getElementById('student-detail');
    assert.equal(detail.querySelector('.student-goal').textContent, dataset.students[index].goal.zh);
    assert.ok(detail.textContent.includes(dataset.students[index].advice[0].message.zh));
    assert.doesNotMatch(detail.textContent, /\[Synthetic demo\]|Thermodynamics assignment|Bicycle drivetrains|Sustainable energy, heat pumps/);
    const fieldValues = [...detail.querySelectorAll('input,textarea')].map(field => field.value).join('\n');
    assert.ok(fieldValues.includes(dataset.students[index].goal.zh));
    assert.ok(fieldValues.includes('热力学应用作业'));
    assert.doesNotMatch(fieldValues, /\[Synthetic demo\]|Thermodynamics assignment|Bicycle drivetrains/);
  }
  assert.deepEqual({ rows: app.rows, contexts: app.contexts }, app.originals);
  assert.deepEqual(app.errors, []);
});
