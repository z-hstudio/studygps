const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePriorities } = require('../src/priority');

test('calculates weakness and priority and preserves the topic fields', () => {
  const topic = {
    topic: 'Calculus', currentScore: 55, targetScore: 80, importance: 0.3,
  };

  assert.deepEqual(calculatePriorities([topic]), [
    { ...topic, weakness: 25, priority: 7.5 },
  ]);
});

test('ranks topics by priority without changing the input', () => {
  const topics = Object.freeze([
    Object.freeze({ topic: 'Programming', currentScore: 75, targetScore: 80, importance: 0.2 }),
    Object.freeze({ topic: 'Calculus', currentScore: 55, targetScore: 80, importance: 0.3 }),
    Object.freeze({ topic: 'Circuits', currentScore: 70, targetScore: 80, importance: 0.9 }),
  ]);

  const ranked = calculatePriorities(topics);

  assert.deepEqual(ranked.map((topic) => topic.topic), [
    'Circuits', 'Calculus', 'Programming',
  ]);
  assert.deepEqual(ranked.map((topic) => topic.priority), [9, 7.5, 1]);
});

test('keeps a topic above target with zero weakness and priority', () => {
  const topic = {
    topic: 'Engineering Mechanics', currentScore: 82, targetScore: 80, importance: 0.15,
  };

  assert.deepEqual(calculatePriorities([topic]), [
    { ...topic, weakness: 0, priority: 0 },
  ]);
});

test('returns an empty array for empty input', () => {
  assert.deepEqual(calculatePriorities([]), []);
});
