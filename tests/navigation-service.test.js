'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalService, validateNavigationContext, recommendation } = require('../server/portal-service');
const { memoryRepository, actors, assessment } = require('./portal-helpers');
const { buildNavigationDemoContexts, seedNavigationDemo } = require('../scripts/seed-navigation-demo');
const { studentA, studentB, teacherA, teacherB } = actors;

function context(overrides = {}) {
  return {
    semesterGoal: 'Explain thermodynamics independently', careerGoal: 'Energy engineering', interests: 'Bicycles and sustainable energy',
    preferredMethod: 'practice', focusMinutes: 25,
    availability: { days: [1, 3, 5], startTime: '18:00', minutesPerDay: 90 },
    goalTopics: ['first_law'], careerTopics: ['second_law', 'rankine_cycle'],
    topicProgress: { first_law: 'learning', second_law: 'not_started', entropy: 'not_started', rankine_cycle: 'confident' },
    feedback: 'I struggle to choose the correct signs.', feedbackTopics: ['first_law'],
    deadlines: [{ id: 'thermodynamics-exam', title: 'Thermodynamics exam', kind: 'exam', dueDate: '2026-09-25', dueTime: '09:00', topicIds: ['first_law', 'second_law'], requirements: 'Show units and explain assumptions.' }],
    ...overrides,
  };
}
function fakeNavigation({ learning, profile, context: preferences, progress, advice, now }) {
  const sessions = !learning || !preferences ? [] : learning.plan.priorities.filter((task) => !learning.completedTaskIds.includes(task.task_id)).map((task) => {
    const id = `nav:${learning.plan.assessment_id}:${task.topic_id}:learn`;
    return { id, durationMinutes: progress[id]?.completed ? progress[id].durationMinutes : preferences.focusMinutes, completed: progress[id]?.completed ?? false, completedAt: progress[id]?.completedAt ?? null };
  });
  return { sessions, owner: profile.id, timezone: profile.timezone, goal: preferences?.semesterGoal ?? null, teacherNotes: advice.length, generatedAt: new Date(now).toISOString() };
}
async function setup() {
  const repository = memoryRepository();
  let instant = new Date('2026-09-13T00:00:00.000Z');
  const service = createPortalService({ repository, navigationBuilder: fakeNavigation, now: () => instant });
  for (const actor of Object.values(actors)) await service.view(actor);
  for (const teacher of [teacherA, teacherB]) await service.mutate(teacher, { action: 'create-classroom', name: teacher.name });
  for (const [student, teacher] of [[studentA, teacherA], [studentB, teacherB]]) {
    await service.mutate(student, { action: 'join-classroom', code: (await service.view(teacher)).classroom.code });
    await service.mutate(student, assessment());
  }
  repository.reads.length = 0;
  return { repository, service, setNow: (value) => { instant = new Date(value); } };
}

test('context validation normalizes allowed fields and preserves empty optional goals and real leap dates', () => {
  const input = context({ semesterGoal: '  学会独立解题  ', careerGoal: '', interests: '', goalTopics: [], careerTopics: [], feedback: '', feedbackTopics: [], deadlines: [{ id: 'a1f6e758-ec89-4e26-aab4-40f0ea594970', title: 'Leap day', kind: 'assignment', dueDate: '2028-02-29', dueTime: '23:59', topicIds: ['entropy'], requirements: '' }] });
  const original = structuredClone(input);
  const validated = validateNavigationContext(input);
  assert.equal(validated.semesterGoal, '学会独立解题');
  assert.equal(validated.deadlines[0].dueDate, '2028-02-29');
  assert.deepEqual(input, original);
});

test('unknown or missing context fields and nested role/owner injections are rejected', () => {
  for (const alter of [
    (v) => { v.role = 'teacher'; }, (v) => { v.studentId = studentB.id; }, (v) => { v.progress = {}; },
    (v) => { delete v.feedback; }, (v) => { v.availability.owner = studentB.id; },
    (v) => { v.topicProgress.other = 'confident'; }, (v) => { delete v.topicProgress.first_law; },
    (v) => { v.deadlines[0].teacherId = teacherB.id; },
  ]) { const value = context(); alter(value); assert.throws(() => validateNavigationContext(value), { status: 400 }); }
});

