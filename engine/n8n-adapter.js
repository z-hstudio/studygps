'use strict';

const { generateStudyPlan, StudyPlanValidationError } = require('./index');
const { isRecord } = require('./validate-input');

function runCodeNode(items) {
  if (!Array.isArray(items) || items.length !== 1 || !isRecord(items[0]) || !isRecord(items[0].json)) {
    throw new StudyPlanValidationError([{ path: 'items', message: 'Run Once for All Items expects exactly one item with a json object' }]);
  }
  const payload = items[0].json;
  const issues = ['input', 'course', 'previous_plan']
    .filter((key) => !Object.hasOwn(payload, key))
    .map((key) => ({ path: `json.${key}`, message: key === 'previous_plan' ? 'is required; pass null for the first assessment or the full previous plan' : 'is required' }));
  if (issues.length) throw new StudyPlanValidationError(issues);
  if (payload.previous_plan !== null && !isRecord(payload.previous_plan)) throw new StudyPlanValidationError([{ path: 'json.previous_plan', message: 'must be null or a full previous plan object' }]);
  return [{ json: generateStudyPlan(payload.input, payload.course, payload.previous_plan) }];
}

module.exports = { runCodeNode };
