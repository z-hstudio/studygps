'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { generateStudyPlan } = require('../index');

const examples = path.resolve(__dirname, '../examples');
const course = JSON.parse(fs.readFileSync(path.join(examples, 'course.json'), 'utf8'));
const readInput = (name) => JSON.parse(fs.readFileSync(path.join(examples, `${name}.input.json`), 'utf8'));

function generateExamples() {
  const first = readInput('alex-assessment-1');
  const sarah = readInput('sarah-assessment-1');
  const second = readInput('alex-assessment-2');
  const initialAlex = generateStudyPlan(first, course);
  return [
    { name: 'alex-assessment-1', request: { input: first, course, previous_plan: null }, output: initialAlex },
    { name: 'sarah-assessment-1', request: { input: sarah, course, previous_plan: null }, output: generateStudyPlan(sarah, course) },
    { name: 'alex-assessment-2', request: { input: second, course, previous_plan: initialAlex }, output: generateStudyPlan(second, course, initialAlex) },
  ];
}

if (require.main === module) {
  for (const example of generateExamples()) {
    for (const kind of ['request', 'output']) fs.writeFileSync(path.join(examples, `${example.name}.${kind}.json`), `${JSON.stringify(example[kind], null, 2)}\n`);
    console.log(`${example.name}: weighted assessment ${example.output.overall_score}; ${example.output.priorities.map((task) => `${task.topic_name} ${task.duration_minutes}m${task.is_partial ? ' (partial)' : ''}`).join(' → ')}; ${example.output.changes.type}`);
  }
  console.log('Generated three output JSON files and three complete n8n request JSON files in engine/examples/.');
}

module.exports = { generateExamples };
