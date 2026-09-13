'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createNavigationDemoHandler } = require('../api/navigation-demo');
function call(query = '', method = 'GET', instant = '2026-09-13T00:00:00Z') {
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
  createNavigationDemoHandler({ now: () => new Date(instant) })({ method, url: '/api/navigation-demo' + query }, res);
  return res;
}
test('public navigation uses the real private route formula and no stored personal data', () => {
  const baseline = call(); const urgent = call('?urgency=soon');
  assert.equal(baseline.statusCode, 200); assert.equal(baseline.headers['Cache-Control'], 'no-store');
  assert.equal(baseline.body.source, 'synthetic'); assert.equal(baseline.body.persisted, false);
  assert.equal(baseline.body.navigation.sessions[0].topicId, 'rankine_cycle');
  assert.equal(urgent.body.navigation.sessions[0].topicId, 'second_law');
  assert.equal(urgent.body.navigation.sessions[0].priority.score, 13.5);
});
test('the synthetic clock stays at Sydney noon so evening visitors can inspect today’s short-sleep schedule', () => {
  const morning = call('?sleep=short_sleep&urgency=today', 'GET', '2026-09-12T20:00:00Z');
  const evening = call('?sleep=short_sleep&urgency=today', 'GET', '2026-09-13T13:59:00Z');
  assert.deepEqual(evening.body, morning.body);
  assert.deepEqual(evening.body.simulationClock, { date: '2026-09-13', time: '12:00', timezone: 'Australia/Sydney' });
  assert.equal(evening.body.navigation.generatedAt, '2026-09-13T02:00:00.000Z');
  const today = evening.body.navigation.sessions.filter(session => session.date === '2026-09-13');
  assert.ok(today.length > 0);
  assert.equal(today[0].time, '18:00');
  assert.ok(today.every(session => session.durationMinutes <= 20));
  assert.ok(today.reduce((sum, session) => sum + session.durationMinutes + session.breakMinutes, 0) <= 60);
});
test('the simulation uses the actual Sydney date and resolves noon across year and DST boundaries', () => {
  for (const [instant, date, generatedAt] of [
    ['2026-09-13T14:01:00Z', '2026-09-14', '2026-09-14T02:00:00.000Z'],
    ['2026-10-03T23:30:00Z', '2026-10-04', '2026-10-04T01:00:00.000Z'],
    ['2027-04-03T23:30:00Z', '2027-04-04', '2027-04-04T02:00:00.000Z'],
    ['2026-12-31T13:30:00Z', '2027-01-01', '2027-01-01T01:00:00.000Z'],
  ]) {
    const response = call('', 'GET', instant);
    assert.equal(response.body.simulationClock.date, date);
    assert.equal(response.body.navigation.windowStart, date);
    assert.equal(response.body.navigation.generatedAt, generatedAt);
  }
});
test('deadline, sleep, teacher feedback, completion and reassessment reroute the public scenario', () => {
  const sleep = call('?sleep=short_sleep').body.navigation;
  assert.ok(sleep.sessions.filter(s => s.date === sleep.windowStart).every(s => s.durationMinutes <= 20));
  assert.equal(call('?feedback=units').body.navigation.sessions[1].topicId, 'entropy');
  assert.equal(call('?preset=alex2').body.navigation.sessions[0].topicId, 'second_law');
  const completed = call('?completed=1').body.navigation;
  assert.equal(completed.sessions.filter(s => s.completed).length, 1);
  assert.equal(completed.summary.what.en, 'Second law');
  assert.equal(call().body.navigation.sessions.filter(s => s.completed).length, 0);
});
test('public demo accepts only finite presets and refuses real identities, health values and writes', () => {
  for (const query of ['?studentId=someone', '?sleep=5.2', '?preset=alex1&preset=sarah1', '?urgency=-1', '?context={}']) assert.equal(call(query).statusCode, 400);
  assert.equal(call('', 'POST').statusCode, 405);
});
