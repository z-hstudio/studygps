'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalService } = require('../server/portal-service');
const { memoryRepository, actors, assessment } = require('./portal-helpers');
const { studentA, studentB, teacherA, teacherB } = actors;
const status = (expected) => (error) => error.status === expected;

async function setup(enroll = true) {
  const repository = memoryRepository();
  const service = createPortalService({ repository });
  for (const actor of Object.values(actors)) await service.view(actor);
  for (const actor of [teacherA, teacherB]) await service.mutate(actor, { action: 'create-classroom', name: `${actor.name} classroom` });
  if (enroll) {
    await service.mutate(studentA, { action: 'join-classroom', code: (await service.view(teacherA)).classroom.code });
    await service.mutate(studentB, { action: 'join-classroom', code: (await service.view(teacherB)).classroom.code });
  }
  repository.reads.length = 0;
  return { service, repository };
}

test('each student sees only their own saved learning and no teacher invitation code', async () => {
  const { service } = await setup();
  await service.mutate(studentA, assessment());
  await service.mutate(studentB, assessment({ scores: { first_law: 50, second_law: 65, entropy: 35, rankine_cycle: 85 } }));
  const a = await service.view(studentA);
  const b = await service.view(studentB);
  assert.equal(a.learning.plan.student_id, studentA.id);
  assert.equal(b.learning.plan.student_id, studentB.id);
  assert.equal(a.learning.plan.priorities[0].topic_id, 'rankine_cycle');
  assert.equal(b.learning.plan.priorities[0].topic_id, 'first_law');
  assert.notDeepEqual(a.recommendation.action, b.recommendation.action);
  assert.equal(a.recommendation.source, 'deterministic-study-engine');
  assert.equal(a.classroom.code, undefined);
  assert.deepEqual(a.students, []);
});

test('teacher rosters and details contain only their actively assigned student', async () => {
  const { service } = await setup();
  await service.mutate(studentA, assessment());
  const a = await service.view(teacherA);
  const b = await service.view(teacherB);
  assert.deepEqual(a.students.map((student) => student.id), [studentA.id]);
  assert.deepEqual(b.students.map((student) => student.id), [studentB.id]);
  assert.equal(a.learning, null);
  assert.match(a.classroom.code, /^[A-F0-9]{20}$/);
  const detail = await service.view(teacherA, studentA.id);
  assert.equal(detail.user.id, teacherA.id);
  assert.equal(detail.student.id, studentA.id);
  assert.equal(detail.learning.plan.student_id, studentA.id);
});

test('cross-classroom and nonexistent detail IDs return the same 404 before private reads', async () => {
  const { service, repository } = await setup();
  for (const id of [studentB.id, 'user_missing', teacherB.id]) await assert.rejects(service.view(teacherA, id), status(404));
  assert.equal(repository.reads.some(([kind]) => ['learning', 'advice'].includes(kind)), false);
});

test('students cannot open any admin detail including their own ID', async () => {
  const { service } = await setup();
  for (const id of [studentA.id, studentB.id, teacherA.id]) await assert.rejects(service.view(studentA, id), status(403));
});

test('students cannot create classrooms or write teacher advice; teachers cannot submit student work', async () => {
  const { service } = await setup();
  await assert.rejects(service.mutate(studentA, { action: 'create-classroom', name: 'Escalation' }), status(403));
  await assert.rejects(service.mutate(studentA, { action: 'save-advice', studentId: studentB.id, message: 'Attack' }), status(403));
  await assert.rejects(service.mutate(teacherA, assessment()), status(403));
  await assert.rejects(service.mutate(teacherA, { action: 'complete-task', taskId: 'x', completed: true }), status(403));
  await assert.rejects(service.mutate(teacherA, { action: 'join-classroom', code: 'A'.repeat(20) }), status(403));
});

test('role, owner, previous plan, arbitrary course and client plan overrides are rejected', async () => {
  const { service, repository } = await setup();
  for (const extra of [{ role: 'teacher' }, { studentId: studentB.id }, { user_id: studentB.id }, { previous_plan: { student_id: studentB.id } }, { course: {} }, { plan: {} }]) await assert.rejects(service.mutate(studentA, assessment(extra)), status(400));
  await assert.rejects(service.mutate(studentA, { action: 'save-profile', name: 'Fake', goal: '', timezone: 'UTC', role: 'teacher' }), status(400));
  assert.equal(repository.learning.size, 0);
  assert.equal(repository.profiles.get(studentA.id).role, 'student');
});