test('focus, daily availability, ISO weekdays and awake-hour bounds reject invalid values', () => {
  for (const focusMinutes of [0, 14, 16, 61, 25.5, NaN, Infinity, '25']) assert.throws(() => validateNavigationContext(context({ focusMinutes })), { status: 400 });
  for (const minutesPerDay of [0, 29, 31, 241, 60.5, Infinity, '60']) assert.throws(() => validateNavigationContext(context({ availability: { days: [1], startTime: '18:00', minutesPerDay } })), { status: 400 });
  for (const days of [[0], [8], [1, 1], ['1'], [1.5], null]) assert.throws(() => validateNavigationContext(context({ availability: { days, startTime: '18:00', minutesPerDay: 60 } })), { status: 400 });
  for (const startTime of ['5:00', '05:59', '21:31', '23:00', '24:00', '12:60', '18:00Z']) assert.throws(() => validateNavigationContext(context({ availability: { days: [1], startTime, minutesPerDay: 30 } })), { status: 400 });
  assert.doesNotThrow(() => validateNavigationContext(context({ availability: { days: [1, 7], startTime: '21:30', minutesPerDay: 30 } })));
  assert.doesNotThrow(() => validateNavigationContext(context({ focusMinutes: 60, availability: { days: [1], startTime: '06:00', minutesPerDay: 240 } })));
});

