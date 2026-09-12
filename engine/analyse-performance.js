'use strict';

const { calculatePriorities } = require('../src/priority');
const { isMissingScore } = require('./validate-input');

// Called after validation. Reuse the existing gap/importance calculation,
// then divide by configured hours and rank separately in original course order.
function analysePerformance(input, course) {
  const configured = new Map(course.topics.map((topic) => [topic.topic_id, topic]));
  const scores = input.topic_scores ?? {};
  const availableTopics = course.topics.filter((topic) => Object.hasOwn(scores, topic.topic_id) && !isMissingScore(scores[topic.topic_id]));
  const ranked = calculatePriorities(availableTopics.map((topic) => ({
    topic_id: topic.topic_id,
    currentScore: scores[topic.topic_id],
    targetScore: input.target_score,
    importance: topic.importance,
  }))).map((topic) => ({
    ...topic,
    priority: topic.priority / (configured.get(topic.topic_id).estimated_minutes / 60),
  }));
  const byId = new Map(ranked.map((topic) => [topic.topic_id, topic]));
  const topic_analysis = course.topics.map((topic) => {
    const result = byId.get(topic.topic_id);
    return {
      topic_id: topic.topic_id,
      topic_name: topic.topic_name,
      observed_score: result ? result.currentScore : null,
      target_gap: result ? result.weakness : null,
      importance: topic.importance,
      estimated_minutes: topic.estimated_minutes,
      priority_score: result ? result.priority : null,
    };
  });
  const missing = topic_analysis.filter((topic) => topic.observed_score === null);
  const warnings = missing.map((topic) => ({
    code: 'MISSING_TOPIC_SCORE', topic_id: topic.topic_id,
    message: `No observed score for ${topic.topic_name}; no gap or remedial task was inferred.`,
  }));
  if (missing.length) warnings.push({ code: 'INCOMPLETE_OVERALL_SCORE', message: 'The weighted assessment result is unavailable because some topic scores are missing.' });
  const totalWeight = course.topics.reduce((sum, topic) => sum + topic.importance, 0);
  const overall_score = missing.length ? null : topic_analysis.reduce((sum, topic) => sum + topic.observed_score * topic.importance, 0) / totalWeight;
  return { topic_analysis, overall_score, warnings };
}

function rankTopics(topicAnalysis) {
  // Start in course order so ties do not inherit the legacy pre-normalized order.
  return topicAnalysis.map((topic, index) => ({ topic, index }))
    .filter(({ topic }) => topic.target_gap !== null && topic.target_gap > 0)
    .sort((a, b) => {
      const difference = b.topic.priority_score - a.topic.priority_score;
      // Treat only relative floating-point roundoff as a tie. A tiny positive
      // score remains above zero; stored calculation values are not rounded.
      const tolerance = 8 * Number.EPSILON * Math.max(Math.abs(a.topic.priority_score), Math.abs(b.topic.priority_score));
      return Math.abs(difference) <= tolerance ? a.index - b.index : difference;
    })
    .map(({ topic }) => topic);
}

module.exports = { analysePerformance, rankTopics };
