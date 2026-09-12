'use strict';

const { validateInput, StudyPlanValidationError } = require('./validate-input');
const { analysePerformance, rankTopics } = require('./analyse-performance');
const { allocateTasks } = require('./generate-plan');
const { comparePlans } = require('./compare-plans');
const { explainPlan } = require('./explain-plan');

function generateStudyPlan(input, course, previousPlan = null) {
  validateInput(input, course);
  const analysis = analysePerformance(input, course);
  const ranked = rankTopics(analysis.topic_analysis);
  const allocated = allocateTasks(input, course, ranked);
  const total = allocated.priorities.reduce((sum, task) => sum + task.duration_minutes, 0);
  let status = 'ready';
  if (analysis.topic_analysis.every((topic) => topic.observed_score === null)) status = 'no_scores';
  else if (ranked.length === 0) status = 'target_met';
  else if (input.available_minutes === 0) status = 'no_study_time';
  else if (allocated.priorities.length === 0) status = 'insufficient_block_time';
  const calculated = {
    schema_version: '1.0',
    student_id: input.student_id,
    course_id: input.course_id,
    assessment_id: input.assessment_id,
    exam_date: input.exam_date ?? null,
    status,
    overall_score: analysis.overall_score,
    overall_score_basis: 'configured_importance_weighted_assessment',
    target_score: input.target_score,
    available_minutes: input.available_minutes,
    total_planned_minutes: total,
    unused_minutes: input.available_minutes - total,
    topic_analysis: analysis.topic_analysis,
    priorities: allocated.priorities,
    warnings: [...analysis.warnings, ...allocated.warnings],
  };
  const plan = { ...calculated, ...explainPlan(calculated) };
  return { ...plan, ...comparePlans(previousPlan, plan) };
}

module.exports = { generateStudyPlan, comparePlans, explainPlan, StudyPlanValidationError };
