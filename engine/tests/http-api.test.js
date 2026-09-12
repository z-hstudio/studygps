'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const studyPlanHandler = require('../../api/study-plan');
const healthHandler = require('../../api/health');
const { runCodeNode } = require('../n8n-adapter');

const MAX_BODY_BYTES = 256 * 1024;
const demoNames = ['alex-assessment-1', 'sarah-assessment-1', 'alex-assessment-2'];
const demoRequests = demoNames.map((name) => require(`../examples/${name}.request.json`));
let server;
let port;

test.before(async () => {
  server = http.createServer((req, res) => {
    const handler = req.url === '/api/health' ? healthHandler : studyPlanHandler;
    Promise.resolve(handler(req, res)).catch((error) => {
      // A handler escaping its own error boundary must fail the HTTP assertions,
      // while still closing the connection so that a failing test cannot hang.
      res.statusCode = 599;
      res.end(JSON.stringify({ test_harness_error: error.message }));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function request({ method = 'POST', pathname = '/api/study-plan', headers = {}, body, chunks } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers, agent: false }, (res) => {
      const received = [];
      res.on('data', (chunk) => received.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(received).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('Local API test request timed out')));
    if (chunks) chunks.forEach((chunk) => req.write(chunk));
    req.end(body);
  });
}

function assertNoStore(response) {
  assert.match(response.headers['cache-control'] || '', /(?:^|[,\s])no-store(?:$|[,\s])/i);
}

function assertJson(response) {
  assert.match(response.headers['content-type'] || '', /^application\/json(?:;|$)/i);
  return JSON.parse(response.body);
}

function assertError(response, status, code) {
  assert.equal(response.status, status, response.body);
  assertNoStore(response);
  const payload = assertJson(response);
  assert.equal(payload.error.code, code);
  assert.equal(typeof payload.error.message, 'string');
  assert.ok(payload.error.message.trim().length > 0);
  assert.equal(Object.hasOwn(payload.error, 'stack'), false);
  assert.equal(Object.hasOwn(payload, 'stack'), false);
  assert.doesNotMatch(response.body, /\/Users\/|node_modules\/|\bat [^\n]+\([^\n]+:\d+:\d+\)/);
  return payload.error;
}

function paddedPayload(byteLength) {
  const payload = structuredClone(demoRequests[0]);
  payload.padding = '';
  const fixedLength = Buffer.byteLength(JSON.stringify(payload));
  assert.ok(byteLength >= fixedLength);
  payload.padding = 'x'.repeat(byteLength - fixedLength);
  const body = JSON.stringify(payload);
  assert.equal(Buffer.byteLength(body), byteLength);
  return body;
}

async function callWithParsedBody(body, headers = { 'content-type': 'application/json' }) {
  const req = { method: 'POST', headers, body };
  const responseHeaders = {};
  let ended = false;
  let responseBody = '';
  const res = {
    statusCode: 200,
    setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; return this; },
    getHeader(name) { return responseHeaders[name.toLowerCase()]; },
    end(value = '') { responseBody += Buffer.isBuffer(value) ? value.toString('utf8') : String(value); ended = true; return this; },
  };
  await studyPlanHandler(req, res);
  assert.equal(ended, true, 'Handler must finish the response');
  return { status: res.statusCode, headers: responseHeaders, body: responseBody };
}

test('HTTP study-plan responses exactly match the local engine for all three demo requests', async () => {
  for (const [index, payload] of demoRequests.entries()) {
    const response = await request({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(response.status, 200, `${demoNames[index]}: ${response.body}`);
    assertNoStore(response);
    const result = assertJson(response);
    assert.deepEqual(result, runCodeNode([{ json: payload }])[0].json);
    assert.equal(result.priorities[0].topic_id, ['rankine_cycle', 'first_law', 'second_law'][index]);
    assert.equal(Object.hasOwn(result, 'json'), false, 'Return the plan directly rather than an n8n item envelope');
  }
});

test('JSON with an explicit charset and streamed chunks is accepted', async () => {
  const body = JSON.stringify(demoRequests[0]);
  const response = await request({
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    chunks: [body.slice(0, 30), body.slice(30, 300), body.slice(300)],
  });
  assert.equal(response.status, 200, response.body);
  assertNoStore(response);
  assert.equal(assertJson(response).student_id, demoRequests[0].input.student_id);
});

test('unsupported study-plan methods return 405 with the supported-method header', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const response = await request({ method });
    assert.equal(response.status, 405, response.body);
    assertNoStore(response);
    assert.deepEqual(response.headers.allow.split(',').map((value) => value.trim()).sort(), ['OPTIONS', 'POST']);
    const error = assertJson(response).error;
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.message, 'string');
  }
});

test('OPTIONS succeeds without a JSON body or content-type requirement', async () => {
  const response = await request({ method: 'OPTIONS' });
  assert.equal(response.status, 204);
  assert.equal(response.body, '');
  assertNoStore(response);
});

test('POST requires application/json content type', async () => {
  for (const headers of [{}, { 'Content-Type': 'text/plain' }, { 'Content-Type': 'application/x-www-form-urlencoded' }]) {
    const response = await request({ headers, body: JSON.stringify(demoRequests[0]) });
    assert.equal(response.status, 415, response.body);
    assertNoStore(response);
    const error = assertJson(response).error;
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.message, 'string');
  }
});