test('deadline date, time, identifiers, counts and topics are strictly validated', () => {
  for (const dueDate of ['0000-01-01', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-09-00', '2026-9-1', '2026-09-12T10:00:00Z']) {
    const value = context(); value.deadlines[0].dueDate = dueDate; assert.throws(() => validateNavigationContext(value), { status: 400 });
  }
  for (const alter of [
    (d) => { d.id = '../unsafe'; }, (d) => { d.id = 'x'.repeat(81); }, (d) => { d.id = '__proto__'; },
    (d) => { d.kind = 'calendar'; }, (d) => { d.title = ''; }, (d) => { d.title = 'x'.repeat(161); },
    (d) => { d.dueTime = '24:00'; }, (d) => { d.dueTime = '8:30'; }, (d) => { d.topicIds = []; },
    (d) => { d.topicIds = ['entropy', 'entropy']; }, (d) => { d.topicIds = ['unknown']; },
    (d) => { d.requirements = 'x'.repeat(1001); },
  ]) { const value = context(); alter(value.deadlines[0]); assert.throws(() => validateNavigationContext(value), { status: 400 }); }
  const duplicate = context(); duplicate.deadlines.push(structuredClone(duplicate.deadlines[0]));
  assert.throws(() => validateNavigationContext(duplicate), { status: 400 });
  const tooMany = context(); tooMany.deadlines = Array.from({ length: 13 }, (_, index) => ({ ...tooMany.deadlines[0], id: `exam-${index}` }));
  assert.throws(() => validateNavigationContext(tooMany), { status: 400 });
});

test('all free text and topic/method selections have bounded allowlisted values', () => {
  for (const [field, max] of [['semesterGoal', 500], ['careerGoal', 300], ['interests', 300], ['feedback', 1000]]) {
    assert.throws(() => validateNavigationContext(context({ [field]: '中'.repeat(max + 1) })), { status: 400 });
    assert.throws(() => validateNavigationContext(context({ [field]: {} })), { status: 400 });
  }
  for (const field of ['goalTopics', 'careerTopics', 'feedbackTopics']) {
    assert.throws(() => validateNavigationContext(context({ [field]: ['first_law', 'first_law'] })), { status: 400 });
    assert.throws(() => validateNavigationContext(context({ [field]: ['unknown'] })), { status: 400 });
  }
  assert.throws(() => validateNavigationContext(context({ preferredMethod: 'automatic-mastering' })), { status: 400 });
  const invalid = context(); invalid.topicProgress.first_law = 'mastered';
  assert.throws(() => validateNavigationContext(invalid), { status: 400 });
});

test('optional health simulation defaults off and accepts only the four synthetic scenarios', () => {
  assert.equal(validateNavigationContext(context()).healthDemo, 'off');
  for (const healthDemo of ['off', 'rested', 'short_sleep', 'no_data']) assert.equal(validateNavigationContext(context({ healthDemo })).healthDemo, healthDemo);
  for (const healthDemo of ['real_healthkit', 'low_oxygen', null, 95, { spo2: 95 }]) assert.throws(() => validateNavigationContext(context({ healthDemo })), { status: 400 });
  for (const extra of [{ oxygenSaturation: 94 }, { spo2: 94 }, { heartRate: 80 }, { sleepHours: 4 }, { healthKit: { authorized: true } }]) assert.throws(() => validateNavigationContext(context(extra)), { status: 400 });
});

test('students save only their own context and teachers read only assigned learners with the learner timezone', async () => {
  const { service } = await setup();
  await service.mutate(studentA, { action: 'save-profile', name: 'Learner A', goal: 'A goal', timezone: 'Asia/Shanghai' });
  await service.mutate(studentA, { action: 'save-navigation-context', context: context() });
  await service.mutate(studentB, { action: 'save-navigation-context', context: context({ semesterGoal: 'Private B goal' }) });
  const own = await service.view(studentA);
  const teacher = await service.view(teacherA, studentA.id);
  assert.equal(own.context.semesterGoal, context().semesterGoal);
  assert.equal(teacher.navigation.owner, studentA.id);
  assert.equal(teacher.navigation.timezone, 'Asia/Shanghai');
  assert.equal(teacher.user.id, teacherA.id);
  assert.equal(JSON.stringify(teacher).includes('Private B goal'), false);
  assert.equal(Object.hasOwn(own, 'progress'), false);
  assert.equal((await service.view(teacherA)).context, null);
  assert.equal((await service.view(teacherA)).navigation, null);
  await assert.rejects(service.view(teacherA, studentB.id), { status: 404 });
  await assert.rejects(service.view(studentA, studentB.id), { status: 403 });
});

test('navigation reads wait for teacher assignment authorization and never run on a rejected target', async () => {
  const { service, repository } = await setup();
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  repository.getAssignedStudent = async () => { await barrier; return null; };
  const attempt = service.view(teacherA, studentB.id);
  const rejected = assert.rejects(attempt, { status: 404 });
  await Promise.resolve();
  assert.equal(repository.reads.some(([kind]) => kind === 'navigation'), false);
  release(); await rejected;
  assert.equal(repository.reads.some(([kind]) => kind === 'navigation'), false);
});

test('navigation mutations deny teachers and client-selected owners, roles, timestamps and progress maps', async () => {
  const { service, repository } = await setup();
  await assert.rejects(service.mutate(teacherA, { action: 'save-navigation-context', context: context() }), { status: 403 });
  await assert.rejects(service.mutate(teacherA, { action: 'complete-navigation-session', sessionId: 'fake', completed: true }), { status: 403 });
  for (const extra of [{ studentId: studentB.id }, { role: 'teacher' }, { progress: {} }]) await assert.rejects(service.mutate(studentA, { action: 'save-navigation-context', context: context(), ...extra }), { status: 400 });
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'fake', completed: true, completedAt: '2000-01-01' }), { status: 400 });
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'fake', completed: true, durationMinutes: 1 }), { status: 400 });
  assert.equal(repository.navigation.size, 0);
});

test('completion is owner-scoped, idempotent, uses server time, and remains separate from core tasks', async () => {
  const { service, repository, setNow } = await setup();
  for (const student of [studentA, studentB]) await service.mutate(student, { action: 'save-navigation-context', context: context() });
  const before = (await service.view(studentA)).learning;
  const sessionId = (await service.view(studentA)).navigation.sessions[0].id;
  await assert.rejects(service.mutate(studentB, { action: 'complete-navigation-session', sessionId, completed: true }), { status: 404 });
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId, completed: true });
  assert.deepEqual(repository.navigation.get(studentA.id).progress[sessionId], { completed: true, completedAt: '2026-09-13T00:00:00.000Z', durationMinutes: 25 });
  setNow('2026-09-13T04:00:00.000Z');
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId, completed: true });
  assert.equal(repository.navigation.get(studentA.id).progress[sessionId].completedAt, '2026-09-13T00:00:00.000Z');
  assert.deepEqual((await service.view(studentA)).learning, before);
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId, completed: false });
  assert.deepEqual(repository.navigation.get(studentA.id).progress[sessionId], { completed: false, completedAt: null, durationMinutes: 25 });
});

