'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const {
  generateStudyPlan,
  comparePlans,
  explainPlan,
  StudyPlanValidationError,
} = require('../index');

// These independent expectations deliberately do not derive expected values
// from the implementation or from the generated example output files.
function demoCourse() {
  return {
    course_id: 'thermodynamics_demo',
    topics: [
      ['first_law', 'First Law', 0.30, 60],
      ['second_law', 'Second Law', 0.30, 60],
      ['entropy', 'Entropy', 0.10, 90],
      ['rankine_cycle', 'Rankine Cycle', 0.30, 60],
    ].map(([topic_id, topic_name, importance, estimated_minutes]) => ({
      topic_id,
      topic_name,
      importance,
      estimated_minutes,
      resource_id: `${topic_id}_demo`,
      resource_ref: `engine/examples/resources/${topic_id}.md`,
      activity: `Read the ${topic_name} demo and complete its practice questions.`,
    })),
  };
}

function input(overrides = {}) {
  return {
    student_id: 'alex',
    course_id: 'thermodynamics_demo',
    assessment_id: 'quiz_01',
    target_score: 80,
    available_minutes: 180,
    exam_date: '2026-09-20',
    topic_scores: { first_law: 85, second_law: 65, entropy: 35, rankine_cycle: 50 },
    ...overrides,
  };
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function topicOrder(plan) {
  return plan.priorities.map((task) => task.topic_id);
}

function analysis(plan, topicId) {
  return plan.topic_analysis.find((topic) => topic.topic_id === topicId);
}

function validationError(run, field) {
  assert.throws(run, (error) => {
    assert.ok(error instanceof StudyPlanValidationError);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(error.issues) && error.issues.length > 0);
    for (const issue of error.issues) {
      assert.equal(typeof issue.path, 'string');
      assert.equal(typeof issue.message, 'string');
      assert.ok(issue.message.trim().length > 0);
    }
    if (field) {
      assert.ok(error.issues.some((issue) => issue.path.includes(field)),
        `Expected an issue identifying ${field}; received ${JSON.stringify(error.issues)}`);
      assert.ok(error.message.includes(field), `Error message should identify ${field}`);
    }
    return true;
  });
}

test('Alex and Sarah have equal weighted results but different first priorities', () => {
  const alex = generateStudyPlan(input(), demoCourse());
  const sarah = generateStudyPlan(input({
    student_id: 'sarah',
    topic_scores: { first_law: 50, second_law: 65, entropy: 35, rankine_cycle: 85 },
  }), demoCourse());

  assert.equal(alex.overall_score, 63.5);
  assert.equal(sarah.overall_score, 63.5);
  assert.deepEqual(topicOrder(alex), ['rankine_cycle', 'second_law', 'entropy']);
  assert.deepEqual(topicOrder(sarah), ['first_law', 'second_law', 'entropy']);
  assert.deepEqual(alex.priorities.map((task) => task.duration_minutes), [60, 60, 60]);
  assert.equal(alex.status, 'ready');
  assert.equal(alex.total_planned_minutes, 180);
  assert.equal(alex.unused_minutes, 0);
});

test('Alex assessment 2 promotes Second Law and detects actual task changes', () => {
  const first = generateStudyPlan(input(), demoCourse());
  const second = generateStudyPlan(input({
    assessment_id: 'quiz_02',
    topic_scores: { first_law: 85, second_law: 62, entropy: 40, rankine_cycle: 78 },
  }), demoCourse(), first);

  assert.equal(second.overall_score, 71.5);
  assert.deepEqual(topicOrder(second), ['second_law', 'entropy', 'rankine_cycle']);
  assert.deepEqual(second.priorities.map((task) => task.duration_minutes), [60, 90, 30]);
  assert.equal(second.plan_changed, true);
  assert.equal(second.changes.type, 'updated_plan');
  assert.equal(second.changes.first_priority_changed, true);
  assert.equal(second.changes.task_order_changed, true);
  assert.deepEqual(second.changes.tasks_added, []);
  assert.deepEqual(second.changes.tasks_removed, []);
  const rankineId = first.priorities[0].task_id;
  assert.ok(second.changes.duration_changes.some((change) => (
    change.task_id === rankineId && change.previous_minutes === 60 && change.new_minutes === 30
  )));
  assert.ok(second.changes.score_changes.some((change) => (
    change.topic_id === 'rankine_cycle' && change.previous_score === 50 && change.new_score === 78
      && change.message.includes('50') && change.message.includes('78')
  )));
});