test('empty and malformed JSON produce an INVALID_JSON response without a stack', async () => {
  for (const body of ['', '{', '{"input": }']) {
    const response = await request({ headers: { 'Content-Type': 'application/json' }, body });
    assertError(response, 400, 'INVALID_JSON');
  }
});

test('valid JSON with an invalid request shape is a validation error, not a parse error', async () => {
  for (const body of ['null', '[]', '{}', '123']) {
    const response = await request({ headers: { 'Content-Type': 'application/json' }, body });
    const error = assertError(response, 400, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(error.issues) && error.issues.length > 0);
  }
});

test('engine validation errors keep useful field issues and omit internal stack details', async () => {
  const payload = structuredClone(demoRequests[0]);
  payload.input.topic_scores.entropy = 101;
  const response = await request({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const error = assertError(response, 400, 'VALIDATION_ERROR');
  assert.ok(error.issues.some((issue) => issue.path.includes('entropy')));
  assert.ok(error.issues.every((issue) => typeof issue.path === 'string' && typeof issue.message === 'string'));
});

test('previous_plan must be explicitly provided even on the first request', async () => {
  const payload = structuredClone(demoRequests[0]);
  delete payload.previous_plan;
  const response = await request({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const error = assertError(response, 400, 'VALIDATION_ERROR');
  assert.ok(error.issues.some((issue) => issue.path.includes('previous_plan')));
});

test('previous plans from another student or course are rejected over HTTP', async () => {
  for (const field of ['student_id', 'course_id']) {
    const payload = structuredClone(demoRequests[2]);
    assert.ok(payload.previous_plan);
    payload.previous_plan[field] = 'different_identity';
    const response = await request({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const error = assertError(response, 400, 'VALIDATION_ERROR');
    assert.ok(error.issues.some((issue) => issue.path.includes(field)));
  }
});

test('the raw request limit accepts exactly 256 KiB and rejects one extra byte', async () => {
  const accepted = await request({ headers: { 'Content-Type': 'application/json' }, body: paddedPayload(MAX_BODY_BYTES) });
  assert.equal(accepted.status, 200, accepted.body);
  assert.equal(assertJson(accepted).student_id, demoRequests[0].input.student_id);
  const rejected = await request({ headers: { 'Content-Type': 'application/json' }, body: paddedPayload(MAX_BODY_BYTES + 1) });
  assertError(rejected, 413, 'PAYLOAD_TOO_LARGE');
});

test('the size limit is enforced while reading chunked requests without content-length', async () => {
  const body = paddedPayload(MAX_BODY_BYTES + 1);
  const response = await request({
    headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
    chunks: [body.slice(0, 60000), body.slice(60000, 180000), body.slice(180000)],
  });
  assertError(response, 413, 'PAYLOAD_TOO_LARGE');
});

test('a pre-parsed Vercel object produces the same response and is not mutated', async () => {
  const payload = structuredClone(demoRequests[0]);
  const before = structuredClone(payload);
  const response = await callWithParsedBody(payload);
  assert.equal(response.status, 200, response.body);
  assertNoStore(response);
  assert.deepEqual(assertJson(response), runCodeNode([{ json: payload }])[0].json);
  assert.deepEqual(payload, before);
});

test('pre-parsed strings and Buffers are parsed as JSON consistently', async () => {
  const serialized = JSON.stringify(demoRequests[0]);
  for (const body of [serialized, Buffer.from(serialized, 'utf8')]) {
    const response = await callWithParsedBody(body);
    assert.equal(response.status, 200, response.body);
    assertNoStore(response);
    assert.deepEqual(assertJson(response), runCodeNode([{ json: demoRequests[0] }])[0].json);
  }
  for (const body of ['{', Buffer.from('{', 'utf8')]) {
    assertError(await callWithParsedBody(body), 400, 'INVALID_JSON');
  }
});

test('pre-parsed objects, strings and Buffers obey the same byte limit', async () => {
  const oversized = paddedPayload(MAX_BODY_BYTES + 1);
  for (const body of [JSON.parse(oversized), oversized, Buffer.from(oversized, 'utf8')]) {
    assertError(await callWithParsedBody(body), 413, 'PAYLOAD_TOO_LARGE');
  }
  const multibyte = structuredClone(demoRequests[0]);
  multibyte.padding = '🙂'.repeat(70000);
  assert.ok(JSON.stringify(multibyte).length < MAX_BODY_BYTES);
  assert.ok(Buffer.byteLength(JSON.stringify(multibyte)) > MAX_BODY_BYTES);
  assertError(await callWithParsedBody(multibyte), 413, 'PAYLOAD_TOO_LARGE');
});

test('health GET exposes only the stable public service contract', async () => {
  const response = await request({ method: 'GET', pathname: '/api/health' });
  assert.equal(response.status, 200, response.body);
  assertNoStore(response);
  assert.deepEqual(assertJson(response), {
    status: 'ok', service: 'studygps', schema_version: '1.0', explanation_mode: 'template',
  });
});

test('health HEAD is successful with no response body', async () => {
  const response = await request({ method: 'HEAD', pathname: '/api/health' });
  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.equal(response.body, '');
});

test('health rejects unsupported methods without caching the response', async () => {
  const response = await request({ method: 'POST', pathname: '/api/health' });
  assert.equal(response.status, 405, response.body);
  assertNoStore(response);
  assert.deepEqual(response.headers.allow.split(',').map((value) => value.trim()).sort(), ['GET', 'HEAD']);
  const error = assertJson(response).error;
  assert.equal(typeof error.code, 'string');
  assert.equal(typeof error.message, 'string');
});
