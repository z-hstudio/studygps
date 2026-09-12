'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDemoRows, assertNoDemoConflicts } = require('../scripts/seed-classroom-demo');
const { generateStudyPlan } = require('../engine');
const course = require('../engine/examples/course.json');
const dataset = require('../demo/classroom-students.json');

const classroomId = '8f69527f-22cc-4d6c-aa24-3ab37900dc22';
const teacherId = 'user_real_teacher_for_test';
const referenceDate = '2026-09-12T00:00:00.000Z';
const generate = (overrides = {}) => buildDemoRows({ classroomId, teacherId, referenceDate, dataset, ...overrides });
const studentFor = (rows, key) => {
  const source = dataset.students.find((student) => student.key === key);
  const row = rows.students.find((student) => student.name === source.name);
  assert.ok(row, `Missing synthetic student: ${key}`);
  return row;
};
function recordIds(rows) {
  return rows.students.flatMap((student) => [student.id, ...student.assessments.map((assessment) => assessment.id), ...student.advice.map((advice) => advice.id)]);
}

test('repeated classroom generation preserves all IDs and does not mutate the authored dataset', () => {
  const original = structuredClone(dataset);
  const first = generate();
  const repeated = generate();
  assert.deepEqual(repeated, first);
  assert.deepEqual(dataset, original);
  assert.equal(first.students.length, 6);
  const ids = recordIds(first);
  assert.equal(new Set(ids).size, ids.length, 'Every student, assessment and advice row needs a unique ID.');
  const nextDay = generate({ referenceDate: '2026-09-13T00:00:00.000Z' });
  assert.deepEqual(recordIds(nextDay), ids, 'Running the seed on another day must update the same synthetic rows rather than create duplicates.');
});

test('different classrooms receive disjoint student, assessment and advice identities', () => {
  const first = generate();
  const other = generate({ classroomId: 'f92f3066-64d8-4ccc-87e4-3aa94f70fd39' });
  const ids = new Set(recordIds(first));
  assert.equal(recordIds(other).some((id) => ids.has(id)), false);
  const taskIds = new Set(first.students.flatMap((student) => student.learning.plan.priorities.map((task) => task.task_id)));
  assert.equal(other.students.some((student) => student.learning.plan.priorities.some((task) => taskIds.has(task.task_id))), false);
});

test('synthetic rows have reserved non-deliverable addresses and no authentication credentials', () => {
  const rows = generate();
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /password|secret|session|credential|access.?token|refresh.?token/i);
      if (typeof child === 'object') inspect(child);
    }
  }
  inspect(rows);
  const emails = new Set();
  for (const student of rows.students) {
    assert.match(student.email, /^[^\s@]+@example\.invalid$/);
    assert.notEqual(student.id, teacherId);
    assert.ok(student.name.length > 0);
    assert.ok(student.goal.length > 0);
    emails.add(student.email);
  }
  assert.equal(emails.size, rows.students.length);
  assert.doesNotMatch(JSON.stringify(rows), /sk_(?:live|test)_|pk_(?:live|test)_|Bearer\s+[A-Za-z0-9_.-]+/);
});

test('every history is chronological, belongs to its student, and exactly matches engine calculations', () => {
  const rows = generate();
  for (const source of dataset.students) {
    const student = studentFor(rows, source.key);
    assert.equal(student.assessments.length, 4);
    let previous = null;
    let previousTime = -Infinity;
    for (const assessment of student.assessments) {
      const timestamp = Date.parse(assessment.createdAt);
      assert.ok(Number.isFinite(timestamp));
      assert.ok(timestamp > previousTime, 'History must run from oldest to newest.');
      const expected = generateStudyPlan({
        student_id: student.id,
        course_id: course.course_id,
        assessment_id: assessment.id,
        topic_scores: assessment.scores,
        target_score: source.targetScore,
        available_minutes: source.minutes,
      }, course, previous);
      assert.deepEqual(assessment.plan, expected);
      assert.equal(assessment.overallScore, expected.overall_score);
      assert.equal(assessment.plan.student_id, student.id);
      assert.equal(assessment.plan.assessment_id, assessment.id);
      previous = assessment.plan;
      previousTime = timestamp;
    }
    const latest = student.assessments.at(-1);
    assert.deepEqual(student.learning.scores, latest.scores);
    assert.deepEqual(student.learning.plan, latest.plan);
    assert.equal(student.learning.targetScore, source.targetScore);
    assert.equal(student.learning.minutes, source.minutes);
    assert.equal(Date.parse(student.learning.updatedAt), Date.parse(latest.createdAt));
  }
});