test('delivered demo inputs reproduce the generated output files and reference real demo materials', () => {
  const course = require('../examples/course.json');
  const alexInput = require('../examples/alex-assessment-1.input.json');
  const sarahInput = require('../examples/sarah-assessment-1.input.json');
  const alexSecondInput = require('../examples/alex-assessment-2.input.json');
  const alex = generateStudyPlan(alexInput, course);
  const sarah = generateStudyPlan(sarahInput, course);
  const alexSecond = generateStudyPlan(alexSecondInput, course, alex);
  assert.equal(alex.overall_score, 63.5);
  assert.equal(sarah.overall_score, 63.5);
  assert.equal(alex.priorities[0].topic_id, 'rankine_cycle');
  assert.equal(sarah.priorities[0].topic_id, 'first_law');
  assert.equal(alexSecond.priorities[0].topic_id, 'second_law');
  assert.deepEqual(alex, require('../examples/alex-assessment-1.output.json'));
  assert.deepEqual(sarah, require('../examples/sarah-assessment-1.output.json'));
  assert.deepEqual(alexSecond, require('../examples/alex-assessment-2.output.json'));
  for (const topic of course.topics) {
    assert.equal(existsSync(path.resolve(__dirname, '../..', topic.resource_ref)), true,
      `Missing delivered demo material: ${topic.resource_ref}`);
  }
});

test('another student and different scores are calculated without demo-specific branching', () => {
  const plan = generateStudyPlan(input({
    student_id: 'morgan',
    assessment_id: 'surprise_assessment',
    topic_scores: { first_law: 80, second_law: 79, entropy: 0, rankine_cycle: 80 },
  }), demoCourse());

  assert.equal(plan.overall_score, 71.7);
  assert.deepEqual(topicOrder(plan), ['entropy', 'second_law']);
  assert.deepEqual(plan.priorities.map((task) => task.duration_minutes), [90, 60]);
  assert.equal(plan.total_planned_minutes, 150);
  assert.equal(plan.unused_minutes, 30);
  assert.equal(analysis(plan, 'entropy').target_gap, 80);
  assert.ok(Math.abs(analysis(plan, 'entropy').priority_score - 80 * 0.1 / 1.5) < 1e-12);
});

test('target changes recalculate gaps and remove tasks that now meet the target', () => {
  const original = generateStudyPlan(input(), demoCourse());
  const lowerTarget = generateStudyPlan(input({ target_score: 50 }), demoCourse(), original);
  assert.equal(analysis(original, 'rankine_cycle').target_gap, 30);
  assert.equal(analysis(lowerTarget, 'rankine_cycle').target_gap, 0);
  assert.equal(analysis(lowerTarget, 'entropy').target_gap, 15);
  assert.deepEqual(topicOrder(lowerTarget), ['entropy']);
  assert.equal(lowerTarget.total_planned_minutes, 90);
  assert.equal(lowerTarget.plan_changed, true);
  assert.equal(lowerTarget.changes.tasks_removed.length, 2);
});

test('budgets always cap allocation in 30-minute blocks without filling spare time', () => {
  const course = demoCourse();
  for (const available_minutes of [0, 1, 29, 30, 30.5, 31, 59, 60, 61, 89, 90, 119, 120, 179, 180, 181, 209, 210, 239, 240, 999]) {
    const plan = generateStudyPlan(input({ available_minutes }), course);
    assert.ok(plan.total_planned_minutes <= available_minutes, `Budget ${available_minutes}`);
    assert.equal(plan.total_planned_minutes,
      plan.priorities.reduce((total, task) => total + task.duration_minutes, 0));
    assert.equal(plan.unused_minutes, available_minutes - plan.total_planned_minutes);
    assert.equal(plan.total_planned_minutes, Math.min(210, Math.floor(available_minutes / 30) * 30));
    for (const [index, task] of plan.priorities.entries()) {
      assert.ok(task.duration_minutes > 0 && task.duration_minutes % 30 === 0);
      assert.ok(task.duration_minutes <= course.topics.find((topic) => topic.topic_id === task.topic_id).estimated_minutes);
      assert.equal(task.priority, index + 1);
    }
  }
});

