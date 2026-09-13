'use strict';

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T12:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const SCENARIOS = new Set(['off', 'no_data', 'rested', 'short_sleep']);
const MESSAGES = {
  off: {
    zh: '健康演示已关闭。未连接 Apple Health，学习安排不受健康数据影响。',
    en: 'Health demo is off. Apple Health is not connected, and health data does not affect the plan.',
  },
  no_data: {
    zh: '合成演示：没有可用记录。保持原有学习安排；无记录不代表睡眠不足，也不证明权限被拒绝。',
    en: 'Synthetic demo: no records are available. Keep the original plan; missing records do not indicate short sleep or denied access.',
  },
  rested: {
    zh: '合成演示：最近一晚睡眠7.8小时，保持原有安排。日期与数值均为虚构；未连接 Apple Health，血氧不参与学习能力判断。',
    en: 'Synthetic demo: the latest night shows 7.8 hours of sleep, so the plan stays unchanged. Dates and values are fictional; Apple Health is not connected. Oxygen does not rate learning ability.',
  },
  short_sleep: {
    zh: '合成演示：最近一晚睡眠5.2小时，仅今天的学习预算减半、专注段上限20分钟。这是产品演示规则；日期与数值均为虚构，血氧不参与调整。',
    en: 'Synthetic demo: the latest night shows 5.2 hours of sleep. Only today uses half the study budget and a 20-minute focus cap. This is a product demo rule; dates and values are fictional. Oxygen does not change the plan.',
  },
};

/**
 * Generate fixed fictional scenarios, never ingest a person's health values.
 * `date` is the planner's local calendar date, supplied explicitly by its caller.
 * The caller applies adjustment only to that date, never to the entire route.
 */
function buildHealthDemo(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(options))) {
    throw new TypeError('Health demo options must be an object.');
  }
  if (Object.keys(options).some(key => key !== 'scenario' && key !== 'date')) {
    throw new TypeError('Health demo accepts only a scenario and date, not health measurements.');
  }
  const { scenario = 'off', date } = options;
  if (!SCENARIOS.has(scenario)) throw new TypeError('Unknown health demo scenario.');
  if (date !== undefined && !isCalendarDate(date)) throw new TypeError('Health demo date must be a real YYYY-MM-DD date.');
  if (scenario !== 'off' && !isCalendarDate(date)) throw new TypeError('An explicit calendar date is required for this health demo.');

  const adjustment = {
    focusCapMinutes: scenario === 'short_sleep' ? 20 : null,
    todayBudgetFactor: scenario === 'short_sleep' ? 0.5 : 1,
  };
  const samples = [];
  if (scenario === 'rested' || scenario === 'short_sleep') {
    const sleepHours = [7.3, 7.7, 7.1, 7.9, 7.5, 7.6, scenario === 'short_sleep' ? 5.2 : 7.8];
    // Identical oxygen samples in both scenarios: display-only, no threshold or inference.
    const oxygenPercent = [98, 97, 98, 99, 97, 98, 98];
    for (let index = 0; index < 7; index++) {
      const day = new Date(date + 'T12:00:00.000Z');
      day.setUTCDate(day.getUTCDate() - (6 - index));
      const sampleDate = day.toISOString().slice(0, 10);
      if (!isCalendarDate(sampleDate)) throw new RangeError('The seven-day demo must stay within the supported calendar.');
      samples.push({ date: sampleDate, sleepHours: sleepHours[index], oxygenPercent: oxygenPercent[index] });
    }
  }
  return {
    source: 'synthetic', connected: false, scenario, samples,
    latest: samples.length ? { ...samples[samples.length - 1] } : null,
    adjustment, message: { ...MESSAGES[scenario] },
  };
}

module.exports = { buildHealthDemo };