test('saving context retains progress and concurrent different-session updates retain both records', async () => {
  const { service, repository } = await setup();
  await service.mutate(studentA, { action: 'save-navigation-context', context: context() });
  const sessions = (await service.view(studentA)).navigation.sessions;
  assert.ok(sessions.length >= 2);
  await Promise.all(sessions.slice(0, 2).map((session) => service.mutate(studentA, { action: 'complete-navigation-session', sessionId: session.id, completed: true })));
  await service.mutate(studentA, { action: 'save-navigation-context', context: context({ feedback: 'A new reflection', focusMinutes: 50 }) });
  const stored = repository.navigation.get(studentA.id);
  assert.equal(stored.context.feedback, 'A new reflection');
  assert.ok(sessions.slice(0, 2).every((session) => stored.progress[session.id].completed));
  assert.equal(Object.keys(stored.progress).length, 2);
});

test('completion validates the newly rebuilt navigation after assessment or core task changes', async () => {
  const { service } = await setup();
  await service.mutate(studentA, { action: 'save-navigation-context', context: context() });
  const original = await service.view(studentA);
  const oldSession = original.navigation.sessions[0].id;
  await service.mutate(studentA, { action: 'complete-task', taskId: original.learning.plan.priorities[0].task_id, completed: true });
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: oldSession, completed: true }), { status: 404 });
  const another = (await service.view(studentA)).navigation.sessions[0].id;
  await service.mutate(studentA, assessment());
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: another, completed: true }), { status: 404 });
  for (const completed of ['true', 1, null]) await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'fake', completed }), { status: 400 });
});

test('a reassessment racing with completion cannot store an obsolete session or reduce the new route budget', async () => {
  const { repository, service } = await setup();
  await service.mutate(studentA, { action: 'save-navigation-context', context: context() });
  const oldSession = (await service.view(studentA)).navigation.sessions[0].id;
  const store = repository.completeNavigationSession.bind(repository);
  repository.completeNavigationSession = async (...args) => {
    // The completion has already read and validated the old assessment. Another
    // request replaces it immediately before the database write acquires a lock.
    await service.mutate(studentA, assessment({ scores: { first_law: 80, second_law: 80, entropy: 45, rankine_cycle: 70 } }));
    return store(...args);
  };
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: oldSession, completed: true }), { status: 409, code: 'PLAN_CHANGED' });
  assert.equal(repository.navigation.get(studentA.id).progress[oldSession], undefined);
  assert.ok((await service.view(studentA)).navigation.sessions.every(session => session.id !== oldSession));
});

test('server enforces an unavailable review prerequisite but permits undoing a completion', async () => {
  const repository = memoryRepository();
  const service = createPortalService({ repository, navigationBuilder: () => ({ sessions: [{ id: 'nav:test:entropy:review-1', canComplete: false, durationMinutes: 15 }] }) });
  await service.mutate(studentA, assessment());
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'nav:test:entropy:review-1', completed: true }), { status: 409, code: 'SESSION_NOT_READY' });
  assert.equal(repository.navigation.size, 0);
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'nav:test:entropy:review-1', completed: false });
  assert.deepEqual(repository.navigation.get(studentA.id).progress['nav:test:entropy:review-1'], { completed: false, completedAt: null, durationMinutes: 15 });
});

test('completion stores server-generated duration and repeat requests retain the original duration and timestamp', async () => {
  const repository = memoryRepository();
  let duration = 20;
  const service = createPortalService({ repository, now: () => new Date('2026-09-13T00:00:00.000Z'), navigationBuilder: () => ({ sessions: [{ id: 'nav:test:entropy:learn', durationMinutes: duration, canComplete: true }] }) });
  await service.mutate(studentA, assessment());
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'nav:test:entropy:learn', completed: true });
  duration = 25;
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: 'nav:test:entropy:learn', completed: true });
  assert.deepEqual(repository.navigation.get(studentA.id).progress['nav:test:entropy:learn'], { completed: true, completedAt: '2026-09-13T00:00:00.000Z', durationMinutes: 20 });
});