test('zero and sub-block budgets return informative empty plans', () => {
  for (const [available_minutes, status] of [[0, 'no_study_time'], [1, 'insufficient_block_time'], [29, 'insufficient_block_time']]) {
    const plan = generateStudyPlan(input({ available_minutes }), demoCourse());
    assert.equal(plan.status, status);
    assert.deepEqual(plan.priorities, []);
    assert.equal(plan.total_planned_minutes, 0);
    assert.equal(plan.unused_minutes, available_minutes);
    assert.ok(plan.summary.length > 20);
  }
});

test('partial topic allocations explicitly explain that the work is partial', () => {
  const plan = generateStudyPlan(input({ available_minutes: 30 }), demoCourse());
  assert.deepEqual(topicOrder(plan), ['rankine_cycle']);
  assert.equal(plan.priorities[0].duration_minutes, 30);
  assert.match(plan.priorities[0].reason, /partial/i);
});

test('all observed scores at or above target create no invented remediation', () => {
  const plan = generateStudyPlan(input({
    topic_scores: { first_law: 80, second_law: 90, entropy: 100, rankine_cycle: 80 },
  }), demoCourse());
  assert.equal(plan.status, 'target_met');
  assert.deepEqual(plan.priorities, []);
  assert.equal(plan.total_planned_minutes, 0);
  assert.equal(plan.unused_minutes, 180);
  assert.ok(plan.topic_analysis.every((topic) => topic.target_gap === 0 && topic.priority_score === 0));
  assert.ok(plan.summary.length > 20);
});

test('missing, null and blank scores remain unknown rather than zero', () => {
  const plan = generateStudyPlan(input({
    topic_scores: { first_law: null, second_law: '', entropy: '   ', rankine_cycle: 50 },
  }), demoCourse());
  assert.equal(plan.overall_score, null);
  assert.deepEqual(topicOrder(plan), ['rankine_cycle']);
  for (const topicId of ['first_law', 'second_law', 'entropy']) {
    const topic = analysis(plan, topicId);
    assert.equal(topic.observed_score, null);
    assert.equal(topic.target_gap, null);
    assert.equal(topic.priority_score, null);
  }
  assert.ok(plan.warnings.length > 0);
  assert.ok(plan.warnings.every((warning) => typeof warning.code === 'string' && typeof warning.message === 'string'));
  const omitted = generateStudyPlan(input({ topic_scores: { rankine_cycle: 50 } }), demoCourse());
  assert.equal(analysis(omitted, 'first_law').observed_score, null);
});

test('empty score maps and null score maps produce no-score plans', () => {
  for (const topic_scores of [{}, null]) {
    const plan = generateStudyPlan(input({ topic_scores }), demoCourse());
    assert.equal(plan.status, 'no_scores');
    assert.equal(plan.overall_score, null);
    assert.deepEqual(plan.priorities, []);
    assert.ok(plan.topic_analysis.every((topic) => topic.observed_score === null));
    assert.ok(plan.warnings.length > 0);
  }
});

test('the required score map rejects malformed containers and omission', () => {
  for (const topic_scores of ['', [], 42, false]) {
    validationError(() => generateStudyPlan(input({ topic_scores }), demoCourse()), 'topic_scores');
  }
  const missingMap = input();
  delete missingMap.topic_scores;
  validationError(() => generateStudyPlan(missingMap, demoCourse()), 'topic_scores');
});

test('numeric zero is a valid observed score and a zero reference target is supported', () => {
  const zeros = { first_law: 0, second_law: 0, entropy: 0, rankine_cycle: 0 };
  const deficient = generateStudyPlan(input({ topic_scores: zeros }), demoCourse());
  assert.equal(deficient.overall_score, 0);
  assert.equal(analysis(deficient, 'first_law').target_gap, 80);
  assert.equal(deficient.status, 'ready');
  const targetZero = generateStudyPlan(input({ topic_scores: zeros, target_score: 0 }), demoCourse());
  assert.equal(targetZero.status, 'target_met');
  assert.deepEqual(targetZero.priorities, []);
});

