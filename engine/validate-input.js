'use strict';

class StudyPlanValidationError extends Error {
  constructor(issues) {
    super(`Study plan validation failed: ${issues.map(({ path, message }) => `${path}: ${message}`).join('; ')}`);
    this.name = 'StudyPlanValidationError';
    this.code = 'VALIDATION_ERROR';
    this.issues = issues;
  }
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0 && value.isWellFormed();
const isScore = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const isMissingScore = (value) => value == null || (typeof value === 'string' && value.trim() === '');
const isMinutes = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;

function isExamDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function validateInput(input, course) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  if (!isRecord(input)) add('input', 'must be an object');
  if (!isRecord(course)) add('course', 'must be an object');
  if (issues.length) throw new StudyPlanValidationError(issues);

  for (const key of ['student_id', 'course_id', 'assessment_id']) {
    if (!isText(input[key])) add(`input.${key}`, 'must be a non-empty, well-formed string');
  }
  if (!isScore(input.target_score)) add('input.target_score', 'must be a finite number from 0 to 100');
  if (!isMinutes(input.available_minutes)) add('input.available_minutes', 'must be a finite non-negative number no greater than Number.MAX_SAFE_INTEGER');
  if (input.exam_date != null && !isExamDate(input.exam_date)) add('input.exam_date', 'must be a real calendar date in YYYY-MM-DD format, or null');
  if (!Object.hasOwn(input, 'topic_scores') || (input.topic_scores !== null && !isRecord(input.topic_scores))) add('input.topic_scores', 'must be an object or null; use {} or null for no scores');
  if (!isText(course.course_id)) add('course.course_id', 'must be a non-empty, well-formed string');
  if (input.course_id !== course.course_id) add('input.course_id', 'must match course.course_id');
  if (!Array.isArray(course.topics) || course.topics.length === 0) add('course.topics', 'must be a non-empty array');

  const topicIds = new Set();
  let weightSum = 0;
  if (Array.isArray(course.topics)) {
    // Index iteration also rejects holes in an in-memory array.
    for (let index = 0; index < course.topics.length; index += 1) {
      const topic = course.topics[index];
      const path = `course.topics[${index}]`;
      if (!isRecord(topic)) { add(path, 'must be an object'); continue; }
      for (const key of ['topic_id', 'topic_name', 'resource_id', 'resource_ref', 'activity']) {
        if (!isText(topic[key])) add(`${path}.${key}`, 'must be a non-empty, well-formed string');
      }
      if (topicIds.has(topic.topic_id)) add(`${path}.topic_id`, `duplicate topic_id: ${topic.topic_id}`);
      topicIds.add(topic.topic_id);
      if (typeof topic.importance !== 'number' || !Number.isFinite(topic.importance) || topic.importance < 0 || topic.importance > 1) {
        add(`${path}.importance`, 'must be a finite number from 0 to 1');
      } else { weightSum += topic.importance; }
      if (!isMinutes(topic.estimated_minutes) || topic.estimated_minutes <= 0) {
        add(`${path}.estimated_minutes`, 'must be a finite number greater than 0 and no greater than Number.MAX_SAFE_INTEGER');
      } else if (!Number.isFinite(100 * topic.importance / (topic.estimated_minutes / 60))) {
        add(`${path}.estimated_minutes`, 'is too small to calculate a finite priority score');
      }
    }
    if (Math.abs(weightSum - 1) > 1e-9) add('course.topics.importance', 'weights must sum to 1 (tolerance 1e-9)');
  }
  if (isRecord(input.topic_scores)) {
    for (const topicId of Object.keys(input.topic_scores)) {
      if (!topicIds.has(topicId)) add(`input.topic_scores.${topicId}`, 'unknown topic_id; must exist in course.topics');
      const score = input.topic_scores[topicId];
      if (!isMissingScore(score) && !isScore(score)) add(`input.topic_scores.${topicId}`, 'must be a finite number from 0 to 100, or null/blank for a missing score');
    }
  }
  if (issues.length) throw new StudyPlanValidationError(issues);
}

module.exports = { StudyPlanValidationError, validateInput, isRecord, isText, isScore, isMissingScore };