test('plan history and changes compare only against the same authenticated student', async () => {
  const { service } = await setup();
  await service.mutate(studentA, assessment());
  await service.mutate(studentB, assessment({ scores: { first_law: 50, second_law: 65, entropy: 35, rankine_cycle: 85 } }));
  const b = await service.view(studentB);
  assert.equal(b.learning.plan.changes.type, 'initial_plan');
  await service.mutate(studentA, assessment({ scores: { first_law: 85, second_law: 62, entropy: 40, rankine_cycle: 78 } }));
  const a = await service.view(studentA);
  assert.equal(a.learning.history.length, 2);
  assert.equal(a.learning.plan.changes.type, 'updated_plan');
  assert.equal(a.learning.plan.overall_score, 71.5);
  assert.equal((await service.view(studentB)).learning.history.length, 1);
  assert.equal(JSON.stringify(a).includes(studentB.id), false);
});

test('task completion is owner-scoped, reversible and reset by a new assessment', async () => {
  const { service } = await setup();
  await service.mutate(studentA, assessment());
  await service.mutate(studentB, assessment());
  const taskId = (await service.view(studentA)).learning.plan.priorities[0].task_id;
  await assert.rejects(service.mutate(studentB, { action: 'complete-task', taskId, completed: true }), status(404));
  await service.mutate(studentA, { action: 'complete-task', taskId, completed: true });
  assert.deepEqual((await service.view(studentA)).learning.completedTaskIds, [taskId]);
  await service.mutate(studentA, { action: 'complete-task', taskId, completed: false });
  assert.deepEqual((await service.view(studentA)).learning.completedTaskIds, []);
  await service.mutate(studentA, { action: 'complete-task', taskId, completed: true });
  await service.mutate(studentA, assessment());
  assert.deepEqual((await service.view(studentA)).learning.completedTaskIds, []);
});

test('teacher advice is private to the assigned learner and written by the verified teacher', async () => {
  const { service } = await setup();
  await assert.rejects(service.mutate(teacherA, { action: 'save-advice', studentId: studentB.id, message: 'Wrong cohort' }), status(404));
  await service.mutate(teacherA, { action: 'save-advice', studentId: studentA.id, message: 'Review your energy balance signs.', focusTopic: 'first_law' });
  const a = await service.view(studentA);
  assert.equal(a.advice[0].teacherName, teacherA.name);
  assert.equal(a.advice[0].message, 'Review your energy balance signs.');
  assert.deepEqual((await service.view(studentB)).advice, []);
  assert.deepEqual((await service.view(teacherB, studentB.id)).advice, []);
});

test('unassigned students stay private until they use the correct invitation code', async () => {
  const { service } = await setup(false);
  await assert.rejects(service.view(teacherA, studentA.id), status(404));
  assert.equal((await service.view(studentA)).classroom, null);
  await assert.rejects(service.mutate(studentA, { action: 'join-classroom', code: '0'.repeat(20) }), status(404));
  await service.mutate(studentA, { action: 'join-classroom', code: (await service.view(teacherA)).classroom.code.toLowerCase() });
  assert.equal((await service.view(teacherA, studentA.id)).student.id, studentA.id);
  await assert.rejects(service.mutate(studentA, { action: 'join-classroom', code: (await service.view(teacherB)).classroom.code }), status(409));
});

test('trusted teacher revocation takes effect despite a teacher role stored in the database', async () => {
  const { service, repository } = await setup();
  assert.equal(repository.profiles.get(teacherA.id).role, 'teacher');
  const revoked = { ...teacherA, role: 'student' };
  await assert.rejects(service.view(revoked, studentA.id), status(403));
  assert.equal((await service.view(revoked)).user.role, 'student');
  assert.deepEqual((await service.view(revoked)).students, []);
});