test('status precedence distinguishes unavailable evidence from time and met targets', () => {
  assert.equal(generateStudyPlan(input({ topic_scores: {}, available_minutes: 0 }), demoCourse()).status, 'no_scores');
  assert.equal(generateStudyPlan(input({ topic_scores: { first_law: 90 }, available_minutes: 0 }), demoCourse()).status, 'target_met');
  assert.equal(generateStudyPlan(input({ topic_scores: { first_law: 20 }, available_minutes: 0 }), demoCourse()).status, 'no_study_time');
});

test('equal priority scores retain course configuration order', () => {
  const course = demoCourse();
  const scores = { first_law: 60, second_law: 60, entropy: 80, rankine_cycle: 60 };
  const plan = generateStudyPlan(input({ topic_scores: scores }), course);
  assert.deepEqual(topicOrder(plan), ['first_law', 'second_law', 'rankine_cycle']);
  course.topics.reverse();
  const reversed = generateStudyPlan(input({ topic_scores: scores }), course);
  assert.deepEqual(topicOrder(reversed), ['rankine_cycle', 'second_law', 'first_law']);
});

test('mathematically tied decimal priorities preserve configuration order despite floating point rounding', () => {
  const plan = generateStudyPlan(input({
    topic_scores: { first_law: 77, second_law: 80, entropy: 66.5, rankine_cycle: 80 },
  }), demoCourse());
  assert.deepEqual(topicOrder(plan), ['first_law', 'entropy']);
  assert.ok(Math.abs(analysis(plan, 'first_law').priority_score - 0.9) < 1e-14);
  assert.ok(Math.abs(analysis(plan, 'entropy').priority_score - 0.9) < 1e-14);
});

test('zero-importance topics with observed deficits remain eligible after positive priorities', () => {
  const course = demoCourse();
  course.topics[0].importance = 0;
  course.topics[3].importance = 0.6;
  const plan = generateStudyPlan(input({
    available_minutes: 600,
    topic_scores: { first_law: 0, second_law: 79, entropy: 80, rankine_cycle: 80 },
  }), course);
  assert.equal(analysis(plan, 'first_law').priority_score, 0);
  assert.deepEqual(topicOrder(plan), ['second_law', 'first_law']);
});

test('a tiny positive priority still precedes zero importance', () => {
  const course = demoCourse();
  course.topics.forEach((topic, index) => { topic.importance = [0, 1e-20, 0, 1][index]; });
  const plan = generateStudyPlan(input({
    topic_scores: { first_law: 0, second_law: 79, entropy: 80, rankine_cycle: 80 },
  }), course);
  assert.deepEqual(topicOrder(plan), ['second_law', 'first_law']);
  assert.ok(analysis(plan, 'second_law').priority_score > 0);
});

test('non-multiple estimates round down and an unallocatable high priority does not block later work', () => {
  const course = demoCourse();
  course.topics[0].estimated_minutes = 20;
  course.topics[1].estimated_minutes = 45;
  const plan = generateStudyPlan(input({
    topic_scores: { first_law: 0, second_law: 0, entropy: 80, rankine_cycle: 80 },
  }), course);
  assert.deepEqual(topicOrder(plan), ['second_law']);
  assert.equal(plan.priorities[0].duration_minutes, 30);
  assert.match(plan.priorities[0].reason, /partial/i);
  assert.equal(plan.unused_minutes, 150);
  const onlyTiny = generateStudyPlan(input({
    topic_scores: { first_law: 0, second_law: 80, entropy: 80, rankine_cycle: 80 },
  }), course);
  assert.equal(onlyTiny.status, 'insufficient_block_time');
  assert.deepEqual(onlyTiny.priorities, []);
});

test('different configured durations affect priority scores, not just task length', () => {
  const course = demoCourse();
  course.topics[3].estimated_minutes = 180;
  const plan = generateStudyPlan(input(), course);
  assert.equal(analysis(plan, 'rankine_cycle').priority_score, 3);
  assert.equal(plan.priorities[0].topic_id, 'second_law');
  assert.deepEqual(topicOrder(plan), ['second_law', 'entropy', 'rankine_cycle']);
});