test('completed tasks and advice are restricted to each generated student and the given teacher', () => {
  const rows = generate();
  for (const student of rows.students) {
    const source = dataset.students.find((item) => item.name === student.name);
    const ownIds = new Set(student.learning.plan.priorities.map((task) => task.task_id));
    const completed = student.learning.completedTaskIds;
    assert.equal(completed.length, Math.min(source.completionCount, ownIds.size));
    assert.equal(new Set(completed).size, completed.length);
    assert.ok(completed.every((id) => ownIds.has(id)));
    const foreignIds = new Set(rows.students.filter((other) => other.id !== student.id).flatMap((other) => other.learning.plan.priorities.map((task) => task.task_id)));
    assert.equal(completed.some((id) => foreignIds.has(id)), false);
    assert.equal(student.advice.length, 2);
    for (const advice of student.advice) {
      assert.equal(advice.studentId, student.id);
      assert.equal(advice.teacherId, teacherId);
      assert.ok(advice.message.length > 0 && advice.message.length <= 2000);
      assert.ok(Number.isFinite(Date.parse(advice.createdAt)));
      assert.ok(course.topics.some((topic) => topic.topic_id === advice.focusTopic));
    }
  }
});

test('equal overall scores retain different weaknesses and personalized first tasks', () => {
  const rows = generate();
  const alex = studentFor(rows, 'alex-chen');
  const sarah = studentFor(rows, 'sarah-lin');
  assert.equal(alex.learning.plan.overall_score, 63.5);
  assert.equal(sarah.learning.plan.overall_score, 63.5);
  assert.equal(alex.learning.plan.priorities[0].topic_id, 'rankine_cycle');
  assert.equal(sarah.learning.plan.priorities[0].topic_id, 'first_law');
  assert.notDeepEqual(alex.advice.map((item) => item.message), sarah.advice.map((item) => item.message));
});

test('the student meeting every target receives no fabricated remedial work', () => {
  const ethan = studentFor(generate(), 'ethan-song');
  assert.equal(ethan.learning.targetScore, 85);
  assert.ok(Object.values(ethan.learning.scores).every((score) => score >= 85));
  assert.equal(ethan.learning.plan.status, 'target_met');
  assert.deepEqual(ethan.learning.plan.priorities, []);
  assert.equal(ethan.learning.plan.total_planned_minutes, 0);
  assert.deepEqual(ethan.learning.completedTaskIds, []);
});

test('the 60-minute student receives one feasible focus task and all plans respect their budgets', () => {
  const rows = generate();
  const lina = studentFor(rows, 'lina-guo');
  assert.equal(lina.learning.minutes, 60);
  assert.equal(lina.learning.plan.total_planned_minutes, 60);
  assert.equal(lina.learning.plan.priorities.length, 1);
  assert.equal(lina.learning.plan.priorities[0].topic_id, 'rankine_cycle');
  for (const student of rows.students) for (const assessment of student.assessments) {
    const plan = assessment.plan;
    assert.ok(plan.total_planned_minutes <= student.learning.minutes);
    assert.equal(plan.total_planned_minutes, plan.priorities.reduce((sum, task) => sum + task.duration_minutes, 0));
    assert.ok(plan.priorities.every((task) => task.duration_minutes > 0 && task.duration_minutes % 30 === 0));
  }
});

test('the improvement and declining scenarios preserve their distinct assessment trajectories', () => {
  const rows = generate();
  const maya = studentFor(rows, 'maya-zhou').assessments.map((item) => item.overallScore);
  const noah = studentFor(rows, 'noah-xu').assessments.map((item) => item.overallScore);
  assert.ok(maya.slice(1).every((score, index) => score > maya[index]));
  assert.ok(noah.slice(1).every((score, index) => score < noah[index]));
});

test('conflict guard permits only synthetic student records already in the same classroom', () => {
  const row = { user_id: 'demo_existing_record', is_demo: true, role: 'student', classroom_id: classroomId };
  assert.doesNotThrow(() => assertNoDemoConflicts([], classroomId));
  assert.doesNotThrow(() => assertNoDemoConflicts([row], classroomId));
  for (const bad of [
    { ...row, is_demo: false },
    { ...row, role: 'teacher' },
    { ...row, classroom_id: 'f92f3066-64d8-4ccc-87e4-3aa94f70fd39' },
  ]) {
    assert.throws(() => assertNoDemoConflicts([bad], classroomId));
    assert.throws(() => assertNoDemoConflicts([row, bad], classroomId), 'One allowed row must not hide a conflicting record.');
  }
});