test('malformed score, target, duration and unexpected fields do not create records', async () => {
  const { service, repository } = await setup();
  for (const invalidScore of [-1, 101, NaN, Infinity, '80', true, {}, undefined]) {
    await assert.rejects(service.mutate(studentA, assessment({ scores: { first_law: invalidScore, second_law: 65, entropy: 35, rankine_cycle: 50 } })), status(400));
  }
  for (const targetScore of [-1, 101, NaN, Infinity, '80']) await assert.rejects(service.mutate(studentA, assessment({ targetScore })), status(400));
  for (const minutes of [-1, 1441, 30.5, Infinity, '180']) await assert.rejects(service.mutate(studentA, assessment({ minutes })), status(400));
  await assert.rejects(service.mutate(studentA, assessment({ scores: { first_law: 50 } })), status(400));
  assert.equal(repository.learning.size, 0);
});

test('missing assessment values remain null and zero study time remains valid', async () => {
  const { service } = await setup();
  await service.mutate(studentA, assessment({ scores: { first_law: null, second_law: null, entropy: null, rankine_cycle: null }, minutes: 0 }));
  const view = await service.view(studentA);
  assert.equal(view.learning.plan.overall_score, null);
  assert.equal(view.learning.plan.status, 'no_scores');
  assert.equal(view.recommendation.topicId, null);
});

test('profile bounds and timezone validation prevent invalid or cross-owner profile updates', async () => {
  const { service } = await setup();
  for (const values of [{ name: '' }, { name: 'x'.repeat(81) }, { goal: 'x'.repeat(501) }, { timezone: 'Not/AZone' }, { studentId: studentB.id }]) await assert.rejects(service.mutate(studentA, { action: 'save-profile', name: 'Alice', goal: 'Improve entropy', timezone: 'Asia/Shanghai', ...values }), status(400));
  await service.mutate(studentA, { action: 'save-profile', name: '小周', goal: '掌握热力学', timezone: 'Asia/Shanghai' });
  assert.equal((await service.view(studentA)).user.name, '小周');
  assert.equal((await service.view(studentB)).user.name, studentB.name);
});

test('advice bounds and topic allowlist reject oversized or malformed teacher writes', async () => {
  const { service, repository } = await setup();
  for (const values of [{ message: '' }, { message: 'x'.repeat(2001) }, { focusTopic: 'arbitrary' }, { teacherId: teacherB.id }]) await assert.rejects(service.mutate(teacherA, { action: 'save-advice', studentId: studentA.id, message: 'Useful feedback', ...values }), status(400));
  assert.equal(repository.advice.length, 0);
});

test('teacher view starts independent reads together but gates private reads on assignment authorization', async () => {
  const { service, repository } = await setup();
  const calls = [];
  let releaseProfile;
  let releaseAssignment;
  const profileGate = new Promise((resolve) => { releaseProfile = resolve; });
  const assignmentGate = new Promise((resolve) => { releaseAssignment = resolve; });
  const originals = {};
  for (const name of ['ensureProfile', 'getClassroom', 'listStudents', 'getAssignedStudent', 'getLearning', 'getAdvice']) {
    originals[name] = repository[name];
    repository[name] = async (...args) => {
      calls.push(name);
      if (name === 'ensureProfile') await profileGate;
      if (name === 'getAssignedStudent') await assignmentGate;
      return originals[name](...args);
    };
  }
  const pending = service.view(teacherA, studentA.id);
  await Promise.resolve();
  assert.deepEqual(calls, ['ensureProfile', 'getClassroom', 'listStudents', 'getAssignedStudent']);
  releaseAssignment();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(calls.includes('getLearning'));
  assert.ok(calls.includes('getAdvice'));
  releaseProfile();
  assert.equal((await pending).student.id, studentA.id);
});

test('failed concurrent assignment lookup never starts learning or advice reads', async () => {
  const { service, repository } = await setup();
  let releaseAssignment;
  const gate = new Promise((resolve) => { releaseAssignment = resolve; });
  repository.getAssignedStudent = async () => { await gate; return null; };
  const pending = service.view(teacherA, studentB.id);
  const rejection = assert.rejects(pending, { status: 404 });
  await Promise.resolve();
  assert.equal(repository.reads.some(([name]) => ['learning', 'advice'].includes(name)), false);
  releaseAssignment();
  await rejection;
  assert.equal(repository.reads.some(([name]) => ['learning', 'advice'].includes(name)), false);
});
