'use strict';

const { StudyPlanValidationError, isRecord, isText, isScore } = require('./validate-input');

function validateComparablePlan(plan, label) {
  const issues = [];
  const add = (path, message) => issues.push({ path: `${label}.${path}`, message });
  if (!isRecord(plan)) throw new StudyPlanValidationError([{ path: label, message: 'must be a StudyGPS plan object' }]);
  if (plan.schema_version !== '1.0') add('schema_version', 'must be 1.0; migrate older contracts before comparing');
  for (const key of ['student_id', 'course_id']) if (!isText(plan[key])) add(key, 'must be a non-empty, well-formed string');
  if (!Array.isArray(plan.priorities)) add('priorities', 'must be an array of executable tasks');
  if (!Array.isArray(plan.topic_analysis)) add('topic_analysis', 'must be an array of observed topic results');
  const taskIds = new Set();
  const taskTopics = new Set();
  if (Array.isArray(plan.priorities)) {
    for (let index = 0; index < plan.priorities.length; index += 1) {
      const task = plan.priorities[index];
      const path = `priorities[${index}]`;
      if (!isRecord(task)) { add(path, 'must be a task object'); continue; }
      for (const key of ['task_id', 'topic_id', 'topic_name', 'resource_id', 'resource_ref', 'activity']) {
        if (!isText(task[key])) add(`${path}.${key}`, 'must be a non-empty, well-formed string');
      }
      if (task.task_type !== 'remedial') add(`${path}.task_type`, 'must be remedial');
      if (task.priority !== index + 1) add(`${path}.priority`, 'must match its 1-based position in priorities');
      if (!Number.isSafeInteger(task.duration_minutes) || task.duration_minutes <= 0 || task.duration_minutes % 30 !== 0) add(`${path}.duration_minutes`, 'must be a positive whole number of 30-minute blocks');
      if (taskIds.has(task.task_id)) add(`${path}.task_id`, 'duplicate task_id');
      if (taskTopics.has(task.topic_id)) add(`${path}.topic_id`, 'duplicate task topic_id');
      taskIds.add(task.task_id);
      taskTopics.add(task.topic_id);
    }
  }
  const analysisIds = new Set();
  if (Array.isArray(plan.topic_analysis)) {
    for (let index = 0; index < plan.topic_analysis.length; index += 1) {
      const topic = plan.topic_analysis[index];
      const path = `topic_analysis[${index}]`;
      if (!isRecord(topic)) { add(path, 'must be a topic result object'); continue; }
      if (!isText(topic.topic_id)) add(`${path}.topic_id`, 'must be a non-empty, well-formed string');
      if (!isText(topic.topic_name)) add(`${path}.topic_name`, 'must be a non-empty, well-formed string');
      if (topic.observed_score !== null && !isScore(topic.observed_score)) add(`${path}.observed_score`, 'must be null or a finite score from 0 to 100');
      if (analysisIds.has(topic.topic_id)) add(`${path}.topic_id`, 'duplicate analysis topic_id');
      analysisIds.add(topic.topic_id);
    }
  }
  for (const topicId of taskTopics) if (!analysisIds.has(topicId)) add('topic_analysis', `missing analysis for task topic_id ${topicId}`);
  if (issues.length) throw new StudyPlanValidationError(issues);
}

function comparePlans(previousPlan, newPlan) {
  validateComparablePlan(newPlan, 'newPlan');
  if (previousPlan !== null) {
    validateComparablePlan(previousPlan, 'previousPlan');
    const issues = [];
    for (const key of ['student_id', 'course_id']) {
      if (previousPlan[key] !== newPlan[key]) issues.push({ path: `previousPlan.${key}`, message: `must match newPlan.${key}; plans for different students or courses cannot be compared` });
    }
    if (issues.length) throw new StudyPlanValidationError(issues);
  }
  const initial = previousPlan === null;
  const previousTasks = initial ? [] : previousPlan.priorities;
  const oldById = new Map(previousTasks.map((task) => [task.task_id, task]));
  const newById = new Map(newPlan.priorities.map((task) => [task.task_id, task]));
  const changes = {
    type: initial ? 'initial_plan' : 'unchanged_plan',
    first_priority_changed: !initial && (previousTasks[0]?.task_id ?? null) !== (newPlan.priorities[0]?.task_id ?? null),
    tasks_added: newPlan.priorities.filter((task) => !oldById.has(task.task_id)).map((task) => task.task_id),
    tasks_removed: previousTasks.filter((task) => !newById.has(task.task_id)).map((task) => task.task_id),
    task_order_changed: false,
    duration_changes: [],
    resource_changes: [],
    activity_changes: [],
    task_details_changes: [],
    score_changes: [],
  };
  const retainedOld = previousTasks.filter((task) => newById.has(task.task_id)).map((task) => task.task_id);
  const retainedNew = newPlan.priorities.filter((task) => oldById.has(task.task_id)).map((task) => task.task_id);
  changes.task_order_changed = retainedOld.some((id, index) => id !== retainedNew[index]);
  for (const task of newPlan.priorities) {
    const previous = oldById.get(task.task_id);
    if (!previous) continue;
    if (task.topic_id !== previous.topic_id) throw new StudyPlanValidationError([{ path: 'newPlan.priorities.task_id', message: `task_id ${task.task_id} cannot be reused for a different topic_id` }]);
    if (task.duration_minutes !== previous.duration_minutes) changes.duration_changes.push({ task_id: task.task_id, previous_minutes: previous.duration_minutes, new_minutes: task.duration_minutes });
    if (task.resource_id !== previous.resource_id || task.resource_ref !== previous.resource_ref) changes.resource_changes.push({ task_id: task.task_id, previous_resource_id: previous.resource_id, new_resource_id: task.resource_id, previous_resource_ref: previous.resource_ref, new_resource_ref: task.resource_ref });
    if (task.activity !== previous.activity) changes.activity_changes.push({ task_id: task.task_id, previous_activity: previous.activity, new_activity: task.activity });
    if (task.topic_name !== previous.topic_name || task.task_type !== previous.task_type) changes.task_details_changes.push({ task_id: task.task_id, previous_topic_name: previous.topic_name, new_topic_name: task.topic_name, previous_task_type: previous.task_type, new_task_type: task.task_type });
  }
  if (!initial) {
    const oldScores = new Map(previousPlan.topic_analysis.map((topic) => [topic.topic_id, topic]));
    const newScores = new Map(newPlan.topic_analysis.map((topic) => [topic.topic_id, topic]));
    const scoreIds = [...newScores.keys(), ...[...oldScores.keys()].filter((id) => !newScores.has(id))];
    const display = (value) => value === null ? 'missing' : `${value}%`;
    for (const id of scoreIds) {
      const oldScore = oldScores.get(id)?.observed_score ?? null;
      const newScore = newScores.get(id)?.observed_score ?? null;
      if (oldScore !== newScore) changes.score_changes.push({ topic_id: id, previous_score: oldScore, new_score: newScore, message: `${newScores.get(id)?.topic_name ?? oldScores.get(id).topic_name}: ${display(oldScore)} → ${display(newScore)}` });
    }
  }
  const plan_changed = initial || changes.first_priority_changed || changes.task_order_changed || ['tasks_added', 'tasks_removed', 'duration_changes', 'resource_changes', 'activity_changes', 'task_details_changes'].some((key) => changes[key].length > 0);
  if (!initial && plan_changed) changes.type = 'updated_plan';
  return { plan_changed, changes };
}

module.exports = { comparePlans };