test('invalid scores, targets and budgets return field-specific validation errors', () => {
  for (const score of [-1, 101, NaN, Infinity, '50', false, {}, []]) {
    validationError(() => generateStudyPlan(input({ topic_scores: { first_law: score } }), demoCourse()), 'first_law');
  }
  for (const target_score of [-1, 101, NaN, Infinity, '80', null]) {
    validationError(() => generateStudyPlan(input({ target_score }), demoCourse()), 'target_score');
  }
  for (const available_minutes of [-1, NaN, Infinity, '180', null, Number.MAX_SAFE_INTEGER + 1]) {
    validationError(() => generateStudyPlan(input({ available_minutes }), demoCourse()), 'available_minutes');
  }
});

test('invalid course weights and durations return clear configuration errors', () => {
  for (const estimated_minutes of [0, -30, NaN, Infinity, '60', Number.MIN_VALUE]) {
    const course = demoCourse();
    course.topics[0].estimated_minutes = estimated_minutes;
    validationError(() => generateStudyPlan(input(), course), 'estimated_minutes');
  }
  for (const importance of [-0.1, NaN, Infinity, '0.3']) {
    const course = demoCourse();
    course.topics[0].importance = importance;
    validationError(() => generateStudyPlan(input(), course), 'importance');
  }
  const wrongSum = demoCourse();
  wrongSum.topics[0].importance = 0.2;
  validationError(() => generateStudyPlan(input(), wrongSum));
  const smallRoundingError = demoCourse();
  smallRoundingError.topics[0].importance += 1e-10;
  assert.equal(generateStudyPlan(input(), smallRoundingError).status, 'ready');
});

test('unknown score IDs, duplicate course IDs and mismatching course input are rejected', () => {
  validationError(() => generateStudyPlan(input({ topic_scores: { quantum_theory: 40 } }), demoCourse()), 'quantum_theory');
  const duplicate = demoCourse();
  duplicate.topics[1].topic_id = 'first_law';
  validationError(() => generateStudyPlan(input(), duplicate), 'topic_id');
  validationError(() => generateStudyPlan(input({ course_id: 'another_course' }), demoCourse()), 'course_id');
  validationError(() => generateStudyPlan(input(), { course_id: 'thermodynamics_demo', topics: [] }), 'topics');
});

test('required student, assessment and resource identifiers are validated', () => {
  for (const field of ['student_id', 'course_id', 'assessment_id']) {
    for (const value of ['', '  ', 12, null, '\ud800']) {
      validationError(() => generateStudyPlan(input({ [field]: value }), demoCourse()), field);
    }
  }
  for (const field of ['topic_id', 'topic_name', 'resource_id', 'resource_ref', 'activity']) {
    const course = demoCourse();
    course.topics[0][field] = '';
    validationError(() => generateStudyPlan(input(), course), field);
  }
});

test('exam dates are metadata with real Gregorian date validation', () => {
  for (const exam_date of ['2026-02-29', '2026-04-31', '2026-13-01', '20/09/2026', '', 123]) {
    validationError(() => generateStudyPlan(input({ exam_date }), demoCourse()), 'exam_date');
  }
  const leap = generateStudyPlan(input({ exam_date: '2028-02-29' }), demoCourse());
  assert.equal(leap.exam_date, '2028-02-29');
  const noDate = input();
  delete noDate.exam_date;
  assert.equal(generateStudyPlan(noDate, demoCourse()).exam_date, null);
  assert.equal(generateStudyPlan(input({ exam_date: null }), demoCourse()).exam_date, null);
});

test('extension metadata is allowed without changing algorithmic results', () => {
  const request = input();
  const course = demoCourse();
  const reference = generateStudyPlan(request, course);
  request.external_reference = 'upstream-123';
  course.department = 'Demo engineering';
  course.topics[0].notes = 'Optional team metadata';
  assert.deepEqual(generateStudyPlan(request, course), reference);
});

