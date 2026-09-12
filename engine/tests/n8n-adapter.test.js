'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { generateStudyPlan } = require('../index');
const { runCodeNode } = require('../n8n-adapter');
const { buildBundle } = require('../scripts/build-n8n');
const { generateExamples } = require('../scripts/demo');

const repoRoot = path.resolve(__dirname, '../..');
const examplesDir = path.join(repoRoot, 'engine/examples');
const artifact = fs.readFileSync(path.join(repoRoot, 'engine/dist/n8n-code-node.js'), 'utf8');
const cases = generateExamples();
const clone = (value) => JSON.parse(JSON.stringify(value));

function evaluate(items) {
  // No Node require, process, filesystem, API keys or network in this sandbox.
  const context = vm.createContext({ $input: { all: () => items } });
  vm.runInContext("Math.random = () => { throw new Error('Randomness forbidden'); }; Date = class { constructor() { throw new Error('Clock forbidden'); } static now() { throw new Error('Clock forbidden'); } }; fetch = () => { throw new Error('Network forbidden'); };", context);
  return vm.runInContext(`(function () {\n${artifact}\n})()`, context, { timeout: 2000 });
}

test('committed handoff bundle exactly matches deterministic core build', () => {
  assert.equal(artifact, buildBundle());
  assert.equal(buildBundle(), buildBundle());
});

for (const example of cases) {
  test(`${example.name}: source adapter and standalone sandbox match the core and generated files`, () => {
    const payload = clone(example.request);
    const before = clone(payload);
    assert.deepEqual(runCodeNode([{ json: payload }]), [{ json: example.output }]);
    assert.deepEqual(clone(evaluate([{ json: payload }])), [{ json: example.output }]);
    assert.deepEqual(payload, before);
    for (const kind of ['request', 'output']) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(examplesDir, `${example.name}.${kind}.json`), 'utf8')), example[kind]);
  });
}

test('bundle handles varied scores, targets, budgets, missing scores and comparison without external runtime services', () => {
  const course = cases[0].request.course;
  const original = cases[0].request.input;
  const scoreSets = [null, {}, { first_law: 77, second_law: 80, entropy: 66.5, rankine_cycle: 80 }, { first_law: 0, second_law: null, entropy: '', rankine_cycle: 100 }, { first_law: 90, second_law: 100, entropy: 80, rankine_cycle: 90 }];
  for (const scores of scoreSets) for (const budget of [0, 29, 30, 65.5, 180, 1000]) for (const target of [0, 60, 80, 100]) {
    const input = { ...original, student_id: 'different:学生/%', target_score: target, available_minutes: budget, topic_scores: scores };
    const initial = generateStudyPlan(input, course);
    const next = { ...input, assessment_id: 'subsequent' };
    const expected = generateStudyPlan(next, course, initial);
    const actual = clone(evaluate([{ json: { input: next, course, previous_plan: initial } }]));
    assert.deepEqual(actual, [{ json: expected }]);
    assert.equal(actual[0].json.plan_changed, false);
  }
});

test('adapter rejects wrong item counts, missing envelope fields and malformed previous plans', () => {
  const request = cases[0].request;
  for (const items of [[], [{ json: request }, { json: request }], [null], [{ json: null }], [{ json: {} }], [{ json: { input: request.input, course: request.course } }], [{ json: { ...request, previous_plan: false } }]]) {
    assert.throws(() => runCodeNode(items), (error) => error.code === 'VALIDATION_ERROR');
    assert.throws(() => evaluate(items), /validation failed/);
  }
});

test('sandbox rejects invalid scores/configuration and cross-student/course previous plans', () => {
  const request = clone(cases[0].request);
  const invalid = [
    { ...request, input: { ...request.input, topic_scores: { first_law: -1 } } },
    { ...request, input: { ...request.input, topic_scores: { total_score: 63.5 } } },
    { ...request, course: { ...request.course, topics: [{ ...request.course.topics[0], estimated_minutes: 0 }] } },
    { ...request, previous_plan: cases[1].output },
    { ...request, previous_plan: { ...cases[0].output, course_id: 'other' } },
  ];
  for (const payload of invalid) assert.throws(() => evaluate([{ json: payload }]), /validation failed/);
});

test('every demo resource exists and is explicitly labeled demo material', () => {
  for (const topic of cases[0].request.course.topics) {
    const resource = path.resolve(repoRoot, topic.resource_ref);
    assert.ok(resource.startsWith(`${examplesDir}${path.sep}`));
    const content = fs.readFileSync(resource, 'utf8');
    assert.match(content, /demo/i);
    assert.ok(content.includes(topic.resource_id));
  }
});
