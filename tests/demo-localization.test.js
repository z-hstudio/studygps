'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { projectDemoView } = require('../server/demo-localization');
const { buildDemoRows } = require('../scripts/seed-classroom-demo');
const { buildNavigationDemoContexts } = require('../scripts/seed-navigation-demo');
const { buildNavigation } = require('../server/navigation');
const { createPortalService, recommendation } = require('../server/portal-service');
const dataset = require('../demo/classroom-students.json');

const options = { classroomId: 'class-locale', teacherId: 'teacher-locale', referenceDate: '2026-09-13T02:00:00.000Z', dataset };
const seeded = buildDemoRows(options).students;
const contexts = buildNavigationDemoContexts(options);
const teacher = { id: options.teacherId, name: '周老师 · Teacher Zhou', goal: '我的教学目标', role: 'teacher', isDemo: false };
const han = /[\u3400-\u9fff]/;

function viewFor(index, overrides = {}) {
  const student = { ...structuredClone(seeded[index]), role: 'student', timezone: 'Australia/Sydney' };
  const context = structuredClone(contexts[index].context);
  const view = {
    user: structuredClone(teacher), classroom: { id: options.classroomId, name: '热力学课堂' }, students: structuredClone(seeded),
    student, learning: student.learning, context, advice: student.advice.map(note => ({ ...note, teacherName: teacher.name })),
    ...overrides,
  };
  view.navigation = buildNavigation({ learning: view.learning, profile: view.student, context: view.context, advice: view.advice, now: options.referenceDate });
  view.recommendation = recommendation(view.learning, view.navigation);
  return view;
}
function textBranches(value, locale) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  if (Object.hasOwn(value, 'en') && Object.hasOwn(value, 'zh')) return textBranches(value[locale], locale);
  return Object.values(value).flatMap(child => textBranches(child, locale));
}
function routeState(navigation) {
  return { generatedAt: navigation.generatedAt, timezone: navigation.timezone, totals: navigation.totals,
    sessions: navigation.sessions.map(({ title, why, method, steps, deadline, ...state }) => ({ ...state,
      deadline: deadline ? { id: deadline.id, dueDate: deadline.dueDate, dueTime: deadline.dueTime } : null })) };
}

test('all six authored classroom records have English profile, planning fields and derived explanations', () => {
  for (let index = 0; index < seeded.length; index++) {
    const source = viewFor(index);
    const untouched = structuredClone(source);
    const en = projectDemoView(source, 'en');
    assert.equal(en.student.name, dataset.students[index].name.split(' · ')[0]);
    assert.equal(en.student.searchName, source.student.name);
    assert.equal(en.student.goal, dataset.students[index].goal.en);
    assert.equal(en.context.semesterGoal, dataset.students[index].goal.en);
    assert.doesNotMatch(JSON.stringify(en.context), han, `All expanded fields for ${en.student.name}`);
    en.advice.forEach((note, noteIndex) => assert.equal(note.message, dataset.students[index].advice[noteIndex].message.en));
    assert.doesNotMatch(textBranches(en.navigation, 'en').join('\n'), han, `Every task, requirement, warning and destination for ${en.student.name}`);
    assert.doesNotMatch(textBranches(en.recommendation, 'en').join('\n'), han);
    assert.deepEqual(routeState(en.navigation), routeState(source.navigation));
    assert.deepEqual(en.learning, source.learning);
    assert.deepEqual(en.user, source.user, 'Actual teacher identity and prose stay intact');
    assert.deepEqual(en.classroom, source.classroom);
    assert.deepEqual(source, untouched, 'Localization must not mutate the repository response');
  }
});

test('Chinese reload restores authored translations from unchanged stored values', () => {
  const source = viewFor(0);
  const en = projectDemoView(source, 'en');
  const zh = projectDemoView(source, 'zh');
  assert.equal(zh.student.name, '陈奕辰');
  assert.equal(zh.student.goal, dataset.students[0].goal.zh);
  assert.equal(zh.context.semesterGoal, dataset.students[0].goal.zh);
  assert.equal(zh.context.deadlines[0].title, '热力学应用作业');
  assert.equal(zh.context.interests, '自行车传动、机械装置与能量效率。');
  assert.equal(zh.advice[0].message, dataset.students[0].advice[0].message.zh);
  assert.doesNotMatch(textBranches(zh.navigation, 'zh').join('\n'), /Synthetic demo|Thermodynamics assignment|Bicycle drivetrains|Sketch the four cycle devices/);
  assert.deepEqual(routeState(en.navigation), routeState(zh.navigation));
  assert.deepEqual(projectDemoView(source, 'en'), en);
  assert.strictEqual(projectDemoView(source, null), source);
  assert.strictEqual(projectDemoView(source, 'fr'), source);
});

