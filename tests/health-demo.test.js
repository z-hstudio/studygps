'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHealthDemo } = require('../server/health-demo');

test('health demo: off is the default and never implies a live connection', () => {
  const demo = buildHealthDemo();
  assert.equal(demo.scenario, 'off');
  assert.equal(demo.source, 'synthetic');
  assert.equal(demo.connected, false);
  assert.deepEqual(demo.samples, []);
  assert.equal(demo.latest, null);
  assert.deepEqual(demo.adjustment, { focusCapMinutes: null, todayBudgetFactor: 1 });
});

test('health demo: absent data does not infer poor sleep or reduce study time', () => {
  const demo = buildHealthDemo({ scenario: 'no_data', date: '2026-09-13' });
  assert.equal(demo.connected, false);
  assert.deepEqual(demo.samples, []);
  assert.equal(demo.latest, null);
  assert.deepEqual(demo.adjustment, { focusCapMinutes: null, todayBudgetFactor: 1 });
  assert.match(demo.message.en, /missing records do not indicate short sleep or denied access/);
});

test('health demo: seven fictional dated samples handle leap-day and year boundaries', () => {
  const leap = buildHealthDemo({ scenario: 'rested', date: '2024-03-02' });
  assert.deepEqual(leap.samples.map(sample => sample.date), ['2024-02-25', '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02']);
  const year = buildHealthDemo({ scenario: 'rested', date: '2026-01-03' });
  assert.equal(year.samples[0].date, '2025-12-28');
  assert.equal(year.latest.date, '2026-01-03');
  assert.equal(year.latest.sleepHours, 7.8);
  assert.deepEqual(year.adjustment, { focusCapMinutes: null, todayBudgetFactor: 1 });
  assert.match(year.message.en, /Dates and values are fictional/);
});

test('health demo: only the short-sleep scenario requests a current-day adjustment', () => {
  const rested = buildHealthDemo({ scenario: 'rested', date: '2026-09-13' });
  const short = buildHealthDemo({ scenario: 'short_sleep', date: '2026-09-13' });
  assert.equal(short.latest.sleepHours, 5.2);
  assert.ok(short.samples.slice(0, 6).every(sample => sample.sleepHours >= 7 && sample.sleepHours < 8));
  assert.deepEqual(short.adjustment, { focusCapMinutes: 20, todayBudgetFactor: 0.5 });
  assert.match(short.message.en, /Only today/);
  assert.match(short.message.zh, /仅今天/);
  assert.deepEqual(short.samples.map(sample => sample.oxygenPercent), rested.samples.map(sample => sample.oxygenPercent));
  assert.match(short.message.en, /Oxygen does not change the plan/);
});

test('health demo: reject unrecognised scenarios, real values and malformed dates', () => {
  for (const scenario of ['live', 'normal', 'SHORT_SLEEP', '', null, 5, {}, '__proto__']) {
    assert.throws(() => buildHealthDemo({ scenario, date: '2026-09-13' }), TypeError);
  }
  for (const extra of [{ sleepHours: 4 }, { oxygenPercent: 88 }, { samples: [] }, { connected: true }, { source: 'healthkit' }]) {
    assert.throws(() => buildHealthDemo({ scenario: 'rested', date: '2026-09-13', ...extra }), TypeError);
  }
  for (const date of ['2026-02-29', '2026-09-31', '2026-9-13', '0000-01-01', '2026-09-13T00:00:00Z', null, 123]) {
    assert.throws(() => buildHealthDemo({ scenario: 'rested', date }), TypeError);
  }
  assert.throws(() => buildHealthDemo({ scenario: 'rested' }), TypeError);
  assert.throws(() => buildHealthDemo([]), TypeError);
  assert.throws(() => buildHealthDemo(null), TypeError);
  assert.throws(() => buildHealthDemo({ scenario: 'rested', date: '0001-01-01' }), RangeError);
});

test('health demo: calls have independent samples, messages and adjustments', () => {
  const first = buildHealthDemo({ scenario: 'short_sleep', date: '2026-09-13' });
  first.samples[0].sleepHours = 0;
  first.latest.sleepHours = 0;
  first.adjustment.todayBudgetFactor = 0;
  first.message.en = 'Changed';
  const second = buildHealthDemo({ scenario: 'short_sleep', date: '2026-09-13' });
  assert.equal(second.samples[0].sleepHours, 7.3);
  assert.equal(second.latest.sleepHours, 5.2);
  assert.equal(second.adjustment.todayBudgetFactor, 0.5);
  assert.match(second.message.en, /^Synthetic demo:/);
});
