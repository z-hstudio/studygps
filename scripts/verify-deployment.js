'use strict';

const assert = require('node:assert/strict');
const { generateExamples } = require('../engine/scripts/demo');
const { generateStudyPlan } = require('../engine');

async function verifyDeployment(baseUrl) {
  const base = new URL(baseUrl);
  assert.ok(['https:', 'http:'].includes(base.protocol), 'Use an HTTP(S) deployment URL');
  const examples = generateExamples();
  let checks = 0;
  async function check(route, options = {}, status = 200) {
    const response = await fetch(new URL(route, base), { ...options, signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, status, `${options.method || 'GET'} ${route}`);
    checks += 1;
    return response;
  }
  const page = await check('/');
  assert.match(await page.text(), /StudyGPS/);
  for (const route of ['/home.js', '/home.css', '/assets/studygps-navigation-hero.png', '/portal.html', '/portal.js', '/portal.css', '/auth-client.js', '/demo.html', '/app.js', '/styles.css', '/presentation.js', '/learning-content.js', '/favicon.svg', '/downloads/n8n-code-node.js', '/downloads/HANDOFF.md', '/downloads/HANDOFF.en.md', '/downloads/DEMO-GUIDE.md', '/downloads/NOVELTY.md']) await check(route);
  const english = await check('/?lang=en');
  assert.match(await english.text(), /data-locale="en"/);
  const config = await (await check('/api/auth-config')).json();
  assert.deepEqual(Object.keys(config).sort(), ['configured', 'development', 'publishableKey']);
  assert.equal(config.configured, true);
  const anonymous = await check('/api/portal', {}, 401);
  assert.match(anonymous.headers.get('cache-control'), /no-store/);
  assert.equal((await anonymous.json()).error.code, 'AUTH_REQUIRED');
  const forged = await check('/api/portal', {headers:{Authorization:'Bearer forged.token.value'}}, 401);
  assert.equal((await forged.json()).error.code, 'AUTH_INVALID');
  await check('/api/portal', {method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{"action":"save-profile","role":"teacher"}'},403);
  const health = await check('/api/health');
  assert.equal((await health.json()).service, 'studygps');
  const post = (payload) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  for (const example of examples) {
    const response = await check('/api/study-plan', post(example.request));
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.deepEqual(await response.json(), example.output);
    console.log(`PASS ${example.name}: deployed response equals local engine`);
  }
  const request = structuredClone(examples[0].request);
  request.input.available_minutes = 0;
  const zero = await check('/api/study-plan', post(request));
  assert.deepEqual(await zero.json(), generateStudyPlan(request.input, request.course, request.previous_plan));
  await check('/api/study-plan', {}, 405);
  const malformed = await check('/api/study-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
  const mismatch = await check('/api/study-plan', post({ ...examples[0].request, previous_plan: examples[1].output }), 400);
  assert.equal((await mismatch.json()).error.code, 'VALIDATION_ERROR');
  await check('/api/study-plan', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }, 415);
  for (const topic of request.course.topics) {
    const resource = await check(`/${topic.resource_ref}`);
    assert.ok((await resource.text()).includes(topic.resource_id), topic.resource_ref);
  }
  console.log(`PASS ${checks} live HTTP checks at ${base.origin}`);
  return { origin: base.origin, checks, status: 'passed' };
}

if (require.main === module) verifyDeployment(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyDeployment };
