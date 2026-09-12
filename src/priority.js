/**
 * Rank validated topics using scores from 0 to 100 and importance from 0 to 1.
 * Return new objects without changing the input array or its topics.
 */
function calculatePriorities(topics) {
  return topics
    .map((topic) => {
      const weakness = Math.max(topic.targetScore - topic.currentScore, 0);
      const priority = weakness * topic.importance;

      return { ...topic, weakness, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

module.exports = { calculatePriorities };

// Run the sample when called directly: node src/priority.js
if (require.main === module) {
  const grades = require('../data/sample-grades.json');
  console.log(JSON.stringify(calculatePriorities(grades), null, 2));
}
