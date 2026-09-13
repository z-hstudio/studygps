'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const http = require('node:http');
const { once } = require('node:events');
const { createPortalHandler } = require('../api/portal');
const { portalError } = require('../server/errors');
const { memoryRepository, actors, assessment } = require('./portal-helpers');
const ORIGIN = 'https://studygps.example.test';

function fixture() {
  const repository = memoryRepository();
  const handler = createPortalHandler({ repository, env: { NODE_ENV: 'production', APP_ORIGIN: ORIGIN }, authenticate: async (req) => {
    const actor = Object.values(actors).find((value) => req.headers.authorization === `Bearer ${value.id}`);
    if (!actor) throw portalError(401, 'AUTH_REQUIRED', 'Sign in.');
    return actor;
  } });
  async function call({ method = 'GET', url = '/api/portal', actor = actors.studentA, headers = {}, body, chunks } = {}) {
    const req = chunks ? Readable.from(chunks) : { body };
    req.method = method; req.url = url;
    req.headers = { ...(actor ? { authorization: `Bearer ${actor.id}` } : {}), ...(method === 'POST' ? { origin: ORIGIN, 'content-type': 'application/json' } : {}), ...headers };
    const res = { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(value) { this.body = JSON.parse(value); } };
    await handler(req, res);
    return res;
  }
  return { repository, call };
}

test('anonymous and forged sessions cannot read or mutate any learning record', async () => {
  const { call, repository } = fixture();
  for (const method of ['GET', 'POST']) {
    const res = await call({ method, actor: null, body: assessment() });
    assert.equal(res.statusCode, 401);
    assert.match(res.headers['cache-control'], /no-store/);
  }
  const forged = await call({ headers: { authorization: 'Bearer forged-token' } });
  assert.equal(forged.statusCode, 401);
  assert.equal(repository.profiles.size, 0);
});

test('successful mutations return the stable ok shape and refreshed GET is owner-scoped', async () => {
  const { call } = fixture();
  const saved = await call({ method: 'POST', body: assessment() });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.body, { ok: true });
  const own = await call();
  assert.equal(own.body.learning.plan.student_id, actors.studentA.id);
  assert.equal((await call({ actor: actors.studentB })).body.learning, null);
  assert.equal(own.headers['cdn-cache-control'], 'no-store');
  assert.equal(own.headers['vercel-cdn-cache-control'], 'no-store');
  assert.equal(own.headers['access-control-allow-origin'], undefined);
});

test('cross-origin, absent-origin and cross-site mutations are rejected before database writes', async () => {
  const { call, repository } = fixture();
  for (const headers of [{ origin: 'https://evil.test' }, { origin: undefined }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }]) {
    const res = await call({ method: 'POST', body: assessment(), headers });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'ORIGIN_NOT_ALLOWED');
  }
  assert.equal(repository.profiles.size, 0);
});

test('content type, malformed JSON, body shape and unsupported methods fail safely', async () => {
  const { call } = fixture();
  assert.equal((await call({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).statusCode, 415);
  assert.equal((await call({ method: 'POST', body: '{broken' })).statusCode, 400);
  assert.equal((await call({ method: 'POST', body: null })).statusCode, 400);
  assert.equal((await call({ method: 'POST', body: [] })).statusCode, 400);
  const method = await call({ method: 'DELETE' });
  assert.equal(method.statusCode, 405);
  assert.equal(method.headers.allow, 'GET, POST');
});

test('64 KiB body limit covers declared, parsed, raw and streamed inputs including multibyte text', async () => {
  const { call } = fixture();
  const huge = { action: 'save-profile', name: 'A', goal: '中'.repeat(22000), timezone: 'UTC' };
  for (const input of [{ body: {}, headers: { 'content-length': '65537' } }, { body: huge }, { body: JSON.stringify(huge) }, { chunks: [Buffer.from(JSON.stringify(huge))] }]) {
    const result = await call({ method: 'POST', ...input });
    assert.equal(result.statusCode, 413);
    assert.equal(result.body.error.code, 'PAYLOAD_TOO_LARGE');
  }
});
test('a legal maximum-length bilingual deadline context fits the HTTP body limit', async () => {
  const { call } = fixture();
  const topicIds = ['first_law', 'second_law', 'entropy', 'rankine_cycle'];
  const context = {
    semesterGoal: '中'.repeat(500), careerGoal: '中'.repeat(300), interests: '中'.repeat(300),
    feedback: '中'.repeat(1000), preferredMethod: 'mixed', focusMinutes: 25,
    availability: { days: [1], startTime: '18:00', minutesPerDay: 60 },
    goalTopics: topicIds, careerTopics: topicIds, feedbackTopics: topicIds,
    topicProgress: Object.fromEntries(topicIds.map(id => [id, 'learning'])),
    deadlines: Array.from({ length: 12 }, (_, index) => ({ id: `deadline-${index}`, title: '中'.repeat(160), kind: 'exam', dueDate: '2026-10-10', dueTime: '09:00', topicIds, requirements: '中'.repeat(1000) })),
  };
  const body = { action: 'save-navigation-context', context };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 32768);
  assert.equal((await call({ method: 'POST', body })).statusCode, 200);
});

test('oversized chunked HTTP requests receive a JSON 413 without a destroyed socket', async (context) => {
  const handler = createPortalHandler({ repository: memoryRepository(), env: { NODE_ENV: 'production', APP_ORIGIN: ORIGIN }, authenticate: async () => actors.studentA });
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const result = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/portal', method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    req.on('error', reject);
    req.write('{"action":"save-profile","goal":"');
    req.write('x'.repeat(70000));
    req.end('"}');
  });
  assert.equal(result.status, 413);
  assert.equal(result.body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('request query cannot choose another owner or smuggle duplicate target IDs', async () => {
  const { call } = fixture();
  assert.equal((await call({ url: `/api/portal?studentId=${actors.studentB.id}` })).statusCode, 403);
  assert.equal((await call({ url: '/api/portal?studentId=a&studentId=b' })).statusCode, 400);
  assert.equal((await call({ url: '/api/portal?role=teacher' })).statusCode, 400);
  assert.equal((await call({ method: 'POST', url: `/api/portal?studentId=${actors.studentB.id}`, body: assessment() })).statusCode, 400);
});

test('read locale is validated and cannot change identity or mutation scope', async () => {
  const { call } = fixture();
  for (const lang of ['en', 'zh']) {
    const response = await call({ url: `/api/portal?lang=${lang}` });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.user.id, actors.studentA.id);
    assert.equal((await call({ url: `/api/portal?lang=${lang}&studentId=${actors.studentB.id}` })).statusCode, 403);
  }
  for (const query of ['lang=fr', 'lang=', 'lang=en&lang=zh']) {
    assert.equal((await call({ url: `/api/portal?${query}` })).statusCode, 400);
  }
  assert.equal((await call({ method: 'POST', url: '/api/portal?lang=en', body: assessment() })).statusCode, 400);
});

test('unexpected database errors never leak SQL, credentials or stack traces', async () => {
  const { call, repository } = fixture();
  repository.ensureProfile = async () => { throw Object.assign(new Error('postgres://user:secret@db.example SELECT private_record'), { status: 503, code: 'UPSTREAM_PRIVATE' }); };
  const result = await call();
  assert.equal(result.statusCode, 503);
  assert.deepEqual(Object.keys(result.body), ['error']);
  assert.equal(result.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(JSON.stringify(result.body).includes('secret'), false);
  assert.equal(JSON.stringify(result.body).includes('SELECT'), false);
  assert.match(result.headers['cache-control'], /no-store/);
});