test('real navigation builder rejects review before learning and on the same day, then permits a later local day', async () => {
  const repository = memoryRepository();
  let instant = new Date('2026-09-13T00:00:00.000Z');
  const service = createPortalService({ repository, now: () => instant });
  await service.mutate(studentA, assessment());
  await service.mutate(studentA, { action: 'save-navigation-context', context: context() });
  const view = await service.view(studentA);
  const initial = view.navigation.sessions.find((session) => session.id.endsWith(':learn'));
  const review = view.navigation.sessions.find((session) => session.id === initial.id.replace(/:learn$/, ':review-1'));
  assert.ok(initial && review);
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: review.id, completed: true }), { status: 409, code: 'SESSION_NOT_READY' });
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: initial.id, completed: true });
  await assert.rejects(service.mutate(studentA, { action: 'complete-navigation-session', sessionId: review.id, completed: true }), { status: 409, code: 'SESSION_NOT_READY' });
  instant = new Date('2026-09-14T00:00:00.000Z');
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: review.id, completed: true });
  assert.equal(repository.navigation.get(studentA.id).progress[review.id].completedAt, instant.toISOString());
  assert.deepEqual((await service.view(studentA)).learning.completedTaskIds, []);
});

test('private navigation keeps the actual learner clock even when the public demo uses a fixed noon', async () => {
  const repository = memoryRepository();
  const instant = new Date('2026-09-13T13:59:00.000Z'); // Sydney: 23:59, after all permitted study windows.
  const service = createPortalService({ repository, now: () => instant });
  await service.mutate(studentA, assessment());
  await service.mutate(studentA, { action: 'save-navigation-context', context: context({ availability: { days: [1, 2, 3, 4, 5, 6, 7], startTime: '18:00', minutesPerDay: 120 } }) });
  const { navigation } = await service.view(studentA);
  assert.equal(navigation.generatedAt, instant.toISOString());
  assert.equal(navigation.windowStart, '2026-09-13');
  assert.ok(navigation.sessions.some(session => session.date === '2026-09-14'));
  assert.ok(navigation.sessions.every(session => session.date === null || session.date > '2026-09-13'));
});

test('teacher recommendations follow the learner’s live route after completion while roster focus remains explicitly assessment-based', async () => {
  const { repository } = await setup();
  const service = createPortalService({ repository, now: () => new Date('2026-09-13T00:00:00Z') });
  await service.mutate(studentA, { action: 'save-navigation-context', context: context({
    goalTopics: [], careerTopics: [], feedbackTopics: [],
    topicProgress: { first_law: 'confident', second_law: 'learning', entropy: 'learning', rankine_cycle: 'learning' },
    deadlines: [], availability: { days: [1, 2, 3, 4, 5, 6, 7], startTime: '18:00', minutesPerDay: 120 },
  }) });
  for (const expected of ['rankine_cycle', 'second_law']) {
    const current = await service.view(studentA);
    assert.equal(current.recommendation.topicId, expected);
    const next = current.navigation.sessions.find(session => !session.completed && session.date && session.canComplete);
    await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: next.id, completed: true });
  }
  const teacher = await service.view(teacherA, studentA.id);
  const student = await service.view(studentA);
  assert.equal(teacher.learning.plan.priorities[0].topic_id, 'rankine_cycle');
  assert.equal(teacher.recommendation.topicId, 'entropy');
  assert.equal(teacher.recommendation.source, 'deterministic-study-navigation');
  assert.match(teacher.recommendation.action.en, /25 minutes/);
  assert.match(teacher.recommendation.action.en, /2026-09-13.*Australia\/Sydney/);
  assert.deepEqual(teacher.recommendation, student.recommendation);
  const rosterEntry = teacher.students.find(row => row.id === studentA.id);
  assert.equal(rosterEntry.focusTopic, 'rankine_cycle');
  assert.equal(rosterEntry.focusBasis, 'assessment');
  assert.deepEqual(teacher.learning.completedTaskIds, []);
});

