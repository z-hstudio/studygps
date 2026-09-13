'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildNavigation } = require('../server/navigation');
const plan = require('../engine/examples/alex-assessment-1.output.json');

function input(changes = {}) {
  return {
    now: new Date('2026-09-13T00:00:00Z'), profile: { timezone: 'Australia/Sydney', goal: 'Understand energy systems' },
    learning: { plan: structuredClone(plan), scores: { first_law: 85, second_law: 65, entropy: 35, rankine_cycle: 50 }, targetScore: 80, minutes: 180, completedTaskIds: [], updatedAt: '2026-09-12T00:00:00Z' },
    context: {
      semesterGoal: 'Explain thermodynamics', careerGoal: 'Energy engineer', interests: 'Power stations',
      preferredMethod: 'practice', focusMinutes: 25,
      availability: { days: [1, 2, 3, 4, 5, 6, 7], startTime: '18:00', minutesPerDay: 120 },
      goalTopics: [], careerTopics: [], feedback: '', feedbackTopics: [],
      topicProgress: { first_law: 'confident', second_law: 'learning', entropy: 'learning', rankine_cycle: 'learning' }, deadlines: [],
    }, progress: {}, advice: [], ...changes,
  };
}
function deadline(topic, dueDate = '2026-09-14', dueTime = '20:00') {
  return { id: 'exam-one', title: 'Exam preparation', kind: 'exam', dueDate, dueTime, topicIds: [topic], requirements: 'Show the energy balance and units.' };
}
test('navigation is pure, deterministic, bilingual and preserves the legacy plan', () => {
  const args = input(); const before = structuredClone(args);
  const first = buildNavigation(args);
  assert.deepEqual(args, before); assert.deepEqual(first, buildNavigation(args));
  assert.equal(first.summary.what.en, 'Rankine cycle');
  assert.equal(first.sessions.length, 12);
  for (const session of first.sessions) {
    assert.ok(session.title.en && session.title.zh && session.why.length && session.method.en && session.method.zh);
    assert.ok(session.steps.length >= 3 && session.durationMinutes > 0 && 'nextReviewDate' in session);
  }
});
test('context and assessment are required before inventing a calendar', () => {
  for (const args of [input({ learning: null }), input({ context: null }), input({ learning: null, context: null })]) {
    const route = buildNavigation(args); assert.deepEqual(route.sessions, []); assert.ok(route.warnings.length);
  }
});
test('deadline urgency changes the route, requirements become a concrete task step', () => {
  const args = input(); args.context.deadlines = [deadline('second_law')];
  const route = buildNavigation(args); assert.equal(route.sessions[0].topicId, 'second_law');
  assert.ok(route.sessions[0].steps.some(step => step.en.includes('Show the energy balance and units.')));
  for (const session of route.sessions.filter(item => item.deadline && item.date)) assert.ok(`${session.date}T${session.time}` < '2026-09-14T20:00');
});
test('teacher focus and explicit context break formula ties without overriding stronger scored priorities', () => {
  const args = input(); args.advice = [{ focusTopic: 'entropy', message: 'Explain entropy units', createdAt: '2026-09-12T00:00:00Z' }];
  assert.equal(buildNavigation(args).sessions[0].topicId, 'rankine_cycle');
  assert.equal(buildNavigation(args).sessions[1].topicId, 'entropy');
  args.advice = []; args.context.feedbackTopics = ['entropy']; args.context.goalTopics = ['entropy']; args.context.careerTopics = ['entropy'];
  assert.equal(buildNavigation(args).sessions[1].topicId, 'entropy');
  const session = buildNavigation(args).sessions[1];
  assert.ok(session.why.some(reason => reason.en.includes('semester goal')));
  assert.ok(session.steps.some(step => step.en.includes('Energy engineer')));
  args.context.goalTopics = []; args.context.careerTopics = []; args.context.feedbackTopics = [];
  args.advice = [{ focusTopic: 'second_law', message: 'Old', createdAt: '2025-09-12T00:00:00Z' }];
  assert.equal(buildNavigation(args).sessions[0].topicId, 'rankine_cycle');
  assert.equal(buildNavigation(args).sessions[1].topicId, 'second_law');
});
test('unknown scores lead to diagnostic checks rather than zero-score remediation', () => {
  const args = input(); const topic = args.learning.plan.topic_analysis.find(item => item.topic_id === 'entropy');
  Object.assign(topic, { observed_score: null, priority_score: null, target_gap: null });
  const session = buildNavigation(args).sessions.find(item => item.topicId === 'entropy' && item.kind === 'diagnostic');
  assert.ok(session); assert.ok(session.why.some(reason => reason.en.includes('unknown score is not zero')));
});
test('only chosen local weekdays are used with no overlapping focus blocks or breaks', () => {
  const args = input(); args.context.availability = { days: [1, 3], startTime: '19:00', minutesPerDay: 60 };
  const sessions = buildNavigation(args).sessions.filter(item => item.date);
  for (const session of sessions) {
    assert.ok([1, 3].includes(new Date(session.date + 'T12:00:00Z').getUTCDay()));
    assert.ok(session.time >= '19:00');
    const start = Number(session.time.slice(0, 2)) * 60 + Number(session.time.slice(3));
    assert.ok(start + session.durationMinutes + session.breakMinutes <= 1200);
    const next = sessions.find(item => item.date === session.date && item.time > session.time);
    if (next) assert.ok(Number(next.time.slice(0, 2)) * 60 + Number(next.time.slice(3)) >= start + session.durationMinutes + session.breakMinutes);
  }
});
test('no availability and impossible deadlines stay explicitly unscheduled', () => {
  const args = input(); args.context.availability.days = [];
  assert.ok(buildNavigation(args).sessions.every(item => item.date === null && item.time === null));
  args.context.availability.days = [1, 2, 3, 4, 5, 6, 7]; args.context.deadlines = [deadline('rankine_cycle', '2026-09-13', '18:20')];
  const route = buildNavigation(args);
  assert.ok(route.sessions.filter(item => item.topicId === 'rankine_cycle').every(item => item.date === null));
  assert.ok(route.warnings.some(item => item.en.includes('do not fit')));
});
test('past deadlines are identified and current-day sessions never start in the past', () => {
  const args = input({ now: new Date('2026-09-13T08:18:00Z') });
  args.context.deadlines = [deadline('rankine_cycle', '2026-09-13', '17:00')];
  const route = buildNavigation(args);
  assert.ok(route.warnings.some(item => item.en.includes('has passed')));
  assert.ok(route.sessions.filter(item => item.date === '2026-09-13').every(item => item.time >= '18:20'));
});
test('timezone date boundaries and DST use learner-local calendar dates', () => {
  const args = input({ now: new Date('2026-10-03T23:30:00Z') });
  let route = buildNavigation(args);
  assert.equal(route.windowStart, '2026-10-04'); assert.equal(route.sessions[0].date, '2026-10-04');
  args.profile.timezone = 'America/Los_Angeles'; route = buildNavigation(args);
  assert.equal(route.windowStart, '2026-10-03'); assert.equal(route.sessions[0].date, '2026-10-03');
});
test('completion anchors spaced reviews to the real completion date and survives context edits', () => {
  const args = input(); const initial = buildNavigation(args).sessions[0];
  args.progress[initial.id] = { completed: true, completedAt: '2026-09-13T08:25:00Z' };
  args.now = new Date('2026-09-15T00:00:00Z');
  const route = buildNavigation(args); const sessions = route.sessions.filter(item => item.topicId === initial.topicId);
  const completed = sessions.find(item => item.id === initial.id);
  assert.equal(completed.completed, true); assert.equal(completed.date, '2026-09-13');
  const reviews = sessions.filter(item => item.kind === 'review');
  assert.deepEqual(reviews.map(item => item.date), ['2026-09-15', '2026-09-16', '2026-09-20']);
  args.context.goalTopics = ['entropy'];
  assert.equal(buildNavigation(args).sessions.find(item => item.id === initial.id).completed, true);
  args.learning.plan.assessment_id = 'new-assessment';
  assert.ok(buildNavigation(args).sessions.every(item => item.id !== initial.id && !item.completed));
});
test('completed legacy tasks get retrieval checks and do not mark a new focus block complete', () => {
  const args = input(); args.learning.completedTaskIds = [args.learning.plan.priorities[0].task_id];
  const session = buildNavigation(args).sessions.find(item => item.topicId === 'rankine_cycle');
  assert.equal(session.kind, 'review'); assert.equal(session.completed, false);
  assert.ok(session.why.some(item => item.en.includes('course task is complete')));
});
test('method preferences alter activities without changing learning-style or mastery claims', () => {
  const args = input(); args.context.preferredMethod = 'diagram';
  const route = buildNavigation(args);
  assert.ok(route.sessions[0].steps.some(item => item.en.includes('Sketch the relationships')));
  assert.ok(route.sessions[0].steps.some(item => item.en.includes('Close your notes')));
  assert.ok(!JSON.stringify(route).includes('guarantee'));
});
test('synthetic short sleep reduces only today’s focus and total window while preserving deadline priority', () => {
  const args = input(); args.context.healthDemo = 'short_sleep';
  args.context.deadlines = [deadline('second_law')];
  const route = buildNavigation(args);
  assert.equal(route.sessions[0].topicId, 'second_law');
  const today = route.sessions.filter(item => item.date === route.windowStart);
  assert.ok(today.length > 0 && today.every(item => item.durationMinutes <= 20));
  assert.ok(today.reduce((sum, item) => sum + item.durationMinutes + item.breakMinutes, 0) <= 60);
  assert.ok(route.sessions.some(item => item.date > route.windowStart && item.kind === 'learn' && item.durationMinutes === 25));
  assert.equal(route.health.connected, false);
  const noHealth = input(); const baseline = buildNavigation(noHealth);
  noHealth.context.healthDemo = 'no_data'; const missing = buildNavigation(noHealth);
  assert.deepEqual(missing.sessions, baseline.sessions);
  noHealth.context.healthDemo = 'rested'; assert.deepEqual(buildNavigation(noHealth).sessions, baseline.sessions);
});
test('reviews can be completed only after their predecessor and on a later local day', () => {
  const args = input(); let route = buildNavigation(args);
  const first = route.sessions[0]; const reviewId = first.id.replace(/:learn$/, ':review-1');
  assert.equal(route.sessions.find(item => item.id === reviewId).canComplete, false);
  args.progress[first.id] = { completed: true, completedAt: '2026-09-13T00:00:00Z', durationMinutes: 20 };
  route = buildNavigation(args);
  assert.equal(route.sessions.find(item => item.id === first.id).durationMinutes, 20);
  assert.equal(route.sessions.find(item => item.id === reviewId).canComplete, false);
  args.now = new Date('2026-09-13T15:00:00Z'); // Sydney: next calendar day.
  assert.equal(buildNavigation(args).sessions.find(item => item.id === reviewId).canComplete, true);
});
test('completed blocks consume today’s budget even when completed ahead of the planned window', () => {
  const args = input(); args.context.healthDemo = 'short_sleep';
  const initial = buildNavigation(args).sessions[0];
  args.progress[initial.id] = { completed: true, completedAt: args.now.toISOString(), durationMinutes: 20 };
  const route = buildNavigation(args);
  const today = route.sessions.filter(session => session.date === route.windowStart);
  assert.ok(today.reduce((sum, session) => sum + session.durationMinutes + session.breakMinutes, 0) <= 60);
  args.learning.plan.assessment_id = 'new-assessment-same-day';
  const next = buildNavigation(args);
  assert.ok(next.sessions.filter(session => session.date === next.windowStart).reduce((sum, session) => sum + session.durationMinutes + session.breakMinutes, 0) + 25 <= 60);
});
test('actual session order uses weakness times impact times urgency and exposes each factor', () => {
  const args = input(); let route = buildNavigation(args);
  assert.equal(route.sessions[0].priority.score, 30 * 0.3 * 1);
  const ids = route.sessions.map(session => session.id).sort();
  args.context.deadlines = [deadline('second_law', '2026-09-15', '10:00')];
  route = buildNavigation(args);
  assert.equal(route.sessions[0].topicId, 'second_law');
  assert.deepEqual([route.sessions[0].priority.weakness, route.sessions[0].priority.impact, route.sessions[0].priority.urgency, route.sessions[0].priority.score], [15, 0.3, 3, 13.5]);
  assert.deepEqual(route.sessions.map(session => session.id).sort(), ids);
  for (const session of route.sessions) assert.equal(session.priority.score, session.priority.weakness * session.priority.impact * session.priority.urgency);
});