test('the output contract includes required fields and initial-plan semantics', () => {
  const plan = generateStudyPlan(input(), demoCourse());
  for (const field of [
    'schema_version', 'student_id', 'course_id', 'assessment_id', 'status', 'overall_score',
    'target_score', 'available_minutes', 'total_planned_minutes', 'unused_minutes',
    'topic_analysis', 'priorities', 'summary', 'explanation_mode', 'plan_changed', 'changes', 'warnings',
  ]) assert.ok(Object.hasOwn(plan, field), `Missing ${field}`);
  assert.equal(plan.schema_version, '1.0');
  assert.equal(plan.explanation_mode, 'template');
  assert.equal(plan.plan_changed, true);
  assert.equal(plan.changes.type, 'initial_plan');
  for (const task of plan.priorities) {
    for (const field of ['task_id', 'topic_id', 'topic_name', 'priority', 'duration_minutes', 'resource_id', 'resource_ref', 'activity', 'reason']) {
      assert.ok(Object.hasOwn(task, field), `Task missing ${field}`);
    }
    assert.equal(task.task_type, 'remedial');
    assert.equal(Object.hasOwn(task, 'calendar_event_id'), false);
  }
  const empty = generateStudyPlan(input({ available_minutes: 0 }), demoCourse());
  assert.equal(empty.plan_changed, true);
  assert.equal(empty.changes.type, 'initial_plan');
  assert.equal(empty.changes.first_priority_changed, false);
});

test('generation is deterministic and leaves frozen input, course and previous plan unchanged', () => {
  const request = deepFreeze(input());
  const course = deepFreeze(demoCourse());
  const previous = deepFreeze(generateStudyPlan(request, course));
  const before = JSON.stringify({ request, course, previous });
  const first = generateStudyPlan(request, course, previous);
  const second = generateStudyPlan(request, course, previous);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify({ request, course, previous }), before);
  assert.notEqual(first.priorities, previous.priorities);
  assert.equal(first.plan_changed, false);
});

test('task IDs survive ranking, duration and assessment changes', () => {
  const first = generateStudyPlan(input(), demoCourse());
  const later = generateStudyPlan(input({
    assessment_id: 'entirely_new_quiz', available_minutes: 180,
    topic_scores: { first_law: 85, second_law: 62, entropy: 40, rankine_cycle: 78 },
  }), demoCourse());
  for (const task of first.priorities) {
    assert.equal(later.priorities.find((next) => next.topic_id === task.topic_id).task_id, task.task_id);
  }
});

test('task identities distinguish students and courses, support Unicode and avoid delimiter collisions', () => {
  function firstTask(student_id, course_id) {
    const course = demoCourse();
    course.course_id = course_id;
    return generateStudyPlan(input({ student_id, course_id }), course).priorities[0].task_id;
  }
  const ids = [firstTask('a:b', 'c'), firstTask('a', 'b:c'), firstTask('学生🙂', '热力学 / demo'), firstTask('other', 'b:c')];
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(firstTask('学生🙂', '热力学 / demo'), ids[2]);
});

test('identical plans compare unchanged and comparison does not mutate frozen plans', () => {
  const previous = deepFreeze(generateStudyPlan(input(), demoCourse()));
  const next = deepFreeze(clone(previous));
  const before = JSON.stringify({ previous, next });
  const result = comparePlans(previous, next);
  assert.equal(result.plan_changed, false);
  assert.equal(result.changes.type, 'unchanged_plan');
  assert.equal(result.changes.first_priority_changed, false);
  assert.equal(result.changes.task_order_changed, false);
  assert.deepEqual(result.changes.tasks_added, []);
  assert.deepEqual(result.changes.tasks_removed, []);
  assert.deepEqual(result.changes.duration_changes, []);
  assert.deepEqual(result.changes.resource_changes, []);
  assert.equal(JSON.stringify({ previous, next }), before);
});

test('a changed lower task duration is detected when the first priority stays the same', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  const next = generateStudyPlan(input({ available_minutes: 150 }), demoCourse(), previous);
  assert.equal(next.priorities[0].task_id, previous.priorities[0].task_id);
  assert.equal(next.changes.first_priority_changed, false);
  assert.equal(next.plan_changed, true);
  assert.equal(next.changes.duration_changes.length, 1);
  assert.deepEqual(next.changes.duration_changes[0], {
    task_id: previous.priorities[2].task_id, previous_minutes: 60, new_minutes: 30,
  });
});

test('reordering lower tasks is detected independently of the first priority', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  const next = clone(previous);
  [next.priorities[1], next.priorities[2]] = [next.priorities[2], next.priorities[1]];
  next.priorities.forEach((task, index) => { task.priority = index + 1; });
  const result = comparePlans(previous, next);
  assert.equal(result.plan_changed, true);
  assert.equal(result.changes.first_priority_changed, false);
  assert.equal(result.changes.task_order_changed, true);
  assert.deepEqual(result.changes.tasks_added, []);
  assert.deepEqual(result.changes.tasks_removed, []);
});

