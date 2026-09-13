'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateStudyPriority } = require('../server/study-priority');
const base = { observedScore: 50, targetScore: 80, impact: 0.3, deadline: null, current: { date: '2026-09-13', time: '12:00' } };
function dueAfterMinutes(count) {
  const date = new Date(Date.parse('2026-09-13T12:00:00.000Z') + count * 60000);
  return { dueDate: date.toISOString().slice(0, 10), dueTime: date.toISOString().slice(11, 16) };
}

test('priority multiplies the score gap, configured impact and deadline urgency', () => {
  assert.deepEqual(calculateStudyPriority(base), { weakness: 30, impact: 0.3, urgency: 1, score: 9, daysRemaining: null, deadlineStatus: 'none' });
  assert.deepEqual(calculateStudyPriority({ ...base, deadline: dueAfterMinutes(720) }), { weakness: 30, impact: 0.3, urgency: 4, score: 36, daysRemaining: 0.5, deadlineStatus: 'upcoming' });
});

test('missing scores remain unknown instead of becoming a fabricated zero result', () => {
  const result = calculateStudyPriority({ ...base, observedScore: null, deadline: dueAfterMinutes(2880) });
  assert.equal(result.weakness, null);
  assert.equal(result.score, null);
  assert.equal(result.impact, 0.3);
  assert.equal(result.urgency, 3);
  assert.equal(result.daysRemaining, 2);
});

test('target-met scores clamp weakness to zero while an observed zero remains real evidence', () => {
  for (const observedScore of [80, 100]) {
    const result = calculateStudyPriority({ ...base, observedScore, deadline: dueAfterMinutes(1) });
    assert.equal(result.weakness, 0);
    assert.equal(result.score, 0);
  }
  assert.equal(calculateStudyPriority({ ...base, observedScore: 0 }).weakness, 80);
  assert.equal(calculateStudyPriority({ ...base, impact: 0 }).score, 0);
  assert.equal(calculateStudyPriority({ ...base, observedScore: 0, targetScore: 100, impact: 1, deadline: dueAfterMinutes(1) }).score, 400);
});

test('each urgency threshold is inclusive and changes immediately after the boundary minute', () => {
  for (const [days, at, after] of [[1, 4, 3], [3, 3, 2], [7, 2, 1.5], [14, 1.5, 1]]) {
    const boundary = calculateStudyPriority({ ...base, deadline: dueAfterMinutes(days * 1440) });
    const oneMinuteLater = calculateStudyPriority({ ...base, deadline: dueAfterMinutes(days * 1440 + 1) });
    assert.equal(boundary.urgency, at);
    assert.equal(boundary.daysRemaining, days);
    assert.equal(oneMinuteLater.urgency, after);
    assert.ok(oneMinuteLater.daysRemaining > days);
    assert.equal(oneMinuteLater.deadlineStatus, 'upcoming');
  }
});

test('the current deadline minute and past deadlines are overdue with nonnegative remaining days', () => {
  for (const minutes of [0, -1, -1440, -90 * 1440]) {
    const result = calculateStudyPriority({ ...base, deadline: dueAfterMinutes(minutes) });
    assert.equal(result.deadlineStatus, 'overdue');
    assert.equal(result.daysRemaining, 0);
    assert.equal(result.urgency, 4);
  }
  const future = calculateStudyPriority({ ...base, deadline: dueAfterMinutes(1) });
  assert.equal(future.deadlineStatus, 'upcoming');
  assert.equal(future.daysRemaining, 1 / 1440);
});

test('civil-calendar differences handle leap days, year boundaries and midnight without time-zone assumptions', () => {
  for (const [current, deadline, expected] of [
    [{ date: '2028-02-28', time: '12:00' }, { dueDate: '2028-03-01', dueTime: '12:00' }, 2],
    [{ date: '2026-12-31', time: '23:30' }, { dueDate: '2027-01-01', dueTime: '00:30' }, 1 / 24],
    [{ date: '2026-10-03', time: '12:00' }, { dueDate: '2026-10-04', dueTime: '12:00' }, 1],
  ]) assert.equal(calculateStudyPriority({ ...base, current, deadline }).daysRemaining, expected);
});

test('fractional scores and impacts are kept precise and inputs are not mutated', () => {
  const input = { ...base, observedScore: 62.5, targetScore: 82.25, impact: 0.15, deadline: dueAfterMinutes(8 * 1440) };
  const snapshot = structuredClone(input);
  const first = calculateStudyPriority(input);
  assert.equal(first.weakness, 19.75);
  assert.ok(Math.abs(first.score - 4.44375) < 1e-12);
  assert.deepEqual(calculateStudyPriority(input), first);
  assert.deepEqual(input, snapshot);
});

test('scores and impact reject non-finite, coerced or out-of-range values', () => {
  for (const field of ['observedScore', 'targetScore']) {
    for (const value of [-1, 101, NaN, Infinity, -Infinity, '50', true, {}, undefined]) assert.throws(() => calculateStudyPriority({ ...base, [field]: value }));
  }
  assert.throws(() => calculateStudyPriority({ ...base, targetScore: null }));
  for (const impact of [-0.1, 1.01, NaN, Infinity, '0.3', null, undefined]) assert.throws(() => calculateStudyPriority({ ...base, impact }));
});

test('both current and deadline require real dates and strict local HH:mm values', () => {
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-09-00', '0000-01-01', '2026-9-13', '2026-09-13T00:00Z', undefined]) {
    assert.throws(() => calculateStudyPriority({ ...base, current: { date, time: '12:00' } }));
    assert.throws(() => calculateStudyPriority({ ...base, deadline: { dueDate: date, dueTime: '12:00' } }));
  }
  for (const time of ['24:00', '12:60', '1:00', '12:00:00', '12:00Z', ' 12:00', 1200, undefined]) {
    assert.throws(() => calculateStudyPriority({ ...base, current: { date: '2026-09-13', time } }));
    assert.throws(() => calculateStudyPriority({ ...base, deadline: { dueDate: '2026-09-14', dueTime: time } }));
  }
});

test('malformed input records are rejected without consulting the system clock', () => {
  for (const input of [undefined, null, [], 'priority']) assert.throws(() => calculateStudyPriority(input));
  for (const current of [null, [], {}, undefined]) assert.throws(() => calculateStudyPriority({ ...base, current }));
  for (const deadline of [[], false, 'tomorrow', {}]) assert.throws(() => calculateStudyPriority({ ...base, deadline }));
});
