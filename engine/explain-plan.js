'use strict';

const format = (value) => Number(value.toFixed(4)).toString();

// Pure presentation boundary: a future explanation provider must preserve the
// calculated fields. This implementation needs no model, key, clock or network.
function explainPlan(plan) {
  const topics = new Map(plan.topic_analysis.map((topic) => [topic.topic_id, topic]));
  const priorities = plan.priorities.map((task) => {
    const topic = topics.get(task.topic_id);
    let reason = `Review ${task.topic_name}: your observed assessment score is ${format(topic.observed_score)}%, ${format(topic.target_gap)} points below the ${format(plan.target_score)}% reference target. Configured importance ${format(topic.importance)} and estimate ${format(topic.estimated_minutes)} minutes give a priority score of ${format(topic.priority_score)}. Use ${task.resource_id} for ${task.duration_minutes} minutes.`;
    if (task.is_partial) reason += ` This is partial practice (${task.duration_minutes} of ${format(task.estimated_minutes)} configured minutes); work through as much of the activity as the allocated blocks allow.`;
    return { ...task, reason };
  });
  let summary;
  if (plan.status === 'no_scores') summary = 'No observed topic scores are available. Add topic-level assessment results before generating remedial tasks.';
  else if (plan.status === 'target_met') summary = `All available topic scores meet the ${format(plan.target_score)}% reference target. No remedial tasks were added.`;
  else if (plan.status === 'no_study_time') summary = 'The total time budget is 0 minutes. Score gaps were analysed, but no learning blocks can be scheduled.';
  else if (plan.status === 'insufficient_block_time') summary = 'No full 30-minute learning block fits the available budget and topic estimates. Score gaps remain, but no tasks were added.';
  else summary = `Start with ${priorities[0].topic_name}. The plan includes ${priorities.length} remedial task${priorities.length === 1 ? '' : 's'} totalling ${plan.total_planned_minutes} of ${format(plan.available_minutes)} available minutes, ordered by score gap, configured importance and estimated study time.`;
  if (plan.topic_analysis.some((topic) => topic.observed_score === null)) summary += ' Missing scores were not treated as zero; the overall assessment result is unavailable.';
  if (priorities.some((task) => task.is_partial)) summary += ' At least one task is partial practice.';
  summary += ' Configured weights and study times are planning assumptions. This plan does not predict or guarantee an exam score.';
  return { summary, priorities, explanation_mode: 'template' };
}

module.exports = { explainPlan };