test('adding and removing tasks is reported using stable task IDs', () => {
  const short = generateStudyPlan(input({ available_minutes: 120 }), demoCourse());
  const long = generateStudyPlan(input(), demoCourse());
  const added = comparePlans(short, long);
  assert.equal(added.plan_changed, true);
  assert.deepEqual(added.changes.tasks_added, [long.priorities[2].task_id]);
  assert.deepEqual(added.changes.tasks_removed, []);
  assert.equal(added.changes.first_priority_changed, false);
  assert.equal(added.changes.task_order_changed, false);
  const removed = comparePlans(long, short);
  assert.deepEqual(removed.changes.tasks_removed, [long.priorities[2].task_id]);
  assert.deepEqual(removed.changes.tasks_added, []);
  assert.equal(removed.changes.task_order_changed, false);
});

test('resource IDs and resource references each independently trigger executable changes', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  for (const field of ['resource_id', 'resource_ref']) {
    const next = clone(previous);
    next.priorities[1][field] += '_revised';
    const result = comparePlans(previous, next);
    assert.equal(result.plan_changed, true);
    assert.equal(result.changes.first_priority_changed, false);
    assert.deepEqual(result.changes.resource_changes, [{
      task_id: previous.priorities[1].task_id,
      previous_resource_id: previous.priorities[1].resource_id,
      new_resource_id: next.priorities[1].resource_id,
      previous_resource_ref: previous.priorities[1].resource_ref,
      new_resource_ref: next.priorities[1].resource_ref,
    }]);
  }
});

test('activity and task title changes trigger executable updates', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  const changedActivity = clone(previous);
  changedActivity.priorities[1].activity = 'Complete a different set of demo practice questions.';
  const activityResult = comparePlans(previous, changedActivity);
  assert.equal(activityResult.plan_changed, true);
  assert.equal(activityResult.changes.activity_changes.length, 1);
  assert.equal(activityResult.changes.activity_changes[0].task_id, previous.priorities[1].task_id);
  const changedTitle = clone(previous);
  changedTitle.priorities[1].topic_name = 'Second Law — updated task title';
  const titleResult = comparePlans(previous, changedTitle);
  assert.equal(titleResult.plan_changed, true);
  assert.equal(titleResult.changes.task_details_changes.length, 1);
});

test('assessment, summary, reason and exam metadata alone do not change executable tasks', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  const next = clone(previous);
  next.assessment_id = 'new_assessment';
  next.exam_date = '2026-10-01';
  next.summary = 'Same tasks, differently worded explanation.';
  next.priorities.forEach((task) => { task.reason = 'A differently worded explanation of the same work.'; });
  assert.equal(comparePlans(previous, next).plan_changed, false);
});

test('score-only changes are recorded without triggering a calendar task rebuild', () => {
  const previous = generateStudyPlan(input(), demoCourse());
  const next = generateStudyPlan(input({
    assessment_id: 'quiz_02',
    topic_scores: { first_law: 85, second_law: 65, entropy: 35, rankine_cycle: 51 },
  }), demoCourse(), previous);
  assert.equal(next.plan_changed, false);
  assert.equal(next.changes.type, 'unchanged_plan');
  assert.equal(next.changes.score_changes.length, 1);
  assert.equal(next.changes.score_changes[0].topic_id, 'rankine_cycle');
  assert.equal(next.changes.score_changes[0].previous_score, 50);
  assert.equal(next.changes.score_changes[0].new_score, 51);
});

test('score comparisons preserve unknown-to-observed transitions', () => {
  const previous = generateStudyPlan(input({ topic_scores: {} }), demoCourse());
  const next = generateStudyPlan(input({ topic_scores: { first_law: 90 } }), demoCourse(), previous);
  assert.equal(next.plan_changed, false);
  assert.ok(next.changes.score_changes.some((change) => (
    change.topic_id === 'first_law' && change.previous_score === null && change.new_score === 90
  )));
});

test('previous plans from a different student or course are rejected by both public entry points', () => {
  const next = generateStudyPlan(input(), demoCourse());
  for (const field of ['student_id', 'course_id']) {
    const previous = clone(next);
    previous[field] = 'another_identity';
    validationError(() => comparePlans(previous, next), field);
    validationError(() => generateStudyPlan(input(), demoCourse(), previous), field);
  }
});