test('recommendation uses the scheduled review and actual focus duration without reviving a completed legacy focus', async () => {
  const { service } = await setup();
  const { learning } = await service.view(studentA);
  const session = { topicId: 'entropy', kind: 'review', date: '2026-09-14', time: '18:00', durationMinutes: 15, completed: false, canComplete: false };
  const route = { contextComplete: true, timezone: 'Asia/Shanghai', sessions: [{ ...session, topicId: 'rankine_cycle', completed: true }, session] };
  const waiting = recommendation(learning, route);
  assert.equal(waiting.topicId, 'entropy');
  assert.match(waiting.action.en, /15 minutes on retrieval review/);
  assert.match(waiting.action.en, /Asia\/Shanghai/);
  assert.match(waiting.action.en, /provisional.*prerequisite/);
  route.sessions.push({ ...session, topicId: 'second_law', kind: 'learn', durationMinutes: 20, canComplete: true });
  const ready = recommendation(learning, route);
  assert.equal(ready.topicId, 'second_law');
  assert.match(ready.action.en, /20 minutes on focused practice/);
});

test('recommendation requests schedule adjustments when a configured route cannot fit and keeps the old fallback only without navigation context', async () => {
  const { service } = await setup();
  const { learning } = await service.view(studentA);
  const baseline = recommendation(learning);
  assert.equal(baseline.source, 'deterministic-study-engine');
  assert.deepEqual(recommendation(learning, { contextComplete: false, sessions: [] }), baseline);
  const blocked = recommendation(learning, { contextComplete: true, sessions: [{ topicId: 'entropy', completed: false, date: null, time: null }] });
  assert.equal(blocked.topicId, null);
  assert.equal(blocked.source, 'deterministic-study-navigation');
  assert.match(blocked.action.en, /availability, scope and deadline/);
  const done = recommendation(learning, { contextComplete: true, sessions: [{ topicId: 'entropy', completed: true }] });
  assert.equal(done.topicId, null);
  assert.match(done.action.en, /does not establish mastery/);
  assert.equal(recommendation(null, { contextComplete: true, sessions: [] }), null);
});

test('real navigation preserves a completed short-sleep block duration and tolerates legacy progress without duration', async () => {
  const repository = memoryRepository();
  let instant = new Date('2026-09-13T00:00:00.000Z');
  const service = createPortalService({ repository, now: () => instant });
  await service.mutate(studentA, assessment());
  const preferences = context({ healthDemo: 'short_sleep', availability: { days: [1, 2, 3, 4, 5, 6, 7], startTime: '12:00', minutesPerDay: 120 } });
  await service.mutate(studentA, { action: 'save-navigation-context', context: preferences });
  const before = await service.view(studentA);
  const short = before.navigation.sessions.find((session) => session.id.endsWith(':learn') && session.date === '2026-09-13');
  assert.ok(short);
  assert.equal(short.durationMinutes, 20);
  await service.mutate(studentA, { action: 'complete-navigation-session', sessionId: short.id, completed: true });
  assert.equal(repository.navigation.get(studentA.id).progress[short.id].durationMinutes, 20);
  instant = new Date('2026-09-14T00:00:00.000Z');
  await service.mutate(studentA, { action: 'save-navigation-context', context: { ...preferences, focusMinutes: 50, healthDemo: 'off' } });
  const after = await service.view(studentA);
  assert.equal(after.navigation.sessions.find((session) => session.id === short.id).durationMinutes, 20);
  const legacy = after.navigation.sessions.find((session) => session.id.endsWith(':learn') && session.id !== short.id);
  repository.navigation.get(studentA.id).progress[legacy.id] = { completed: true, completedAt: '2026-09-13T01:00:00.000Z' };
  const migrated = await service.view(studentA);
  assert.equal(migrated.navigation.sessions.find((session) => session.id === legacy.id).durationMinutes, 50);
});