test('unfamiliar edited demo text and newly written teacher advice remain verbatim, including quoted seed text', () => {
  const source = viewFor(0);
  const originalGoal = source.context.semesterGoal;
  source.student.name = 'Alex 自己选择的名字';
  source.context.semesterGoal = `${originalGoal}\nTeacher and student revised this goal together. 自己的新目标。`;
  source.context.careerGoal = '我的新职业目标 · My own career goal';
  source.context.interests = '画画 drawing';
  source.context.feedback = '老师新写的反馈，需要保留。';
  source.context.deadlines[0].requirements = '自己填写的要求 · Preserve this';
  source.context.deadlines[0].title = '新作业 New assignment';
  source.advice.unshift({ id: 'real-note', focusTopic: 'rankine_cycle', message: `${source.advice[0].message}\nNew teacher comment 新建议`, createdAt: options.referenceDate, teacherName: teacher.name });
  source.navigation = buildNavigation({ learning: source.learning, profile: source.student, context: source.context, advice: source.advice, now: options.referenceDate });
  const en = projectDemoView(source, 'en');
  assert.equal(en.student.name, source.student.name);
  for (const key of ['semesterGoal', 'careerGoal', 'interests', 'feedback']) assert.equal(en.context[key], source.context[key]);
  assert.deepEqual(en.context.deadlines[0], source.context.deadlines[0]);
  assert.equal(en.advice[0].message, source.advice[0].message);
  assert.equal(en.advice[1].message, dataset.students[0].advice[0].message.en);
  const prose = textBranches(en.navigation, 'en').join('\n');
  assert.ok(prose.includes(source.context.semesterGoal), 'Do not partially translate a user-edited seed goal embedded in a reason');
  assert.ok(prose.includes(source.advice[0].message), 'Do not partially translate new teacher prose');
  assert.deepEqual(routeState(en.navigation), routeState(source.navigation));
});

test('real learner strings remain identical even when they exactly resemble authored demo content', () => {
  const source = viewFor(0);
  source.student.isDemo = false;
  source.students = [{ ...source.student }];
  for (const locale of ['en', 'zh']) assert.deepEqual(projectDemoView(source, locale), source);
});

test('own synthetic student view projects the same fields without touching account IDs or assessment history', () => {
  const source = viewFor(0);
  source.user = source.student;
  delete source.student;
  source.students = [];
  const en = projectDemoView(source, 'en');
  assert.equal(en.user.name, 'Alex Chen');
  assert.equal(en.user.id, source.user.id);
  assert.equal(en.context.semesterGoal, dataset.students[0].goal.en);
  assert.deepEqual(en.learning, source.learning);
  assert.deepEqual(routeState(en.navigation), routeState(source.navigation));
});

test('service calculates from original inputs and only projects the requested response locale', async () => {
  const source = viewFor(0);
  const original = structuredClone(source);
  const calls = [];
  const repository = {
    ensureProfile: async () => structuredClone(source.user),
    getClassroom: async () => structuredClone(source.classroom),
    listStudents: async () => structuredClone(source.students),
    getAssignedStudent: async () => structuredClone(source.student),
    getLearning: async () => structuredClone(source.learning),
    getAdvice: async () => structuredClone(source.advice),
    getNavigation: async () => ({ context: structuredClone(source.context), progress: {} }),
  };
  const service = createPortalService({ repository, now: () => new Date(options.referenceDate), navigationBuilder: args => {
    calls.push(structuredClone(args));
    return buildNavigation(args);
  } });
  const raw = await service.view(source.user, source.student.id);
  const en = await service.view(source.user, source.student.id, 'en');
  const zh = await service.view(source.user, source.student.id, 'zh');
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0], calls[2]);
  assert.equal(raw.student.name, dataset.students[0].name);
  assert.equal(en.student.name, 'Alex Chen');
  assert.equal(zh.student.name, '陈奕辰');
  assert.deepEqual(routeState(raw.navigation), routeState(en.navigation));
  assert.deepEqual(routeState(raw.navigation), routeState(zh.navigation));
  assert.deepEqual(raw.learning, en.learning);
  assert.deepEqual(source, original);
});