test('malformed persisted plans are rejected instead of silently treated as new plans', () => {
  const valid = generateStudyPlan(input(), demoCourse());
  const invalidPlans = [undefined, {}, [], 'not-a-plan'];
  for (const value of invalidPlans) {
    // Undefined is valid only as the omitted generateStudyPlan optional argument;
    // an explicitly passed invalid previous object must not be accepted by comparePlans.
    validationError(() => comparePlans(value, valid));
  }
  const corruptions = [
    (plan) => { plan.schema_version = 'unsupported'; },
    (plan) => { plan.priorities = null; },
    (plan) => { delete plan.priorities[0].task_id; },
    (plan) => { plan.priorities[0].duration_minutes = 31; },
    (plan) => { plan.priorities[0].priority = 2; },
    (plan) => { plan.priorities[1].task_id = plan.priorities[0].task_id; },
    (plan) => { plan.priorities[1].topic_id = plan.priorities[0].topic_id; },
    (plan) => { plan.priorities[0].resource_ref = ''; },
    (plan) => { plan.priorities[0].activity = ''; },
    (plan) => { plan.topic_analysis[0].observed_score = 101; },
    (plan) => { plan.topic_analysis[1].topic_id = plan.topic_analysis[0].topic_id; },
  ];
  for (const corrupt of corruptions) {
    const malformed = clone(valid);
    corrupt(malformed);
    validationError(() => comparePlans(malformed, valid));
    validationError(() => generateStudyPlan(input(), demoCourse(), malformed));
  }
  validationError(() => comparePlans(valid, {}));
});

test('explanation generation is independent, deterministic and grounded in the current tasks', () => {
  const plan = deepFreeze(generateStudyPlan(input(), demoCourse()));
  const before = JSON.stringify(plan);
  const explanation = explainPlan(plan);
  assert.equal(explanation.explanation_mode, 'template');
  assert.equal(typeof explanation.summary, 'string');
  assert.match(explanation.summary, /Rankine Cycle/i);
  assert.equal(explanation.priorities.length, plan.priorities.length);
  for (const [index, task] of explanation.priorities.entries()) {
    assert.equal(task.task_id, plan.priorities[index].task_id);
    assert.equal(task.duration_minutes, plan.priorities[index].duration_minutes);
    assert.equal(task.resource_ref, plan.priorities[index].resource_ref);
    assert.equal(typeof task.reason, 'string');
    assert.ok(task.reason.length > 20);
  }
  assert.deepEqual(explainPlan(plan), explanation);
  assert.equal(JSON.stringify(plan), before);
  assert.match(explanation.summary, /does not.*(?:predict|guarantee)/i);
  assert.doesNotMatch(JSON.stringify(explanation), /scientifically proven|prerequisites? (?:are |have been )?(?:met|satisfied)/i);
});

test('core runs without API keys, runtime filesystem access, network, randomness or current time', () => {
  const script = `
    const { generateStudyPlan } = require(${JSON.stringify(require.resolve('../index'))});
    const blocked = () => { throw new Error('Unexpected external or nondeterministic access'); };
    for (const name of ['http', 'https', 'net', 'tls', 'dgram']) {
      const module = require('node:' + name);
      for (const method of ['request', 'get', 'connect', 'createConnection', 'createSocket']) {
        if (typeof module[method] === 'function') module[method] = blocked;
      }
    }
    const fs = require('node:fs');
    for (const method of ['readFileSync', 'readFile', 'writeFileSync', 'writeFile', 'openSync', 'open', 'readdirSync', 'statSync']) fs[method] = blocked;
    for (const method of ['readFile', 'writeFile', 'open', 'readdir', 'stat']) fs.promises[method] = blocked;
    globalThis.fetch = blocked;
    Math.random = blocked;
    Date.now = blocked;
    const result = generateStudyPlan(${JSON.stringify(input())}, ${JSON.stringify(demoCourse())});
    process.stdout.write(JSON.stringify({first: result.priorities[0].topic_id, total: result.total_planned_minutes}));
  `;
  const result = spawnSync(process.execPath, ['-e', script], { env: {}, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.deepEqual(JSON.parse(result.stdout), { first: 'rankine_cycle', total: 180 });
});