const demoClass = '8f69527f-22cc-4d6c-aa24-3ab37900dc22';
const demoReference = '2026-09-13T02:00:00.000Z';
test('navigation demo contexts use six existing synthetic IDs and distinct feasible preferences', () => {
  const rows = buildNavigationDemoContexts({ classroomId: demoClass, teacherId: teacherA.id, referenceDate: demoReference });
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map((row) => row.studentId)).size, 6);
  assert.deepEqual(new Set(rows.map((row) => row.context.focusMinutes)), new Set([25, 50]));
  assert.deepEqual(new Set(rows.map((row) => row.context.healthDemo)), new Set(['rested', 'short_sleep', 'off', 'no_data']));
  assert.ok(new Set(rows.map((row) => JSON.stringify(row.context.availability))).size > 1);
  for (const row of rows) {
    assert.match(row.studentId, /^demo_studygps_/);
    assert.doesNotThrow(() => validateNavigationContext(row.context));
    assert.deepEqual(row.context.deadlines.map((deadline) => deadline.dueDate), ['2026-09-18', '2026-09-25']);
    assert.match(row.context.interests, /Bicycle|Sustainable/);
    assert.ok(row.context.careerTopics.length > 0);
  }
});

test('short-sleep demo students have Sunday availability to demonstrate the current-day adjustment', () => {
  const rows = buildNavigationDemoContexts({ classroomId: demoClass, teacherId: teacherA.id, referenceDate: demoReference });
  const shortSleep = rows.filter((row) => row.context.healthDemo === 'short_sleep');
  assert.ok(shortSleep.some((row) => row.context.availability.days.includes(7)));
  assert.deepEqual(rows[1].context.availability.days, [2, 4, 6, 7]);
  assert.deepEqual(rows[4].context.availability.days, [3, 6, 7]);
});

function seedFixture({ verified = true, conflicting = false } = {}) {
  const rows = buildNavigationDemoContexts({ classroomId: demoClass, teacherId: teacherA.id, referenceDate: demoReference });
  const queries = [];
  let transactions = 0;
  const sql = (parts, ...values) => {
    const query = parts.join('?'); queries.push({ query, values });
    if (query.includes('SELECT c.id')) return Promise.resolve([{ id: demoClass, name: 'Demo class', teacher_id: teacherA.id }]);
    if (query.includes('SELECT p.user_id')) return Promise.resolve(rows.map((row, index) => ({ user_id: row.studentId, role: 'student', is_demo: !(conflicting && index === 0), classroom_id: demoClass })));
    if (query.includes('SELECT student_id FROM')) return Promise.resolve([{ student_id: rows[0].studentId }]);
    return Promise.resolve([{ student_id: values[1] }]);
  };
  sql.transaction = async (entries) => { transactions += 1; return Promise.all(entries); };
  const clerk = { users: { async getUser() { return { id: teacherA.id, primaryEmailAddressId: 'primary', emailAddresses: [{ id: 'primary', emailAddress: teacherA.email, verification: { status: verified ? 'verified' : 'unverified' } }] }; } } };
  return { sql, clerk, queries, transactions: () => transactions, args: { classroomId: demoClass, referenceDate: demoReference, env: { STUDYGPS_ADMIN_EMAIL: teacherA.email }, sql, clerk } };
}

test('demo seed is dry-run by default and refuses an unverified administrator or non-demo account', async () => {
  const dry = seedFixture();
  const summary = await seedNavigationDemo(dry.args);
  assert.equal(summary.applied, false);
  assert.equal(summary.newContexts, 5);
  assert.equal(dry.transactions(), 0);
  for (const options of [{ verified: false }, { conflicting: true }]) {
    const fixture = seedFixture(options);
    await assert.rejects(seedNavigationDemo({ ...fixture.args, apply: true }));
    assert.equal(fixture.transactions(), 0);
    assert.equal(fixture.queries.some(({ query }) => query.includes('INSERT')), false);
  }
});

test('demo seed writes only guarded context inserts and never replaces records or touches credentials/history/advice', async () => {
  const fixture = seedFixture();
  await seedNavigationDemo({ ...fixture.args, apply: true });
  assert.equal(fixture.transactions(), 1);
  const writes = fixture.queries.filter(({ query }) => query.includes('INSERT'));
  assert.equal(writes.length, 6);
  for (const { query } of writes) {
    assert.match(query, /INSERT INTO studygps_navigation/);
    assert.match(query, /p\.is_demo=true/);
    assert.match(query, /c\.teacher_id=/);
    assert.match(query, /ON CONFLICT \(student_id\) DO NOTHING/);
    assert.doesNotMatch(query, /UPDATE|DELETE|studygps_assessments|studygps_advice|studygps_learning/);
  }
});
