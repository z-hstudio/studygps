'use strict';

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
}
function finiteRange(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be a finite number.`);
  if (value < min || value > max) throw new RangeError(`${label} must be between ${min} and ${max}.`);
}
function civilMinutes(date, time, label) {
  if (typeof date !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError(`${label} date must use YYYY-MM-DD.`);
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new TypeError(`${label} time must use HH:mm.`);
  // UTC is used only as a stable calendar-arithmetic coordinate. Inputs are
  // already the learner's local civil date/time, not UTC instants. This measures
  // planning days, not physical elapsed time across daylight-saving transitions.
  const instant = Date.parse(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== date) throw new RangeError(`${label} date must be a real calendar date.`);
  return instant / 60000;
}

/**
 * Priority = Weakness × Impact × Urgency.
 * Urgency multipliers are transparent product-planning rules, not research-
 * established optimal intervals or predictions of a student's learning ability.
 */
function calculateStudyPriority(input) {
  record(input, 'Priority input');
  const { observedScore, targetScore, impact, deadline = null, current } = input;
  if (observedScore !== null) finiteRange(observedScore, 'Observed score', 0, 100);
  finiteRange(targetScore, 'Target score', 0, 100);
  finiteRange(impact, 'Impact', 0, 1);
  record(current, 'Current local time');
  const currentMinute = civilMinutes(current.date, current.time, 'Current');
  let daysRemaining = null;
  let deadlineStatus = 'none';
  let urgency = 1;
  if (deadline !== null) {
    record(deadline, 'Deadline');
    const dueMinute = civilMinutes(deadline.dueDate, deadline.dueTime, 'Deadline');
    const difference = dueMinute - currentMinute;
    daysRemaining = Math.max(0, difference / 1440);
    deadlineStatus = difference <= 0 ? 'overdue' : 'upcoming';
    urgency = daysRemaining <= 1 ? 4 : daysRemaining <= 3 ? 3 : daysRemaining <= 7 ? 2 : daysRemaining <= 14 ? 1.5 : 1;
  }
  const weakness = observedScore === null ? null : Math.max(0, targetScore - observedScore);
  return { weakness, impact, urgency, score: weakness === null ? null : weakness * impact * urgency, daysRemaining, deadlineStatus };
}

module.exports = { calculateStudyPriority };
